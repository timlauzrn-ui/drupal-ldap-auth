<?php

declare(strict_types=1);

namespace Drupal\hkcec_log_center;

use Drupal\hkcec_log_center\Service\LogCenterWriter;

/**
 * Public API for writing custom / typed Log Center entries.
 *
 * Example: LogCenter::log('custom', 'Something happened', ['context' => [...]]);
 */
final class LogCenter {

  /**
   * Write a log entry by type.
   *
   * @param string $type
   *   One of: access, error, security, custom, waf.
   * @param array<string, mixed> $extra
   */
  public static function log(string $type, string $message, array $extra = []): int {
    /** @var \Drupal\hkcec_log_center\Service\LogCenterWriter $writer */
    $writer = \Drupal::service('hkcec_log_center.writer');
    return match ($type) {
      LogCenterWriter::TYPE_ACCESS => $writer->access($message, $extra),
      LogCenterWriter::TYPE_ERROR => $writer->error($message, $extra),
      LogCenterWriter::TYPE_SECURITY => $writer->security($message, $extra),
      LogCenterWriter::TYPE_WAF => $writer->waf($message, $extra),
      default => $writer->custom($message, $extra),
    };
  }

}
