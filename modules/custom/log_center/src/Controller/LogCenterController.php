<?php

declare(strict_types=1);

namespace Drupal\log_center\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Datetime\DateFormatterInterface;
use Drupal\log_center\Service\LogCenterQuery;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Log detail and CSV export.
 */
final class LogCenterController extends ControllerBase {

  public function __construct(
    private readonly LogCenterQuery $queryService,
    private readonly DateFormatterInterface $dateFormatter,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('log_center.query'),
      $container->get('date.formatter'),
    );
  }

  /**
   * Detail page.
   */
  public function detail(int $log_id): array {
    $row = $this->queryService->load($log_id);
    if (!$row) {
      throw new NotFoundHttpException();
    }
    $context = $row->context ? json_decode($row->context, TRUE) : NULL;
    $time = $this->dateFormatter->format((int) $row->timestamp, 'custom', 'Y-m-d H:i:s T');
    return [
      '#type' => 'container',
      'back' => [
        '#type' => 'link',
        '#title' => $this->t('← Back to Log Center'),
        '#url' => \Drupal\Core\Url::fromRoute('log_center.overview'),
      ],
      'table' => [
        '#type' => 'table',
        '#rows' => [
          [$this->t('ID'), $row->id],
          [$this->t('Type'), $row->type],
          [$this->t('Severity'), $row->severity],
          [$this->t('Time'), $time],
          [$this->t('User'), $row->username . ' (uid ' . $row->uid . ')'],
          [$this->t('IP'), $row->ip],
          [$this->t('Method'), $row->method],
          [$this->t('Path'), $row->path],
          [$this->t('Status'), $row->status_code],
          [$this->t('User agent'), $row->user_agent],
          [$this->t('Channel'), $row->channel],
          [$this->t('Message'), ['data' => ['#markup' => '<pre>' . htmlspecialchars($row->message, ENT_QUOTES, 'UTF-8') . '</pre>']]],
          [$this->t('Context'), ['data' => ['#markup' => '<pre>' . htmlspecialchars(json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '', ENT_QUOTES, 'UTF-8') . '</pre>']]],
        ],
      ],
    ];
  }

  /**
   * Stream CSV for current filters.
   */
  public function export(Request $request): StreamedResponse {
    $types_raw = $request->query->all()['types'] ?? [];
    if (!is_array($types_raw)) {
      $types_raw = $types_raw !== '' && $types_raw !== NULL ? [$types_raw] : [];
    }
    $filters = [
      'types' => array_values(array_filter($types_raw)),
      'username' => (string) $request->query->get('username', ''),
      'ip' => (string) $request->query->get('ip', ''),
      'path' => (string) $request->query->get('path', ''),
      'message' => (string) $request->query->get('message', ''),
      'status_code' => $request->query->get('status_code', ''),
      'date_from' => $this->dateInUserTimezone((string) $request->query->get('date_from', ''), FALSE),
      'date_to' => $this->dateInUserTimezone((string) $request->query->get('date_to', ''), TRUE),
    ];
    if ($type = $request->query->get('type')) {
      $filters['types'] = [$type];
    }
    $sort = (string) $request->query->get('sort', 'timestamp');
    $order = (string) $request->query->get('order', 'DESC');
    $dateFormatter = $this->dateFormatter;
    $filename_stamp = $this->dateFormatter->format(\Drupal::time()->getRequestTime(), 'custom', 'Ymd-His');

    $response = new StreamedResponse(function () use ($filters, $sort, $order, $dateFormatter) {
      $out = fopen('php://output', 'w');
      fputcsv($out, [
        'id', 'type', 'severity', 'timestamp', 'uid', 'username', 'ip',
        'method', 'path', 'status_code', 'user_agent', 'channel', 'message', 'context',
      ]);
      $query = $this->queryService->build($filters, $sort, $order);
      $query->range(0, 50000);
      foreach ($query->execute() as $row) {
        fputcsv($out, [
          $row->id,
          $row->type,
          $row->severity,
          $dateFormatter->format((int) $row->timestamp, 'custom', 'Y-m-d H:i:s T'),
          $row->uid,
          $row->username,
          $row->ip,
          $row->method,
          $row->path,
          $row->status_code,
          $row->user_agent,
          $row->channel,
          $row->message,
          $row->context,
        ]);
      }
      fclose($out);
    });
    $response->headers->set('Content-Type', 'text/csv; charset=utf-8');
    $response->headers->set('Content-Disposition', 'attachment; filename="log-center-' . $filename_stamp . '.csv"');
    return $response;
  }

  /**
   * Convert a Y-m-d date string to a unix timestamp in the user's timezone.
   */
  private function dateInUserTimezone(string $date, bool $end_of_day): ?int {
    $date = trim($date);
    if ($date === '') {
      return NULL;
    }
    try {
      $tz_name = $this->currentUser()->getTimeZone()
        ?: (string) ($this->config('system.date')->get('timezone.default') ?: 'UTC');
      $tz = new \DateTimeZone($tz_name);
      $time = $end_of_day ? '23:59:59' : '00:00:00';
      return (new \DateTimeImmutable($date . ' ' . $time, $tz))->getTimestamp();
    }
    catch (\Exception) {
      return NULL;
    }
  }

}
