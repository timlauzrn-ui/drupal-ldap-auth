<?php

declare(strict_types=1);

namespace Drupal\hkcec_log_center\Service;

use Drupal\Core\Database\Connection;
use Drupal\Core\Database\Query\SelectInterface;

/**
 * Builds filtered/sorted queries for Log Center UI and CSV export.
 */
final class LogCenterQuery {

  public function __construct(
    private readonly Connection $database,
  ) {}

  /**
   * @param array<string, mixed> $filters
   */
  public function build(array $filters = [], string $sort = 'timestamp', string $order = 'DESC'): SelectInterface {
    $query = $this->database->select('hkcec_log_center_entry', 'l')->fields('l');

    if (!empty($filters['types']) && is_array($filters['types'])) {
      $query->condition('l.type', array_values($filters['types']), 'IN');
    }
    if (!empty($filters['type']) && is_string($filters['type'])) {
      $query->condition('l.type', $filters['type']);
    }
    if (!empty($filters['username'])) {
      $query->condition('l.username', '%' . $this->database->escapeLike($filters['username']) . '%', 'LIKE');
    }
    if (isset($filters['uid']) && $filters['uid'] !== '' && $filters['uid'] !== NULL) {
      $query->condition('l.uid', (int) $filters['uid']);
    }
    if (!empty($filters['ip'])) {
      $query->condition('l.ip', '%' . $this->database->escapeLike($filters['ip']) . '%', 'LIKE');
    }
    if (!empty($filters['path'])) {
      $query->condition('l.path', '%' . $this->database->escapeLike($filters['path']) . '%', 'LIKE');
    }
    if (!empty($filters['message'])) {
      $query->condition('l.message', '%' . $this->database->escapeLike($filters['message']) . '%', 'LIKE');
    }
    if (isset($filters['status_code']) && $filters['status_code'] !== '' && $filters['status_code'] !== NULL) {
      $query->condition('l.status_code', (int) $filters['status_code']);
    }
    if (!empty($filters['date_from'])) {
      $query->condition('l.timestamp', (int) $filters['date_from'], '>=');
    }
    if (!empty($filters['date_to'])) {
      $query->condition('l.timestamp', (int) $filters['date_to'], '<=');
    }

    $allowed_sort = ['timestamp', 'type', 'username', 'ip', 'status_code', 'id', 'severity'];
    if (!in_array($sort, $allowed_sort, TRUE)) {
      $sort = 'timestamp';
    }
    $order = strtoupper($order) === 'ASC' ? 'ASC' : 'DESC';
    $query->orderBy('l.' . $sort, $order);
    if ($sort !== 'id') {
      $query->orderBy('l.id', 'DESC');
    }

    return $query;
  }

  /**
   * Load one row by id.
   *
   * @return object|false
   */
  public function load(int $id) {
    return $this->database->select('hkcec_log_center_entry', 'l')
      ->fields('l')
      ->condition('id', $id)
      ->execute()
      ->fetchObject();
  }

}
