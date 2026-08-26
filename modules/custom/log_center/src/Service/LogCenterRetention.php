<?php

declare(strict_types=1);

namespace Drupal\log_center\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Database\Connection;
use Psr\Log\LoggerInterface;

/**
 * Deletes log rows older than retention_days.
 */
final class LogCenterRetention {

  public function __construct(
    private readonly Connection $database,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly LoggerInterface $logger,
  ) {}

  /**
   * Purge expired rows. Returns number deleted.
   */
  public function purge(): int {
    $days = (int) $this->configFactory->get('log_center.settings')->get('retention_days');
    if ($days < 1) {
      return 0;
    }
    $cutoff = \Drupal::time()->getRequestTime() - ($days * 86400);
    $deleted = $this->database->delete('log_center_entry')
      ->condition('timestamp', $cutoff, '<')
      ->execute();
    if ($deleted) {
      $this->logger->notice('Log Center purged @count rows older than @days days.', [
        '@count' => $deleted,
        '@days' => $days,
      ]);
    }
    return (int) $deleted;
  }

}
