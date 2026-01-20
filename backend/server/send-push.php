<?php
require __DIR__ . '../../../vendor/autoload.php';

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

// Load VAPID keys from external file
$vapid = require 'vapidKeysPushnotification.php';

$auth = [
  'VAPID' => [
    'subject' => $vapid['subject'], // e.g., 'mailto:your@email.com'
    'publicKey' => $vapid['publicKey'],
    'privateKey' => $vapid['privateKey'],
  ],
];

// Load the saved subscription data (from DB or JSON file)
$subscriptionData = json_decode(file_get_contents('subscriptions.json'), true);

// Create the subscription object
$subscription = Subscription::create([
  'endpoint' => $subscriptionData['endpoint'],
  'publicKey' => $subscriptionData['keys']['p256dh'],
  'authToken' => $subscriptionData['keys']['auth'],
]);

// Prepare the push notification payload
$payload = json_encode([
  'title' => 'Hello!',
  'body' => 'You received a new push message 🎉',
  'icon' => '/icon-192.png',
  'url' => 'https://yourdomain.com/somepage'
]);

// Send the push
$webPush = new WebPush($auth);
$webPush->queueNotification($subscription, $payload);

// Send and handle result
foreach ($webPush->flush() as $report) {
  $endpoint = $report->getRequest()->getUri()->__toString();
  if ($report->isSuccess()) {
    echo "✅ Sent successfully to $endpoint\n";
  } else {
    echo "❌ Failed to send to $endpoint: " . $report->getReason() . "\n";
  }
}
