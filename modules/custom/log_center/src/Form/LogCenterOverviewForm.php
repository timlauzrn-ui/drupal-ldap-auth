<?php

declare(strict_types=1);

namespace Drupal\log_center\Form;

use Drupal\Core\Datetime\DateFormatterInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Pager\PagerManagerInterface;
use Drupal\Core\Url;
use Drupal\log_center\Service\LogCenterQuery;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Searchable / sortable Log Center overview.
 */
final class LogCenterOverviewForm extends FormBase {

  public function __construct(
    private readonly LogCenterQuery $queryService,
    private readonly PagerManagerInterface $pagerManager,
    private readonly DateFormatterInterface $dateFormatter,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('log_center.query'),
      $container->get('pager.manager'),
      $container->get('date.formatter'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'log_center_overview_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $request = $this->getRequest();
    $types_raw = $request->query->all()['types'] ?? [];
    if (!is_array($types_raw)) {
      $types_raw = $types_raw !== '' && $types_raw !== NULL ? [$types_raw] : [];
    }
    $filters = [
      'types' => array_values(array_filter($types_raw)),
      'username' => (string) $request->query->get('username', ''),
      'uid' => $request->query->get('uid', ''),
      'ip' => (string) $request->query->get('ip', ''),
      'path' => (string) $request->query->get('path', ''),
      'message' => (string) $request->query->get('message', ''),
      'status_code' => $request->query->get('status_code', ''),
      'date_from' => $this->dateInUserTimezone((string) $request->query->get('date_from', ''), FALSE),
      'date_to' => $this->dateInUserTimezone((string) $request->query->get('date_to', ''), TRUE),
    ];
    // Support single type= query too.
    if ($type = $request->query->get('type')) {
      $filters['types'] = [$type];
    }

    $sort = (string) $request->query->get('sort', 'timestamp');
    $order = (string) $request->query->get('order', 'DESC');

    $form['filters'] = [
      '#type' => 'details',
      '#title' => $this->t('Search & filters'),
      '#open' => TRUE,
    ];
    $form['filters']['types'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Log types'),
      '#options' => [
        'access' => $this->t('Access'),
        'error' => $this->t('Error'),
        'security' => $this->t('Security'),
        'custom' => $this->t('Custom'),
        'waf' => $this->t('WAF'),
      ],
      '#default_value' => $filters['types'] ?: [],
    ];
    $form['filters']['username'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Username'),
      '#default_value' => $filters['username'],
      '#size' => 30,
    ];
    $form['filters']['ip'] = [
      '#type' => 'textfield',
      '#title' => $this->t('IP contains'),
      '#default_value' => $filters['ip'],
      '#size' => 20,
    ];
    $form['filters']['path'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Path contains'),
      '#default_value' => $filters['path'],
      '#size' => 40,
    ];
    $form['filters']['message'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Message contains'),
      '#default_value' => $filters['message'],
      '#size' => 40,
    ];
    $form['filters']['status_code'] = [
      '#type' => 'number',
      '#title' => $this->t('HTTP status'),
      '#default_value' => $filters['status_code'],
    ];
    $form['filters']['date_from'] = [
      '#type' => 'date',
      '#title' => $this->t('From'),
      '#default_value' => $request->query->get('date_from', ''),
    ];
    $form['filters']['date_to'] = [
      '#type' => 'date',
      '#title' => $this->t('To'),
      '#default_value' => $request->query->get('date_to', ''),
    ];
    $form['filters']['actions'] = [
      '#type' => 'actions',
      'submit' => [
        '#type' => 'submit',
        '#value' => $this->t('Filter'),
      ],
      'export' => [
        '#type' => 'link',
        '#title' => $this->t('Export CSV'),
        '#url' => Url::fromRoute('log_center.export', [], [
          'query' => array_filter([
            'types' => array_values(array_filter($filters['types'] ?: [])),
            'username' => $filters['username'] ?: NULL,
            'ip' => $filters['ip'] ?: NULL,
            'path' => $filters['path'] ?: NULL,
            'message' => $filters['message'] ?: NULL,
            'status_code' => $filters['status_code'] !== '' ? $filters['status_code'] : NULL,
            'date_from' => $request->query->get('date_from') ?: NULL,
            'date_to' => $request->query->get('date_to') ?: NULL,
            'sort' => $sort,
            'order' => $order,
          ], static fn($v) => $v !== NULL && $v !== '' && $v !== []),
        ]),
        '#attributes' => ['class' => ['button']],
      ],
    ];

    $query = $this->queryService->build($filters, $sort, $order);
    $count_query = clone $query;
    $total = (int) $count_query->countQuery()->execute()->fetchField();

    $pager = $this->pagerManager->createPager($total, 50);
    $page = $pager->getCurrentPage();
    $query->range($page * 50, 50);
    $rows_data = $query->execute()->fetchAll();

    $header = [
      'id' => $this->sortHeader('ID', 'id', $sort, $order),
      'timestamp' => $this->sortHeader('Time', 'timestamp', $sort, $order),
      'type' => $this->sortHeader('Type', 'type', $sort, $order),
      'severity' => $this->sortHeader('Severity', 'severity', $sort, $order),
      'username' => $this->sortHeader('User', 'username', $sort, $order),
      'ip' => $this->sortHeader('IP', 'ip', $sort, $order),
      'status_code' => $this->sortHeader('Status', 'status_code', $sort, $order),
      'path' => ['data' => $this->t('Path')],
      'message' => ['data' => $this->t('Message')],
      'ops' => ['data' => $this->t('Ops')],
    ];

    $rows = [];
    foreach ($rows_data as $row) {
      $rows[] = [
        'id' => $row->id,
        'timestamp' => $this->dateFormatter->format((int) $row->timestamp, 'custom', 'Y-m-d H:i:s T'),
        'type' => $row->type,
        'severity' => $row->severity,
        'username' => $row->username,
        'ip' => $row->ip,
        'status_code' => $row->status_code ?: '',
        'path' => ['data' => ['#markup' => htmlspecialchars(mb_substr($row->path, 0, 80), ENT_QUOTES, 'UTF-8')]],
        'message' => ['data' => ['#markup' => htmlspecialchars(mb_substr($row->message, 0, 100), ENT_QUOTES, 'UTF-8')]],
        'ops' => [
          'data' => [
            '#type' => 'link',
            '#title' => $this->t('View'),
            '#url' => Url::fromRoute('log_center.detail', ['log_id' => $row->id]),
          ],
        ],
      ];
    }

    $form['table'] = [
      '#type' => 'table',
      '#header' => $header,
      '#rows' => $rows,
      '#empty' => $this->t('No log entries match your filters.'),
    ];
    $form['pager'] = ['#type' => 'pager'];
    $form['summary'] = [
      '#markup' => '<p>' . $this->t('Showing page @page of @total entries. Times shown in your timezone (@tz).', [
        '@page' => $page + 1,
        '@total' => $total,
        '@tz' => $this->userTimezone(),
      ]) . '</p>',
      '#weight' => -1,
    ];

    return $form;
  }

  /**
   * Resolve the current user's timezone (account → site default → UTC).
   */
  private function userTimezone(): string {
    $tz = $this->currentUser()->getTimeZone();
    if ($tz) {
      return $tz;
    }
    return (string) ($this->config('system.date')->get('timezone.default') ?: 'UTC');
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
      $tz = new \DateTimeZone($this->userTimezone());
      $time = $end_of_day ? '23:59:59' : '00:00:00';
      return (new \DateTimeImmutable($date . ' ' . $time, $tz))->getTimestamp();
    }
    catch (\Exception) {
      return NULL;
    }
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $values = $form_state->getValues();
    $query = [
      'types' => array_values(array_filter($values['types'] ?? [])),
      'username' => $values['username'] ?? '',
      'ip' => $values['ip'] ?? '',
      'path' => $values['path'] ?? '',
      'message' => $values['message'] ?? '',
      'status_code' => $values['status_code'] ?? '',
      'date_from' => $values['date_from'] ?? '',
      'date_to' => $values['date_to'] ?? '',
    ];
    $form_state->setRedirect('log_center.overview', [], [
      'query' => array_filter($query, static fn($v) => $v !== '' && $v !== NULL && $v !== []),
    ]);
  }

  /**
   * Build a sort link header.
   */
  private function sortHeader(string $label, string $field, string $current_sort, string $current_order): array {
    $next = ($current_sort === $field && strtoupper($current_order) === 'DESC') ? 'ASC' : 'DESC';
    $query = $this->getRequest()->query->all();
    $query['sort'] = $field;
    $query['order'] = $next;
    return [
      'data' => [
        '#type' => 'link',
        '#title' => $this->t($label) . ($current_sort === $field ? ($current_order === 'ASC' ? ' ↑' : ' ↓') : ''),
        '#url' => Url::fromRoute('log_center.overview', [], ['query' => $query]),
      ],
    ];
  }

}
