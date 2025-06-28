<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Validación de datos
function validateInput($data) {
    $errors = [];

    // Validar ИНН (12 dígitos)
    if (!isset($data['inn']) || !preg_match('/^\d{12}$/', $data['inn'])) {
        $errors[] = 'ИНН должен содержать 12 цифр';
    }

    // Validar teléfono (11 dígitos)
    if (!isset($data['phone']) || !preg_match('/^\d{11}$/', $data['phone'])) {
        $errors[] = 'Телефон должен содержать 11 цифр';
    }

    // Validar email
    if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Некорректный email адрес';
    }

    // Validar datos del calculador
    $requiredFields = ['region', 'pumping', 'fuelType', 'brand', 'tariff'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Отсутствует поле: $field";
        }
    }

    return $errors;
}

// Obtener datos
$data = $_POST;

// Validar
$errors = validateInput($data);
if (!empty($errors)) {
    echo json_encode([
        'success' => false,
        'message' => implode(', ', $errors)
    ]);
    exit;
}

// Limpiar y preparar datos
$cleanData = [
    'inn' => htmlspecialchars(trim($data['inn'])),
    'phone' => htmlspecialchars(trim($data['phone'])),
    'email' => htmlspecialchars(trim($data['email'])),
    'region' => htmlspecialchars(trim($data['region'])),
    'pumping' => (int)$data['pumping'],
    'fuelType' => htmlspecialchars(trim($data['fuelType'])),
    'brand' => htmlspecialchars(trim($data['brand'])),
    'services' => isset($data['services']) ? htmlspecialchars(trim($data['services'])) : 'Нет',
    'tariff' => htmlspecialchars(trim($data['tariff'])),
    'promo' => isset($data['promo']) ? htmlspecialchars(trim($data['promo'])) : '0%',
    'monthlyCost' => isset($data['monthlyCost']) ? (int)$data['monthlyCost'] : 0,
    'totalDiscountPercent' => isset($data['totalDiscountPercent']) ? htmlspecialchars(trim($data['totalDiscountPercent'])) : '0%',
    'monthlySavings' => isset($data['monthlySavings']) ? (int)$data['monthlySavings'] : 0,
    'yearlySavings' => isset($data['yearlySavings']) ? (int)$data['yearlySavings'] : 0
];

// Traducir tipos de combustible
$fuelTypeNames = [
    'benzin' => 'Бензин',
    'gaz' => 'Газ',
    'dt' => 'ДТ'
];

$tariffNames = [
    'econom' => 'Эконом',
    'selected' => 'Избранный',
    'premium' => 'Премиум'
];

$brandNames = [
    'shell' => 'Shell',
    'tatneft' => 'Татнефть',
    'rosneft' => 'Роснефть',
    'lukoil' => 'Лукойл',
    'gazprom' => 'Газпром',
    'bashneft' => 'Башнефть'
];

// Crear contenido del email
$subject = 'Новая заявка на тариф: ' . $cleanData['tariff'];

$emailContent = "
=== ЗАЯВКА НА ТАРИФ ===

ДАННЫЕ КЛИЕНТА:
• ИНН: {$cleanData['inn']}
• Телефон: {$cleanData['phone']}
• Email: {$cleanData['email']}

РЕЗУЛЬТАТЫ РАСЧЕТА:
• Регион: {$cleanData['region']}
• Прокачка: {$cleanData['pumping']} тонн
• Тип топлива: {$cleanData['fuelType']}
• Бренд: {$cleanData['brand']}
• Дополнительные услуги: {$cleanData['services']}
• Тариф: {$cleanData['tariff']}
• Промо-акция: {$cleanData['promo']}
• Стоимость топлива в месяц: " . number_format($cleanData['monthlyCost']) . " ₽
• Суммарная скидка: {$cleanData['totalDiscountPercent']}
• Экономия в месяц: " . number_format($cleanData['monthlySavings']) . " ₽
• Экономия в год: " . number_format($cleanData['yearlySavings']) . " ₽

---
Заявка отправлена: " . date('d.m.Y H:i:s') . "
IP адрес: " . ($_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "
";

// Headers del email
$headers = [
    'From: noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost'),
    'Reply-To: ' . $cleanData['email'],
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8'
];

// Intentar enviar email
try {
    $emailSent = mail(
        $cleanData['email'], // Enviar al email del cliente
        $subject,
        $emailContent,
        implode("\r\n", $headers)
    );

    if ($emailSent) {
        // Log exitoso (opcional)
        error_log("Email enviado exitosamente a: " . $cleanData['email']);

        echo json_encode([
            'success' => true,
            'message' => 'Заявка успешно отправлена'
        ]);
    } else {
        // Log error
        error_log("Error enviando email a: " . $cleanData['email']);

        echo json_encode([
            'success' => false,
            'message' => 'Ошибка при отправке email'
        ]);
    }

} catch (Exception $e) {
    error_log("Excepción al enviar email: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Ошибка сервера при отправке'
    ]);
}

// Opcional: Guardar en base de datos o archivo log
function saveToLog($data) {
    $logFile = __DIR__ . '/orders.log';
    $logEntry = date('Y-m-d H:i:s') . " | " . json_encode($data) . "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Guardar log de la orden
saveToLog($cleanData);
?>