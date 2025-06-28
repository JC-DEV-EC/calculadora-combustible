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
        // Cambio de región
        $('#regionSelect').on('change', function() {
            currentState.region = $(this).val();
            if (currentState.region) {
                const maxPumping = regionLimits[currentState.region];
                updateSliderMax(maxPumping);
                calculateAll();
            }
        });

        // Slider de прокачка
        $('#pumpingRange').on('input', function() {
            currentState.pumping = parseInt($(this).val());
            updatePumpingDisplay();
            calculateAll();
        });

        // Tabs de combustible
        $('.fuel-tab').on('click', function() {
            $('.fuel-tab').removeClass('active');
            $(this).addClass('active');
            currentState.fuelType = $(this).data('fuel');
            updateBrands();
            calculateAll();
        });

        // Selección de marcas
        $('.brand-item').on('click', function() {
            const fuelBrands = fuelData[currentState.fuelType].brands;
            const brandId = $(this).data('brand');

            if (fuelBrands.includes(brandId)) {
                $('.brand-item').removeClass('active');
                $(this).addClass('active');
                currentState.brand = brandId;
                calculateAll();
            }
        });

        // Servicios adicionales
        $('.service-item').on('click', function() {
            if (currentState.services.length < 4 || $(this).hasClass('active')) {
                $(this).toggleClass('active');
                updateServices();
                calculateAll();
            }
        });

        // Promociones
        $(document).on('click', '.promo-item', function() {
            $('.promo-item .promo-circle').removeClass('yellow').addClass('gray');
            $(this).find('.promo-circle').removeClass('gray').addClass('yellow');

            const promoValue = parseFloat($(this).data('promo'));
            currentState.promo = promoValue;
            calculateAll();
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

        const totalDiscount = tariffDiscount + promoDiscount;
        const monthlyCost = baseCost * (1 - totalDiscount);

        const monthlySavings = baseCost * totalDiscount;
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

        // Подготовить данные для отправки
        const orderData = {
            // Данные калькулятора
            region: $('#regionSelect option:selected').text(),
            pumping: currentState.pumping,
            fuelType: currentState.fuelType,
            brand: currentState.brand,
            services: currentState.services.join(', '),
            tariff: currentState.tariff,
            promo: Math.round(currentState.promo * 100) + '%',

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

});