<?php

declare(strict_types=1);

namespace Drupal\hkcec_log_center\EventSubscriber;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\hkcec_log_center\Service\LogCenterWriter;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\TerminateEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Records HTTP access logs.
 */
final class AccessLogSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly LogCenterWriter $writer,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly AccountProxyInterface $currentUser,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [
      KernelEvents::TERMINATE => ['onTerminate', 0],
    ];
  }

  /**
   * Write an access row after the response is sent.
   */
  public function onTerminate(TerminateEvent $event): void {
    $config = $this->configFactory->get('hkcec_log_center.settings');
    if (!$config->get('access_logging')) {
      return;
    }

    $request = $event->getRequest();
    $response = $event->getResponse();
    $path = $request->getPathInfo() ?: '/';

    // Avoid recursive logging of Log Center itself and static assets.
    $prefixes = $config->get('skip_path_prefixes') ?? [];
    foreach ($prefixes as $prefix) {
      if ($prefix !== '' && str_starts_with($path, (string) $prefix)) {
        return;
      }
    }
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $skip_ext = $config->get('skip_extensions') ?? [];
    if ($ext !== '' && in_array($ext, $skip_ext, TRUE)) {
      return;
    }

    $status = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : 0;
    $this->writer->access('HTTP ' . $request->getMethod() . ' ' . $path, [
      'uid' => (int) $this->currentUser->id(),
      'username' => $this->currentUser->getAccountName() ?: 'anonymous',
      'ip' => $request->getClientIp() ?? '',
      'method' => $request->getMethod(),
      'path' => $request->getRequestUri(),
      'status_code' => $status,
      'user_agent' => (string) $request->headers->get('User-Agent', ''),
      'channel' => 'access',
    ]);
  }

}
