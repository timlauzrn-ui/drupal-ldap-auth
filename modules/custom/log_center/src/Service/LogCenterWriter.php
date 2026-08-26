<?php

declare(strict_types=1);

namespace Drupal\log_center\Service;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Session\AccountProxyInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Writes rows into log_center_entry.
 */
final class LogCenterWriter {

  public const TYPE_ACCESS = 'access';
  public const TYPE_ERROR = 'error';
  public const TYPE_SECURITY = 'security';
  public const TYPE_CUSTOM = 'custom';
  public const TYPE_WAF = 'waf';

  public function __construct(
    private readonly Connection $database,
    private readonly AccountProxyInterface $currentUser,
    private readonly RequestStack $requestStack,
    private readonly TimeInterface $time,
  ) {}

  /**
   * Insert a log entry.
   *
   * @param array<string, mixed> $data
   *   Partial row data.
   */
  public function write(array $data): int {
    $request = $this->requestStack->getCurrentRequest();
    $account = $this->currentUser;

    $row = [
      'type' => (string) ($data['type'] ?? self::TYPE_CUSTOM),
      'severity' => (string) ($data['severity'] ?? 'info'),
      'timestamp' => (int) ($data['timestamp'] ?? $this->time->getRequestTime()),
      'uid' => (int) ($data['uid'] ?? $account->id()),
      'username' => (string) ($data['username'] ?? ($account->getAccountName() ?: 'anonymous')),
      'ip' => (string) ($data['ip'] ?? ($request?->getClientIp() ?? '')),
      'method' => (string) ($data['method'] ?? ($request?->getMethod() ?? '')),
      'path' => mb_substr((string) ($data['path'] ?? ($request?->getRequestUri() ?? '')), 0, 512),
      'status_code' => (int) ($data['status_code'] ?? 0),
      'user_agent' => mb_substr((string) ($data['user_agent'] ?? ($request?->headers->get('User-Agent') ?? '')), 0, 512),
      'message' => (string) ($data['message'] ?? ''),
      'context' => isset($data['context']) ? (is_string($data['context']) ? $data['context'] : json_encode($data['context'], JSON_UNESCAPED_SLASHES)) : NULL,
      'channel' => (string) ($data['channel'] ?? 'log_center'),
    ];

    // Never store password-like keys in context.
    if (is_string($row['context']) && $row['context'] !== '') {
      $decoded = json_decode($row['context'], TRUE);
      if (is_array($decoded)) {
        foreach (['pass', 'password', 'Authorization', 'authorization'] as $sensitive) {
          unset($decoded[$sensitive]);
        }
        $row['context'] = json_encode($decoded, JSON_UNESCAPED_SLASHES);
      }
    }

    $this->database->insert('log_center_entry')->fields($row)->execute();
    return (int) $this->database->lastInsertId();
  }

  /**
   * Convenience helpers.
   */
  public function access(string $message, array $extra = []): int {
    return $this->write(['type' => self::TYPE_ACCESS, 'severity' => 'info', 'message' => $message] + $extra);
  }

  public function error(string $message, array $extra = []): int {
    return $this->write(['type' => self::TYPE_ERROR, 'severity' => 'error', 'message' => $message] + $extra);
  }

  public function security(string $message, array $extra = []): int {
    return $this->write(['type' => self::TYPE_SECURITY, 'severity' => 'warning', 'message' => $message] + $extra);
  }

  public function custom(string $message, array $extra = []): int {
    return $this->write(['type' => self::TYPE_CUSTOM, 'severity' => 'info', 'message' => $message] + $extra);
  }

  public function waf(string $message, array $extra = []): int {
    return $this->write(['type' => self::TYPE_WAF, 'severity' => 'warning', 'message' => $message] + $extra);
  }

}
