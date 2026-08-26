<?php

declare(strict_types=1);

namespace Drupal\log_center\Service;

/**
 * Stub importer for future WAF / external log JSON rows.
 */
final class LogCenterImporter {

  public function __construct(
    private readonly LogCenterWriter $writer,
  ) {}

  /**
   * Import an array of WAF-like events.
   *
   * @param array<int, array<string, mixed>> $rows
   *
   * @return int
   *   Number imported.
   */
  public function importWafRows(array $rows): int {
    $count = 0;
    foreach ($rows as $row) {
      $this->writer->waf((string) ($row['message'] ?? 'WAF event'), [
        'ip' => $row['ip'] ?? '',
        'path' => $row['path'] ?? '',
        'method' => $row['method'] ?? '',
        'status_code' => $row['status_code'] ?? 0,
        'severity' => $row['severity'] ?? 'warning',
        'context' => $row['context'] ?? $row,
        'channel' => 'waf_import',
      ]);
      $count++;
    }
    return $count;
  }

}
