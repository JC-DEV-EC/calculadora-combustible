<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método не разрешен']);
    exit;
}

// Configuración EXACTA según requerimientos del proyecto
$fuelData = [
    'benzin' => [
        'price' => 500200, // 500,200 р за тонну
        'brands' => ['rosneft', 'tatneft', 'lukoil'], // SIN Shell
        'tariffLimits' => ['econom' => 100, 'premium' => 300] // hasta 100=Эконом, 100-300=Избранный, 300+=Премиум
    ],
    'gaz' => [
        'price' => 200100, // 200,100 р за тонну
        'brands' => ['shell', 'gazprom', 'bashneft'], // CON Shell
        'tariffLimits' => ['econom' => 200, 'premium' => 700] // hasta 200=Эконом, 200-700=Избранный, 700+=Премиум
    ],
    'dt' => [
        'price' => 320700, // 320,700 р за тонну
        'brands' => ['tatneft', 'lukoil'], // SOLO estos 2
        'tariffLimits' => ['econom' => 150, 'premium' => 350] // hasta 150=Эконом, 150-350=Избранный, 350+=Премиум
    ]
];

$regionLimits = [
    1 => 1200, // Москва: макс. 1200 тонн
    2 => 800,  // Санкт-Петербург: макс. 800 тонн
    3 => 500   // Краснодар: макс. 500 тонн
];

$tariffDiscounts = [
    'econom' => 0.03,    // Эконом: 3%
    'selected' => 0.05,  // Избранный: 5%
    'premium' => 0.07    // Премиум: 7%
];

$promoOptions = [
    'econom' => [0.02, 0.05],     // Эконом: 2%, 5%
    'selected' => [0.05, 0.20],   // Избранный: 5%, 20%
    'premium' => [0.20, 0.50]     // Премиум: 20%, 50%
];

// Obtener datos del POST
$input = $_POST;

// Validar datos requeridos
$requiredFields = ['region', 'pumping', 'fuelType', 'brand'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || $input[$field] === '') {
        echo json_encode([
            'success' => false,
            'error' => "Отсутствует обязательное поле: $field"
        ]);
        exit;
    }
}

$region = (int)$input['region'];
$pumping = (int)$input['pumping'];
$fuelType = trim($input['fuelType']);
$brand = trim($input['brand']);
$promo = isset($input['promo']) ? (float)$input['promo'] : 0;

// Validaciones
if (!isset($regionLimits[$region])) {
    echo json_encode(['success' => false, 'error' => 'Недопустимый регион']);
    exit;
}

if (!isset($fuelData[$fuelType])) {
    echo json_encode(['success' => false, 'error' => 'Недопустимый тип топлива']);
    exit;
}

$maxPumping = $regionLimits[$region];
if ($pumping > $maxPumping || $pumping < 0) {
    echo json_encode([
        'success' => false,
        'error' => "Объем прокачки должен быть от 0 до $maxPumping тонн"
    ]);
    exit;
}

$fuel = $fuelData[$fuelType];
if (!in_array($brand, $fuel['brands'])) {
    echo json_encode(['success' => false, 'error' => 'Бренд недоступен для данного типа топлива']);
    exit;
}

// Función para calcular tarifa según volumen
function calculateTariff($pumping, $fuel) {
    if ($pumping <= $fuel['tariffLimits']['econom']) {
        return 'econom';
    } elseif ($pumping <= $fuel['tariffLimits']['premium']) {
        return 'selected';
    } else {
        return 'premium';
    }
}

// Calcular tarifa basada en el volumen
$tariff = calculateTariff($pumping, $fuel);

// Validar que la promoción sea válida para este tariff
if ($promo > 0 && !in_array($promo, $promoOptions[$tariff])) {
    // Si la promoción no es válida, usar la máxima disponible
    $promo = max($promoOptions[$tariff]);
}

// Cálculos principales
$baseCost = $fuel['price'] * $pumping; // Costo base
$tariffDiscount = $tariffDiscounts[$tariff]; // Descuento por tarifa
$totalDiscount = $tariffDiscount + $promo; // Descuento total

// Calcular ahorros y costos
// Fórmula: Costo = precio_combustible * cantidad_toneladas - (descuento_tarifa + descuento_promo)
$tariffSavingsRub = $baseCost * $tariffDiscount; // Ahorro por tarifa en rublos
$promoSavingsRub = $baseCost * $promo; // Ahorro por promoción en rublos
$totalSavingsRub = $tariffSavingsRub + $promoSavingsRub; // Ahorro total en rublos

$monthlyCost = $baseCost - $totalSavingsRub; // Costo mensual del combustible
$monthlySavings = $totalSavingsRub; // Ahorro mensual
$yearlySavings = $monthlySavings * 12; // Ahorro anual

// Función para formatear números a formato ruso
function formatCurrency($amount) {
    if ($amount >= 1000000) {
        return number_format($amount / 1000000, 0, ',', ' ') . ' млн Р';
    } elseif ($amount >= 1000) {
        return number_format($amount / 1000, 0, ',', ' ') . ' тыс Р';
    } else {
        return number_format($amount, 0, ',', ' ') . ' Р';
    }
}

// Nombres de tarifas para la respuesta
$tariffNames = [
    'econom' => 'Эконом',
    'selected' => 'Избранный',
    'premium' => 'Премиум'
];

// Preparar respuesta completa
$response = [
    'success' => true,
    'data' => [
        'tariff' => $tariff,
        'tariffName' => $tariffNames[$tariff],
        'baseCost' => $baseCost,
        'monthlyCost' => $monthlyCost,
        'monthlySavings' => $monthlySavings,
        'yearlySavings' => $yearlySavings,
        'tariffDiscount' => $tariffDiscount * 100, // en porcentaje
        'promoDiscount' => $promo * 100, // en porcentaje
        'totalDiscount' => $totalDiscount * 100, // en porcentaje
        'availablePromos' => $promoOptions[$tariff],
        'formatted' => [
            'baseCost' => formatCurrency($baseCost),
            'monthlyCost' => formatCurrency($monthlyCost),
            'monthlySavings' => 'от ' . formatCurrency($monthlySavings),
            'yearlySavings' => 'от ' . formatCurrency($yearlySavings)
        ],
        'calculation_details' => [
            'fuel_price_per_ton' => $fuel['price'],
            'pumping_tons' => $pumping,
            'tariff_discount_rub' => $tariffSavingsRub,
            'promo_discount_rub' => $promoSavingsRub,
            'total_discount_rub' => $totalSavingsRub,
            'region' => $region,
            'max_pumping_for_region' => $maxPumping
        ]
    ]
];

// Log para debugging (opcional)
if (defined('DEBUG_MODE') && DEBUG_MODE) {
    error_log("Расчет выполнен: " . json_encode($response, JSON_UNESCAPED_UNICODE));
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
?>