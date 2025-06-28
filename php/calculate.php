<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Configuración de datos
$fuelData = [
    'benzin' => [
        'price' => 500200,
        'brands' => ['shell', 'tatneft', 'rosneft'],
        'tariffLimits' => ['econom' => 100, 'premium' => 300]
    ],
    'gaz' => [
        'price' => 200100,
        'brands' => ['shell', 'gazprom', 'bashneft'],
        'tariffLimits' => ['econom' => 200, 'premium' => 700]
    ],
    'dt' => [
        'price' => 320700,
        'brands' => ['tatneft', 'rosneft'],
        'tariffLimits' => ['econom' => 150, 'premium' => 350]
    ]
];

$regionLimits = [
    1 => 1200, // Москва
    2 => 800,  // Санкт-Петербург
    3 => 500   // Краснодар
];

$tariffDiscounts = [
    'econom' => 0.03,    // 3%
    'selected' => 0.05,  // 5%
    'premium' => 0.07    // 7%
];

$promoOptions = [
    'econom' => [0.02, 0.05],     // 2%, 5%
    'selected' => [0.05, 0.20],   // 5%, 20%
    'premium' => [0.20, 0.50]     // 20%, 50%
];

// Obtener datos del POST
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    $input = $_POST;
}

// Validar datos requeridos
$requiredFields = ['region', 'pumping', 'fuelType', 'brand'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        echo json_encode(['error' => "Falta el campo requerido: $field"]);
        exit;
    }
}

$region = (int)$input['region'];
$pumping = (int)$input['pumping'];
$fuelType = $input['fuelType'];
$brand = $input['brand'];
$promo = isset($input['promo']) ? (float)$input['promo'] : 0;

// Validaciones
if (!isset($regionLimits[$region])) {
    echo json_encode(['error' => 'Región inválida']);
    exit;
}

if (!isset($fuelData[$fuelType])) {
    echo json_encode(['error' => 'Tipo de combustible inválido']);
    exit;
}

$maxPumping = $regionLimits[$region];
if ($pumping > $maxPumping || $pumping < 0) {
    echo json_encode(['error' => "Прокачка debe estar entre 0 y $maxPumping toneladas"]);
    exit;
}

$fuel = $fuelData[$fuelType];
if (!in_array($brand, $fuel['brands'])) {
    echo json_encode(['error' => 'Marca no disponible para este combustible']);
    exit;
}

// Calcular tarifa
function calculateTariff($pumping, $fuel) {
    if ($pumping <= $fuel['tariffLimits']['econom']) {
        return 'econom';
    } elseif ($pumping <= $fuel['tariffLimits']['premium']) {
        return 'selected';
    } else {
        return 'premium';
    }
}

$tariff = calculateTariff($pumping, $fuel);

// Validar promoción
if (!in_array($promo, $promoOptions[$tariff])) {
    $promo = max($promoOptions[$tariff]); // Usar la promoción más alta disponible
}

// Calcular costos
$baseCost = $fuel['price'] * $pumping;
$tariffDiscount = $tariffDiscounts[$tariff];
$totalDiscount = $tariffDiscount + $promo;
$monthlyCost = $baseCost * (1 - $totalDiscount);
$monthlySavings = $baseCost * $totalDiscount;
$yearlySavings = $monthlySavings * 12;

// Formatear números
function formatCurrency($amount) {
    if ($amount >= 1000000) {
        return number_format($amount / 1000000, 1) . ' млн ₽';
    } elseif ($amount >= 1000) {
        return number_format($amount / 1000, 0) . ' тыс ₽';
    } else {
        return number_format($amount, 0) . ' ₽';
    }
}

// Nombres de tarifas
$tariffNames = [
    'econom' => 'Эконом',
    'selected' => 'Избранный',
    'premium' => 'Премиум'
];

// Respuesta
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
            'monthlyCost' => formatCurrency($monthlyCost),
            'monthlySavings' => formatCurrency($monthlySavings),
            'yearlySavings' => formatCurrency($yearlySavings)
        ]
    ]
];

echo json_encode($response);
?>