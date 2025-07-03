$(document).ready(function() {

    // Configuración EXACTA según requerimientos del proyecto
    const fuelData = {
        benzin: {
            price: 500200, // precio por tonelada en rublos
            brands: ['rosneft', 'tatneft', 'lukoil'], // SIN Shell para benzin
            tariffLimits: { econom: 100, premium: 300 } // hasta 100=Эконом, 100-300=Избранный, 300+=Премиум
        },
        gaz: {
            price: 200100, // precio por tonelada en rublos
            brands: ['shell', 'gazprom', 'bashneft'], // CON Shell para gaz
            tariffLimits: { econom: 200, premium: 700 } // hasta 200=Эконом, 200-700=Избранный, 700+=Премиум
        },
        dt: {
            price: 320700, // precio por tonelada en rublos
            brands: ['tatneft', 'lukoil'], // SOLO estos 2 para dt
            tariffLimits: { econom: 150, premium: 350 } // hasta 150=Эконом, 150-350=Избранный, 350+=Премиум
        }
    };

    const regionLimits = {
        1: 1200, // Москва: макс. 1200 тонн
        2: 800,  // Санкт-Петербург: макс. 800 тонн
        3: 500   // Краснодар: макс. 500 тонн
    };

    const tariffDiscounts = {
        econom: 0.03,    // Эконом: 3%
        selected: 0.05,  // Избранный: 5%
        premium: 0.07    // Премиум: 7%
    };

    const promoOptions = {
        econom: [0.02, 0.05],     // Эконом: 2%, 5%
        selected: [0.05, 0.20],   // Избранный: 5%, 20%
        premium: [0.20, 0.50]     // Премиум: 20%, 50%
    };

    // Estado actual del calculador
    let currentState = {
        region: '1',
        pumping: 200,
        fuelType: 'benzin',
        brand: 'rosneft', // Primera marca disponible para benzin
        services: ['pasluga', 'support'], // Solo 2 servicios pre-seleccionados
        tariff: 'selected',
        promo: 0.20, // Por defecto la promoción más alta
        calculations: {
            monthlyCost: 0,
            monthlySavings: 0,
            yearlySavings: 0,
            totalDiscountPercent: 0
        }
    };

    // Inicialización
    init();

    function init() {
        // Limpiar estado inicial forzadamente
        $('.service-option').removeClass('active');
        // Solo activar los servicios del estado inicial
        currentState.services.forEach(service => {
            $(`.service-option[data-service="${service}"]`).addClass('active');
        });

        updateBrands();
        updateSliderDisplay();
        // Initialize marks for default region (Ленинградская область = 1200)
        updatePumpingMarks(1200);
        calculateAllAjax(); // Usar AJAX desde el inicio
        bindEvents();
    }

    function bindEvents() {
        // Custom select para regiones
        $('#regionDisplay').on('click', function(e) {
            e.stopPropagation();
            $(this).toggleClass('active');
            $('#regionDropdown').toggleClass('show');
        });

        $('.custom-select-option').on('click', function() {
            const value = $(this).data('value');
            const text = $(this).text();
            const maxPumping = $(this).data('max');

            $('#regionDisplay .selected-text').text(text);
            $('#regionSelect').val(value);
            $('#regionDropdown').removeClass('show');
            $('#regionDisplay').removeClass('active');

            $('.custom-select-option').removeClass('selected');
            $(this).addClass('selected');

            currentState.region = value;
            if (value) {
                updateSliderMax(maxPumping);
                calculateAllAjax(); // AJAX en cada cambio
            }
        });

        // Cerrar dropdown al hacer click fuera
        $(document).on('click', function() {
            $('#regionDropdown').removeClass('show');
            $('#regionDisplay').removeClass('active');
        });

        // Slider de прокачка
        $('#pumpingRange').on('input', function() {
            currentState.pumping = parseInt($(this).val());
            updateSliderDisplay();
            calculateAllAjax(); // AJAX en cada cambio
        });

        // Tabs de combustible
        $('.fuel-btn').on('click', function() {
            $('.fuel-btn').removeClass('active');
            $(this).addClass('active');
            currentState.fuelType = $(this).data('fuel');
            updateBrands();
            calculateAllAjax(); // AJAX en cada cambio
        });

        // Selección de marcas
        $('.brand-option').on('click', function() {
            const fuelBrands = fuelData[currentState.fuelType].brands;
            const brandId = $(this).data('brand');

            if (fuelBrands.includes(brandId)) {
                $('.brand-option').removeClass('active');
                $(this).addClass('active');
                currentState.brand = brandId;
                calculateAllAjax(); // AJAX en cada cambio
            }
        });

        // Servicios adicionales (máximo 4)
        $('.service-option').on('click', function() {
            const isActive = $(this).hasClass('active');
            const activeCount = $('.service-option.active').length;

            if (isActive) {
                // Si está activo, desactivar (SIEMPRE permitir desactivar)
                $(this).removeClass('active');
                updateServices();
                calculateAllAjax();
            } else if (activeCount < 4) {
                // Si no está activo y hay menos de 4, activar
                $(this).addClass('active');
                updateServices();
                calculateAllAjax();
            } else {
                // Si ya hay 4 servicios, mostrar mensaje
                alert('Можно выбрать не более 4 услуг');
            }
        });

        // Promociones - CON PALOMITA QUE SE MUEVE CORRECTAMENTE
        $('.promo-option').on('click', function() {
            // Remover active de todas las promociones
            $('.promo-option').removeClass('active');

            // Activar la seleccionada
            $(this).addClass('active');

            const promoValue = parseFloat($(this).data('promo'));
            currentState.promo = promoValue;

            console.log('Promoción seleccionada:', promoValue); // Debug
            console.log('Elemento activo:', $(this)); // Debug

            calculateAllAjax(); // AJAX en cada cambio
        });

        // Envío del formulario modal
        $('#submitOrder').on('click', function() {
            submitOrder();
        });

        // Validación en tiempo real
        $('#clientInn').on('input', function() {
            validateInn($(this));
        });

        $('#clientPhone').on('input', function() {
            validatePhone($(this));
        });

        $('#clientEmail').on('input', function() {
            validateEmail($(this));
        });
    }

    // FIXED: Dynamic pumping marks update
    function updatePumpingMarks(maxValue) {
        const marks = $('.pumping-marks');
        const middleValue = Math.round(maxValue / 2);

        marks.html(`
            <span class="pumping-mark">0 тонн</span>
            <span class="pumping-mark">${middleValue} тонн</span>
            <span class="pumping-mark">${maxValue} тонн</span>
        `);
    }

    function updateSliderMax(maxValue) {
        $('#pumpingRange').attr('max', maxValue);
        if (currentState.pumping > maxValue) {
            currentState.pumping = maxValue;
            $('#pumpingRange').val(maxValue);
            updateSliderDisplay();
        }

        // UPDATE THE MARKS WHEN MAX CHANGES
        updatePumpingMarks(maxValue);
    }

    function updateSliderDisplay() {
        $('#pumpingDisplay').text(currentState.pumping + ' тонн');

        // Actualizar el progreso visual del slider con el color correcto
        const slider = $('#pumpingRange');
        const max = parseInt(slider.attr('max'));
        const percentage = (currentState.pumping / max) * 100;

        slider.css('background',
            `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
        );
    }

    function updateBrands() {
        const availableBrands = fuelData[currentState.fuelType].brands;

        $('.brand-option').each(function() {
            const brandId = $(this).data('brand');
            if (availableBrands.includes(brandId)) {
                $(this).removeClass('disabled').css('opacity', '1');
            } else {
                $(this).addClass('disabled').css('opacity', '0.3');
                $(this).removeClass('active');
            }
        });

        // Auto-seleccionar la primera marca disponible si no hay ninguna seleccionada
        if (!currentState.brand || !availableBrands.includes(currentState.brand)) {
            currentState.brand = availableBrands[0];
            $('.brand-option').removeClass('active');
            $(`.brand-option[data-brand="${currentState.brand}"]`).addClass('active');
        }
    }

    function updateServices() {
        currentState.services = [];
        $('.service-option.active').each(function() {
            currentState.services.push($(this).data('service'));
        });
    }

    // FUNCIÓN AJAX PRINCIPAL para cálculos en tiempo real
    function calculateAllAjax() {
        if (!currentState.region || !currentState.brand) {
            calculateAllLocal(); // Fallback local
            return;
        }

        const calculationData = {
            region: currentState.region,
            pumping: currentState.pumping,
            fuelType: currentState.fuelType,
            brand: currentState.brand,
            promo: currentState.promo
        };

        $.ajax({
            url: 'php/calculate.php',
            method: 'POST',
            data: calculationData,
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    // Actualizar estado con datos del backend
                    currentState.tariff = response.data.tariff;
                    currentState.calculations = {
                        monthlyCost: response.data.monthlyCost,
                        monthlySavings: response.data.monthlySavings,
                        yearlySavings: response.data.yearlySavings,
                        totalDiscountPercent: response.data.totalDiscount
                    };

                    // Actualizar interfaz
                    updateUIWithCalculations(response.data);
                } else {
                    console.error('Error en cálculo AJAX:', response.error);
                    calculateAllLocal(); // Fallback
                }
            },
            error: function(xhr, status, error) {
                console.error('Error AJAX:', error);
                calculateAllLocal(); // Fallback a cálculo local
            }
        });
    }

    function updateUIWithCalculations(data) {
        // Actualizar nombre de tarifa
        const tariffNames = {
            econom: 'Эконом',
            selected: 'Избранный',
            premium: 'Премиум'
        };

        $('#currentTariffBadge').html(`<i class="fas fa-star"></i> ${tariffNames[data.tariff]}`);
        $('#orderTariffName').text(tariffNames[data.tariff]);
        $('.modal-title').text(`Заказать тариф «${tariffNames[data.tariff]}»`);

        // Actualizar opciones de promoción disponibles
        updatePromoOptions();

        // Actualizar valores de economía
        $('#yearlySavings').text(data.formatted.yearlySavings);
        $('#monthlySavings').text(data.formatted.monthlySavings);
    }

    // Fallback: cálculo local (mismo algoritmo que en PHP)
    function calculateAllLocal() {
        if (!currentState.region || !currentState.brand) return;

        // Calcular tarifa según las reglas exactas
        currentState.tariff = calculateTariffLocal();

        // Actualizar interfaz
        const tariffNames = {
            econom: 'Эконом',
            selected: 'Избранный',
            premium: 'Премиум'
        };

        $('#currentTariffBadge').html(`<i class="fas fa-star"></i> ${tariffNames[currentState.tariff]}`);
        $('#orderTariffName').text(tariffNames[currentState.tariff]);
        $('.modal-title').text(`Заказать тариф «${tariffNames[currentState.tariff]}»`);

        // Actualizar opciones de promoción
        updatePromoOptions();

        // Calcular costos localmente
        calculateCostsLocal();
    }

    function calculateTariffLocal() {
        const fuel = fuelData[currentState.fuelType];
        const pumping = currentState.pumping;

        if (pumping <= fuel.tariffLimits.econom) {
            return 'econom';
        } else if (pumping <= fuel.tariffLimits.premium) {
            return 'selected';
        } else {
            return 'premium';
        }
    }

    function updatePromoOptions() {
        const availablePromos = promoOptions[currentState.tariff];

        // Mostrar/ocultar promociones según tarifa
        $('.promo-option').each(function(index) {
            if (index < availablePromos.length) {
                const promoValue = availablePromos[index];
                $(this).attr('data-promo', promoValue);
                $(this).find('.promo-percent').text(Math.round(promoValue * 100) + '%');
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        // Auto-seleccionar la promoción más alta (por defecto)
        if (!availablePromos.includes(currentState.promo)) {
            currentState.promo = Math.max(...availablePromos);
        }

        // ACTUALIZAR LA PALOMITA EN LA PROMOCIÓN CORRECTA
        $('.promo-option').removeClass('active');
        $(`.promo-option[data-promo="${currentState.promo}"]`).addClass('active');
    }

    function calculateCostsLocal() {
        const fuel = fuelData[currentState.fuelType];
        const baseCost = fuel.price * currentState.pumping;

        const tariffDiscount = tariffDiscounts[currentState.tariff];
        const promoDiscount = currentState.promo;

        // Calcular descuentos en rublos
        const tariffSavingsRub = baseCost * tariffDiscount;
        const promoSavingsRub = baseCost * promoDiscount;
        const totalSavingsRub = tariffSavingsRub + promoSavingsRub;

        const monthlyCost = baseCost - totalSavingsRub;
        const monthlySavings = totalSavingsRub;
        const yearlySavings = monthlySavings * 12;

        // Formatear números
        const formatNumber = (num) => {
            if (num >= 1000000) {
                return Math.round(num / 1000000) + ' млн Р';
            } else if (num >= 1000) {
                return Math.round(num / 1000) + ' тыс Р';
            } else {
                return Math.round(num) + ' Р';
            }
        };

        // Actualizar UI
        $('#yearlySavings').text('от ' + formatNumber(yearlySavings));
        $('#monthlySavings').text('от ' + formatNumber(monthlySavings));

        // Guardar valores para envío
        currentState.calculations = {
            monthlyCost: monthlyCost,
            monthlySavings: monthlySavings,
            yearlySavings: yearlySavings,
            totalDiscountPercent: Math.round((tariffDiscount + promoDiscount) * 100)
        };
    }

    // Validaciones
    function validateInn(input) {
        const value = input.val().replace(/\D/g, '');
        input.val(value);

        if (value.length !== 12 && value.length > 0) {
            input.addClass('is-invalid');
            return false;
        } else {
            input.removeClass('is-invalid');
            return value.length === 12;
        }
    }

    function validatePhone(input) {
        const value = input.val().replace(/\D/g, '');
        input.val(value);

        if (value.length !== 11 && value.length > 0) {
            input.addClass('is-invalid');
            return false;
        } else {
            input.removeClass('is-invalid');
            return value.length === 11;
        }
    }

    function validateEmail(input) {
        const value = input.val();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(value) && value.length > 0) {
            input.addClass('is-invalid');
            return false;
        } else {
            input.removeClass('is-invalid');
            return emailRegex.test(value);
        }
    }

    function submitOrder() {
        // Validar todos los campos
        const inn = $('#clientInn').val();
        const phone = $('#clientPhone').val();
        const email = $('#clientEmail').val();
        const terms = $('#agreeTerms').is(':checked');

        let isValid = true;
        let errors = [];

        if (!validateInn($('#clientInn')) || inn.length !== 12) {
            errors.push('ИНН должен содержать 12 цифр');
            isValid = false;
        }

        if (!validatePhone($('#clientPhone')) || phone.length !== 11) {
            errors.push('Телефон должен содержать 11 цифр');
            isValid = false;
        }

        if (!validateEmail($('#clientEmail'))) {
            errors.push('Некорректный email');
            isValid = false;
        }

        if (!terms) {
            errors.push('Необходимо согласие на обработку данных');
            isValid = false;
        }

        if (!isValid) {
            showMessage('error', '<i class="fas fa-exclamation-triangle"></i> ' + errors.join('<br>• '));
            return;
        }

        // Показrar loading
        $('#submitOrder').prop('disabled', true).text('Отправка...');

        // Preparar datos COMPLETOS para envío
        const orderData = {
            // Результаты расчета (como especifica el requerimiento)
            region: $('#regionDisplay .selected-text').text(),
            pumping: currentState.pumping,
            fuelType: getFuelTypeName(currentState.fuelType),
            brand: getBrandName(currentState.brand),
            services: getServicesNames().join(', ') || 'Нет',
            tariff: getTariffName(currentState.tariff),
            promo: Math.round(currentState.promo * 100) + '%',
            monthlyCost: Math.round(currentState.calculations.monthlyCost),
            totalDiscountPercent: currentState.calculations.totalDiscountPercent + '%',
            monthlySavings: Math.round(currentState.calculations.monthlySavings),
            yearlySavings: Math.round(currentState.calculations.yearlySavings),

            // Данные заполнения формы
            inn: inn,
            phone: phone,
            email: email
        };

        // Enviar via AJAX
        $.ajax({
            url: 'php/send_email.php',
            method: 'POST',
            data: orderData,
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    showMessage('success', '<i class="fas fa-check-circle"></i> Спасибо! Заявка успешно отправлена.');
                    $('#orderForm')[0].reset();
                } else {
                    showMessage('error', '<i class="fas fa-exclamation-triangle"></i> ' + response.message);
                }
            },
            error: function() {
                showMessage('error', '<i class="fas fa-times-circle"></i> Ошибка соединения. Попробуйте снова.');
            },
            complete: function() {
                $('#submitOrder').prop('disabled', false).text('Заказать тариф «' + getTariffName(currentState.tariff) + '»');
            }
        });
    }

    function showMessage(type, text) {
        const messageClass = type === 'success' ? 'success-message' : 'error-message';
        const messageElement = $('#formMessage');

        // Limpiar clases anteriores y agregar la nueva
        messageElement.removeClass('success-message error-message')
            .addClass(messageClass)
            .html(text) // Usar html en lugar de text para permitir iconos
            .fadeIn(300); // Animación suave de entrada

        // Para mensajes de éxito, ocultarlos automáticamente
        if (type === 'success') {
            setTimeout(() => {
                messageElement.fadeOut(400);
                // También cerrar el modal después del éxito
                setTimeout(() => {
                    $('#orderModal').modal('hide');
                }, 500);
            }, 2500);
        }
    }

    // Funciones auxiliares para nombres
    function getFuelTypeName(fuelType) {
        const names = { benzin: 'Бензин', gaz: 'Газ', dt: 'ДТ' };
        return names[fuelType] || fuelType;
    }

    function getBrandName(brand) {
        const names = {
            shell: 'Shell', tatneft: 'Татнефть', rosneft: 'Роснефть',
            lukoil: 'Лукойл', gazprom: 'Газпром', bashneft: 'Башнефть'
        };
        return names[brand] || brand;
    }

    function getTariffName(tariff) {
        const names = { econom: 'Эконом', selected: 'Избранный', premium: 'Премиум' };
        return names[tariff] || tariff;
    }

    function getServicesNames() {
        const serviceNames = {
            shtraf: 'Штрафы', pasluga: 'Паслуги', sms: 'СМС',
            monitoring: 'Мониторинг', support: 'Поддержка', express: 'Экспресс',
            reports: 'Отчеты', sms2: 'СМС', notifications: 'Оповещения'
        };

        return currentState.services.map(service => serviceNames[service] || service);
    }

});