<?php

declare(strict_types=1);

namespace Drupal\hkcec_fnb_revenue_report\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\hkcec_fnb_revenue_report\Service\DropFolderScanner;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Settings for drop-folder ingest.
 */
final class FnbRevenueSettingsForm extends ConfigFormBase {

  private DropFolderScanner $scanner;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    $instance = parent::create($container);
    $instance->scanner = $container->get('hkcec_fnb_revenue_report.drop_folder_scanner');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'hkcec_fnb_revenue_report_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['hkcec_fnb_revenue_report.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('hkcec_fnb_revenue_report.settings');
    $form['intro'] = [
      '#markup' => '<p>' . $this->t('Finance saves a daily PDF into a shared folder. Click <em>Scan drop folder now</em> (or wait for overnight cron) to put new files on the <a href=":calendar">F&amp;B Revenue Calendar</a>. The intranet does not copy the PDF; it only links to it. Full steps: Help → HKCEC F&amp;B Revenue Report.', [
        ':calendar' => '/finance/fnb-revenue-calendar',
      ]) . '</p>',
    ];
    $form['drop_folder_uri'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Drop folder URI'),
      '#default_value' => $config->get('drop_folder_uri'),
      '#description' => $this->t('Where the intranet looks for new PDFs. Keep <code>private://fnb-revenue</code> unless IT has mounted the J-drive somewhere else. This must stay under private files so only authorised people can download.'),
      '#required' => TRUE,
    ];
    $form['filename_pattern'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Filename date pattern'),
      '#default_value' => $config->get('filename_pattern'),
      '#description' => $this->t('How the date is written in the file name. Leave as <code>Y-m-d</code> so files like <code>2026-09-16.pdf</code> are picked up. Names that contain <code>20260916</code> or <code>2026-09-16</code> also work.'),
      '#required' => TRUE,
    ];
    $form['create_nodes_unpublished'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Create report nodes as unpublished'),
      '#description' => $this->t('Leave unticked so new PDFs appear on the calendar immediately. Tick only if someone must review each report before staff can see it.'),
      '#default_value' => (bool) $config->get('create_nodes_unpublished'),
    ];
    $form['actions']['scan_now'] = [
      '#type' => 'submit',
      '#value' => $this->t('Scan drop folder now'),
      '#submit' => ['::submitScanNow'],
      '#limit_validation_errors' => [],
      '#weight' => 20,
    ];
    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $this->config('hkcec_fnb_revenue_report.settings')
      ->set('drop_folder_uri', rtrim((string) $form_state->getValue('drop_folder_uri'), '/'))
      ->set('filename_pattern', (string) $form_state->getValue('filename_pattern'))
      ->set('create_nodes_unpublished', (bool) $form_state->getValue('create_nodes_unpublished'))
      ->save();
    parent::submitForm($form, $form_state);
  }

  /**
   * Manual scan submit.
   */
  public function submitScanNow(array &$form, FormStateInterface $form_state): void {
    $stats = $this->scanner->scan();
    $this->messenger()->addStatus($this->t('Scan finished. Created: @c, skipped: @s, errors: @e', [
      '@c' => $stats['created'],
      '@s' => $stats['skipped'],
      '@e' => $stats['errors'],
    ]));
  }

}
