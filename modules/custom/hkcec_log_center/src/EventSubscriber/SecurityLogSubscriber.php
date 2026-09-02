<?php

declare(strict_types=1);

namespace Drupal\hkcec_log_center\EventSubscriber;

use Drupal\Core\Session\AccountProxyInterface;
use Drupal\hkcec_log_center\Service\LogCenterWriter;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;

/**
 * Records security-relevant HTTP denials.
 */
final class SecurityLogSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly LogCenterWriter $writer,
    private readonly AccountProxyInterface $currentUser,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [
      KernelEvents::EXCEPTION => ['onException', 50],
    ];
  }

  /**
   * Log 403 / access denied as security events.
   */
  public function onException(ExceptionEvent $event): void {
    $exception = $event->getThrowable();
    $status = 0;
    if ($exception instanceof HttpExceptionInterface) {
      $status = $exception->getStatusCode();
    }
    if (!$exception instanceof AccessDeniedHttpException && $status !== 403) {
      // Also log 401.
      if ($status !== 401) {
        return;
      }
    }
    if ($status === 0) {
      $status = 403;
    }

    $request = $event->getRequest();
    $path = $request->getRequestUri();
    // Skip logging denied access to log center itself for unauthorized users (still useful but noisy).
    if (str_contains($path, '/admin/reports/log-center')) {
      return;
    }

    $this->writer->security('Access denied (' . $status . ') to ' . $path, [
      'uid' => (int) $this->currentUser->id(),
      'username' => $this->currentUser->getAccountName() ?: 'anonymous',
      'ip' => $request->getClientIp() ?? '',
      'method' => $request->getMethod(),
      'path' => $path,
      'status_code' => $status,
      'user_agent' => (string) $request->headers->get('User-Agent', ''),
      'channel' => 'security',
      'context' => [
        'exception' => get_class($exception),
        'message' => $exception->getMessage(),
      ],
    ]);
  }

}
