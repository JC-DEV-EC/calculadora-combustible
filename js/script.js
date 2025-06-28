$(document).ready(function() {

    // Configuración de datos
    const fuelData = {
        benzin: {
            price: 500200, // precio por tonelada
            brands: ['shell', 'tatneft', 'rosneft'],
            tariffLimits: { econom: 100, premium: 300 }
        },
        gaz: {
            price: 200100,
            brands: ['shell', 'gazprom', 'bashneft'],
            tariffLimits: { econom: 200, premium: 700 }
        },
        dt: {
            price: 320700,
            brands: ['tatneft', 'rosneft'],
            tariffLimits: { econom: 150, premium: 350 }
        }
    };

    const regionLimits = {
        1: 1200, // Москва
        2: 800,  // Санкт-Петербург
        3: 500   // Краснодар
    };

    const tariffDiscounts = {
        econom: 0.03,    // 3%
        premium: 0.05,   // 5%
        selected: 0.07   // 7%
    };

    const promoOptions = {
        econom: [0.02, 0.05],     // 2%, 5%
        selected: [0.05, 0.20],   // 5%, 20%
        premium: [0.20, 0.50]     // 20%, 50%
    };

    // Estado actual del calculador
    let currentState = {
        region: '',
        pumping: 200,
        fuelType: 'benzin',
        brand: '',
        services: [],
        tariff: 'selected',
        promo: 0.05
    };

    // Inicialización
    init();

    function init() {
        updateBrands();
        updateSlider();
        calculateAll();
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
                calculateAllAjax(); // Usar AJAX
            }
        });

        // Cerrar dropdown al hacer click fuera
        $(document).on('click', function() {
            $('#regionDropdown').removeClass('show');
            $('#regionDisplay').removeClass('active');
        });

        // Cambio de región (mantenemos por compatibilidad)
        $('#regionSelect').on('change', function() {
            currentState.region = $(this).val();
            if (currentState.region) {
                const maxPumping = regionLimits[currentState.region];
                updateSliderMax(maxPumping);
                calculateAllAjax();
            }
        });

        // Slider de прокачка
        $('#pumpingRange').on('input', function() {
            currentState.pumping = parseInt($(this).val());
            updatePumpingDisplay();
            calculateAllAjax(); // Usar AJAX
        });

        // Tabs de combustible
        $('.fuel-tab').on('click', function() {
            $('.fuel-tab').removeClass('active');
            $(this).addClass('active');
            currentState.fuelType = $(this).data('fuel');
            updateBrands();
            calculateAllAjax(); // Usar AJAX
        });

        // Selección de marcas
        $('.brand-item').on('click', function() {
            const fuelBrands = fuelData[currentState.fuelType].brands;
            const brandId = $(this).data('brand');

            if (fuelBrands.includes(brandId)) {
                $('.brand-item').removeClass('active');
                $(this).addClass('active');
                currentState.brand = brandId;
                calculateAllAjax(); // Usar AJAX
            }
        });

        // Servicios adicionales (máximo 4)
        $('.service-item').on('click', function() {
            const isActive = $(this).hasClass('active');
            const activeCount = $('.service-item.active').length;

            if (isActive) {
                // Si está activo, desactivar
                $(this).removeClass('active');
                updateServices();
                calculateAllAjax(); // Usar AJAX
            } else if (activeCount < 4) {
                // Si no está activo y hay menos de 4, activar
                $(this).addClass('active');
                updateServices();
                calculateAllAjax(); // Usar AJAX
            } else {
                // Si ya hay 4 servicios, mostrar mensaje
                alert('Можно выбрать не более 4 услуг');
            }
        });

        // Promociones
        $(document).on('click', '.promo-item', function() {
            $('.promo-item .promo-circle').removeClass('yellow').addClass('gray');
            $(this).find('.promo-circle').removeClass('gray').addClass('yellow');

            const promoValue = parseFloat($(this).data('promo'));
            currentState.promo = promoValue;
            calculateAllAjax(); // Usar AJAX
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

    function updateSliderMax(maxValue) {
        $('#pumpingRange').attr('max', maxValue);
        if (currentState.pumping > maxValue) {
            currentState.pumping = maxValue;
            $('#pumpingRange').val(maxValue);
            updatePumpingDisplay();
        }
    }

    function updatePumpingDisplay() {
        $('.pumping-label').text(currentState.pumping + ' тонн');

        // Actualizar el progreso visual del slider
        const slider = $('#pumpingRange');
        const max = parseInt(slider.attr('max'));
        const percentage = (currentState.pumping / max) * 100;

        slider.css('background',
            `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
        );
    }

    function updateBrands() {
        const availableBrands = fuelData[currentState.fuelType].brands;

        $('.brand-item').each(function() {
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
            $(`.brand-item[data-brand="${currentState.brand}"]`).addClass('active');
        }
    }

    function updateServices() {
        currentState.services = [];
        $('.service-item.active').each(function() {
            currentState.services.push($(this).find('.service-name').text());
        });
    }

    function calculateTariff() {
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

    function calculateAll() {
        if (!currentState.region || !currentState.brand) return;

        // Calcular tarifa
        currentState.tariff = calculateTariff();

        // Actualizar nombre de tarifa
        const tariffNames = {
            econom: 'Эконом',
            selected: 'Избранный',
            premium: 'Премиум'
        };

        $('.tariff-name').text(tariffNames[currentState.tariff]);
        $('#orderTariffName, .modal-title').text(`Заказать тариф «${tariffNames[currentState.tariff]}»`);

        // Actualizar opciones de promoción
        updatePromoOptions();

        // Calcular costos
        calculateCosts();
    }

    function updatePromoOptions() {
        const availablePromos = promoOptions[currentState.tariff];
        let promoHtml = '';

        availablePromos.forEach((promo, index) => {
            const isActive = index === 1; // Por defecto seleccionar la promoción más alta
            const circleClass = isActive ? 'yellow' : 'gray';

            promoHtml += `
                <div class="promo-item" data-promo="${promo}">
                    <div class="promo-circle ${circleClass}">
                        <span class="promo-percent">${Math.round(promo * 100)}%</span>
                    </div>
                    <span class="promo-text">Скидка на топливо</span>
                </div>
            `;
        });

        $('#promoOptions').html(promoHtml);

        // Seleccionar automáticamente la promoción más alta
        currentState.promo = availablePromos[availablePromos.length - 1];
    }

    function calculateCosts() {
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
        $('.saving-row').eq(0).find('.saving-amount').text('от ' + formatNumber(yearlySavings));
        $('.saving-row').eq(1).find('.saving-amount').text('от ' + formatNumber(monthlySavings));

        // Guardar valores para envío
        currentState.calculations = {
            monthlyCost: monthlyCost,
            monthlySavings: monthlySavings,
            yearlySavings: yearlySavings,
            totalDiscountPercent: Math.round((tariffDiscount + promoDiscount) * 100)
        };
    }

    function updateSlider() {
        updatePumpingDisplay();
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
        const form = $('#orderForm')[0];

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
            showMessage('error', 'Ошибка: ' + errors.join(', '));
            return;
        }

        // Показать loading
        $('#submitOrder').prop('disabled', true).text('Отправка...');

        // Preparar datos para envío (incluyendo cálculos)
        const orderData = {
            // Datos kalkulátора
            region: $('#regionSelect option:selected').text(),
            pumping: currentState.pumping,
            fuelType: getFuelTypeName(currentState.fuelType),
            brand: getBrandName(currentState.brand),
            services: currentState.services.join(', ') || 'Нет',
            tariff: getTariffName(currentState.tariff),
            promo: Math.round(currentState.promo * 100) + '%',
            monthlyCost: Math.round(currentState.calculations.monthlyCost),
            totalDiscountPercent: currentState.calculations.totalDiscountPercent + '%',
            monthlySavings: Math.round(currentState.calculations.monthlySavings),
            yearlySavings: Math.round(currentState.calculations.yearlySavings),

            // Данные клиента
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
                    showMessage('success', 'Спасибо! Успешно отправлено.');
                    $('#orderForm')[0].reset();
                } else {
                    showMessage('error', 'Ошибка: ' + response.message);
                }
            },
            error: function() {
                showMessage('error', 'Ошибка: Не удалось отправить данные');
            },
            complete: function() {
                $('#submitOrder').prop('disabled', false).text('Заказать тариф «Избранный»');
            }
        });
    }

    function showMessage(type, text) {
        const messageClass = type === 'success' ? 'success-message' : 'error-message';
        $('#formMessage').removeClass('success-message error-message')
            .addClass(messageClass)
            .text(text)
            .show();

        if (type === 'success') {
            setTimeout(() => {
                $('#formMessage').fadeOut();
            }, 3000);
        }
    }

    // Función AJAX para cálculos en backend
    function calculateAllAjax() {
        if (!currentState.region || !currentState.brand) {
            calculateAll(); // Fallback a cálculo local
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
                    // Actualizar UI con datos del backend
                    currentState.tariff = response.data.tariff;
                    currentState.calculations = {
                        monthlyCost: response.data.monthlyCost,
                        monthlySavings: response.data.monthlySavings,
                        yearlySavings: response.data.yearlySavings,
                        totalDiscountPercent: response.data.totalDiscount
                    };

                    // Actualizar interfaz
                    $('.tariff-name').text(response.data.tariffName);
                    $('#orderTariffName, .modal-title').text(`Заказать тариф «${response.data.tariffName}»`);

                    updatePromoOptions();

                    $('.saving-row').eq(0).find('.saving-amount').text(response.data.formatted.yearlySavings);
                    $('.saving-row').eq(1).find('.saving-amount').text(response.data.formatted.monthlySavings);
                } else {
                    console.error('Error en cálculo:', response.error);
                    calculateAll(); // Fallback
                }
            },
            error: function() {
                console.error('Error AJAX');
                calculateAll(); // Fallback a cálculo local
            }
        });
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

});