<?php
// view_orders.php - Para ver los pedidos guardados

// Seguridad básica (cambiar esta contraseña)
$password = 'admin123'; // CAMBIAR ESTA CONTRASEÑA
$inputPassword = $_GET['pass'] ?? '';

if ($inputPassword !== $password) {
    die('❌ Acceso denegado. Usa: view_orders.php?pass=admin123');
}

echo '<html><head><meta charset="UTF-8"><title>📋 Pedidos - Калькулятор Тарифов</title>';
echo '<style>
body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
.container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { background: #14b8a6; color: white; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
.order { background: #f8f9fa; border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 15px; }
.order-header { background: #14b8a6; color: white; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-weight: bold; }
.order-data { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; }
.data-item { background: white; padding: 8px; border-radius: 4px; border-left: 3px solid #fbbf24; }
.label { font-weight: bold; color: #666; font-size: 12px; }
.value { color: #333; font-size: 14px; }
.no-orders { text-align: center; color: #666; padding: 40px; }
.stats { background: #e7f3ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
</style></head><body>';

echo '<div class="container">';
echo '<div class="header"><h1>📋 Заявки на Тарифы</h1><p>Все поданные заявки через калькулятор</p></div>';

$logFile = __DIR__ . '/orders.log';

if (!file_exists($logFile)) {
    echo '<div class="no-orders">📭 Пока нет заявок</div>';
    echo '</div></body></html>';
    exit;
}

$logContent = file_get_contents($logFile);
$lines = explode("--------------------------------------------------------------------------------", $logContent);
$orders = [];

foreach ($lines as $line) {
    $line = trim($line);
    if (empty($line)) continue;

    // Extraer timestamp y JSON
    if (preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \| (.+)$/s', $line, $matches)) {
        $timestamp = $matches[1];
        $jsonData = $matches[2];

        $orderData = json_decode($jsonData, true);
        if ($orderData) {
            $orderData['timestamp'] = $timestamp;
            $orders[] = $orderData;
        }
    }
}

// Ordenar por fecha (más recientes primero)
usort($orders, function($a, $b) {
    return strcmp($b['timestamp'], $a['timestamp']);
});

$totalOrders = count($orders);
$todayOrders = 0;
$today = date('Y-m-d');

foreach ($orders as $order) {
    if (strpos($order['timestamp'], $today) === 0) {
        $todayOrders++;
    }
}

echo "<div class='stats'>";
echo "<strong>📊 Статистика:</strong> Всего заявок: $totalOrders | Сегодня: $todayOrders | Последнее обновление: " . date('d.m.Y H:i:s');
echo "</div>";

if (empty($orders)) {
    echo '<div class="no-orders">📭 Нет заявок в логе</div>';
} else {
    foreach ($orders as $i => $order) {
        $orderNum = $i + 1;
        $data = $order['data'] ?? [];

        echo "<div class='order'>";
        echo "<div class='order-header'>Заявка #$orderNum - {$order['timestamp']} (IP: {$order['ip']})</div>";
        echo "<div class='order-data'>";

        // Información del cliente
        echo "<div class='data-item'><div class='label'>ИНН:</div><div class='value'>" . ($data['inn'] ?? 'N/A') . "</div></div>";
        echo "<div class='data-item'><div class='label'>Телефон:</div><div class='value'>" . ($data['phone'] ?? 'N/A') . "</div></div>";
        echo "<div class='data-item'><div class='label'>Email:</div><div class='value'>" . ($data['email'] ?? 'N/A') . "</div></div>";

        // Información del pedido
        echo "<div class='data-item'><div class='label'>Регион:</div><div class='value'>" . ($data['region'] ?? 'N/A') . "</div></div>";
        echo "<div class='data-item'><div class='label'>Прокачка:</div><div class='value'>" . ($data['pumping'] ?? 'N/A') . " тонн</div></div>";
        echo "<div class='data-item'><div class='label'>Тип топлива:</div><div class='value'>" . ($data['fuelType'] ?? 'N/A') . "</div></div>";
        echo "<div class='data-item'><div class='label'>Бренд:</div><div class='value'>" . ($data['brand'] ?? 'N/A') . "</div></div>";
        echo "<div class='data-item'><div class='label'>Тариф:</div><div class='value'>" . ($data['tariff'] ?? 'N/A') . "</div></div>";
        echo "<div class='data-item'><div class='label'>Промо-акция:</div><div class='value'>" . ($data['promo'] ?? 'N/A') . "</div></div>";

        // Información financiera
        if (isset($data['monthlyCost'])) {
            echo "<div class='data-item'><div class='label'>Стоимость в месяц:</div><div class='value'>" . number_format($data['monthlyCost']) . " ₽</div></div>";
        }
        if (isset($data['monthlySavings'])) {
            echo "<div class='data-item'><div class='label'>Экономия в месяц:</div><div class='value'>" . number_format($data['monthlySavings']) . " ₽</div></div>";
        }
        if (isset($data['yearlySavings'])) {
            echo "<div class='data-item'><div class='label'>Экономия в год:</div><div class='value'>" . number_format($data['yearlySavings']) . " ₽</div></div>";
        }

        // Servicios
        if (isset($data['services']) && $data['services'] !== 'Нет') {
            echo "<div class='data-item'><div class='label'>Услуги:</div><div class='value'>" . $data['services'] . "</div></div>";
        }

        echo "</div></div>";
    }
}

echo '<div style="margin-top: 30px; padding: 15px; background: #f0f9ff; border-radius: 6px; border-left: 4px solid #14b8a6;">';
echo '<strong>💡 Совет:</strong> Добавьте эту страницу в закладки для быстрого доступа к заявкам.<br>';
echo '<strong>🔒 Безопасность:</strong> Измените пароль в файле view_orders.php<br>';
echo '<strong>📧 Email:</strong> Для получения заявок на email, измените $empresaEmail в send_email.php';
echo '</div>';

echo '</div></body></html>';
?>