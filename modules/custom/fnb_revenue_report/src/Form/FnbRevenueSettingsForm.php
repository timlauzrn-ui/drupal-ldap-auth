<?php

declare(strict_types=1);

namespace Drupal\fnb_revenue_report\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\fnb_revenue_report\Service\DropFolderScanner;
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
    $instance->scanner = $container->get('fnb_revenue_report.drop_folder_scanner');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'fnb_revenue_report_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['fnb_revenue_report.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('fnb_revenue_report.settings');
    $form['drop_folder_uri'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Drop folder URI'),
      '#default_value' => $config->get('drop_folder_uri'),
      '#description' => $this->t('Must resolve under the private files path (J-drive mount). Example: private://fnb-revenue'),
      '#required' => TRUE,
    ];
    $form['filename_pattern'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Filename date pattern'),
      '#default_value' => $config->get('filename_pattern'),
      '#description' => $this->t('PHP date() pattern for the PDF stem. Default <code>Y-m-d</code> matches <code>2026-08-25.pdf</code>. Also accepts YYYYMMDD in the name.'),
      '#required' => TRUE,
    ];
    $form['create_nodes_unpublished'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Create report nodes as unpublished'),
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
    $this->config('fnb_revenue_report.settings')
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
