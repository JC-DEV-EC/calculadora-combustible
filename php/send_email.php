<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не разрешен']);
    exit;
}

// Configuración de emails
$empresaEmail = 'pedidos@ejemplo-empresa.com'; // CAMBIAR por email real
$enviarEmail = false; // Cambiar a true para activar envío de emails

// Función de validación completa
function validateInput($data) {
    $errors = [];

    // Validar ИНН (exactamente 12 dígitos)
    if (!isset($data['inn']) || !preg_match('/^\d{12}$/', $data['inn'])) {
        $errors[] = 'ИНН должен содержать точно 12 цифр';
    }

    // Validar телефон (exactamente 11 dígitos)
    if (!isset($data['phone']) || !preg_match('/^\d{11}$/', $data['phone'])) {
        $errors[] = 'Телефон должен содержать точно 11 цифр';
    }

    // Validar email
    if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Некорректный email адрес';
    }

    // Validar campos requeridos del cálculo
    $requiredFields = ['region', 'pumping', 'fuelType', 'brand', 'tariff'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Отсутствует поле расчета: $field";
        }
    }

    return $errors;
}

// Función para guardar pedido en log
function saveOrderToLog($data) {
    $logFile = __DIR__ . '/orders.log';
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'data' => $data
    ];

    $logLine = date('Y-m-d H:i:s') . " | " .
        json_encode($logEntry, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) .
        "\n" . str_repeat("-", 80) . "\n";

    // Crear directorio si no existe
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    // Escribir al archivo de log
    if (file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX) === false) {
        error_log("ERROR: No se pudo escribir en el archivo de log: $logFile");
        return false;
    }
    return true;
}

// Obtener y validar datos del POST
$data = $_POST;
$errors = validateInput($data);

if (!empty($errors)) {
    echo json_encode([
        'success' => false,
        'message' => implode(', ', $errors)
    ]);
    exit;
}

// Limpiar y sanitizar datos
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

// Crear contenido del email con formato profesional
$subject = 'Новая заявка на тариф: ' . $cleanData['tariff'];

$emailContent = "
=== ЗАЯВКА НА ТАРИФ ===

РЕЗУЛЬТАТЫ РАСЧЕТА:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

ДАННЫЕ ЗАПОЛНЕНИЯ ФОРМЫ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ИНН: {$cleanData['inn']}
• Телефон для связи: {$cleanData['phone']}
• Email для связи: {$cleanData['email']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Заявка отправлена: " . date('d.m.Y H:i:s') . "
IP адрес клиента: " . ($_SERVER['REMOTE_ADDR'] ?? 'Неизвестен') . "
User Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'Неизвестен') . "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
";

// Headers para el email
$headers = [
    'From: Калькулятор Тарифов <noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '>',
    'Reply-To: ' . $cleanData['email'],
    'X-Mailer: PHP/' . phpversion(),
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Priority: 3',
    'X-MSMail-Priority: Normal'
];

// Procesar el pedido
try {
    // SIEMPRE guardar en log primero (es lo más importante)
    $logSaved = saveOrderToLog($cleanData);

    $response = [
        'success' => true,
        'message' => 'Заявка принята и сохранена',
        'log_saved' => $logSaved
    ];

    // Intentar envío por email si está habilitado
    if ($enviarEmail) {
        $emailSent = mail(
            $empresaEmail,
            $subject,
            $emailContent,
            implode("\r\n", $headers)
        );

        if ($emailSent) {
            error_log("✅ Email enviado exitosamente a: $empresaEmail");
            $response['email_sent'] = true;
            $response['message'] = 'Спасибо! Успешно отправлено.';

            // Email de confirmación al cliente
            $confirmSubject = 'Подтверждение заявки на тариф';
            $confirmMessage = "Спасибо за ваш запрос на тариф {$cleanData['tariff']}!\n\nМы получили вашу заявку и свяжемся с вами в ближайшее время.\n\nВаши данные:\n• ИНН: {$cleanData['inn']}\n• Телефон: {$cleanData['phone']}\n\nС уважением,\nКоманда Калькулятора Тарифов";

            mail($cleanData['email'], $confirmSubject, $confirmMessage, implode("\r\n", $headers));

        } else {
            error_log("❌ Error enviando email a: $empresaEmail (но данные сохранены в log)");
            $response['email_sent'] = false;
            $response['message'] = 'Заявка сохранена (временные проблемы с email)';
        }
    } else {
        error_log("📝 Email отключен - заявка только в log");
        $response['email_sent'] = false;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    error_log("CRITICAL ERROR: " . $e->getMessage());

    // Intentar guardar en log incluso si hay error
    try {
        saveOrderToLog($cleanData);
        echo json_encode([
            'success' => true,
            'message' => 'Заявка сохранена (проблемы сервера с email)',
            'error_details' => $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    } catch (Exception $logException) {
        echo json_encode([
            'success' => false,
            'message' => 'Критическая ошибка сервера',
            'error' => 'Не удалось сохранить заявку'
        ], JSON_UNESCAPED_UNICODE);
    }
}

// Limpieza ocasional de logs antiguos (rotación automática)
if (rand(1, 100) === 1) {
    $logFile = __DIR__ . '/orders.log';
    if (file_exists($logFile) && filesize($logFile) > 10 * 1024 * 1024) { // Si es mayor a 10MB
        $oldFile = __DIR__ . '/orders_backup_' . date('Y-m-d') . '.log';
        rename($logFile, $oldFile);
        error_log("Log rotado: archivo guardado como $oldFile");
    }
}
?>