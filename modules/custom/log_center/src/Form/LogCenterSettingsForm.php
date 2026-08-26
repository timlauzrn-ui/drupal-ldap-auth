<?php

declare(strict_types=1);

namespace Drupal\log_center\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Log Center settings (retention, access logging).
 */
final class LogCenterSettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'log_center_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['log_center.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('log_center.settings');
    $form['access_logging'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable access logging'),
      '#default_value' => (bool) $config->get('access_logging'),
      '#description' => $this->t('Record HTTP requests (IP, path, user agent, status).'),
    ];
    $form['retention_days'] = [
      '#type' => 'number',
      '#title' => $this->t('Retention (days)'),
      '#default_value' => (int) $config->get('retention_days'),
      '#min' => 1,
      '#max' => 3650,
      '#required' => TRUE,
      '#description' => $this->t('Cron deletes logs older than this many days. Default 90.'),
    ];
    $form['skip_path_prefixes'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Skip path prefixes'),
      '#default_value' => implode("\n", $config->get('skip_path_prefixes') ?? []),
      '#description' => $this->t('One prefix per line. Matching request paths are not written as Access logs.'),
    ];
    $form['skip_extensions'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Skip file extensions'),
      '#default_value' => implode(', ', $config->get('skip_extensions') ?? []),
      '#description' => $this->t('Comma-separated extensions (css, js, png, …).'),
    ];
    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $prefixes = preg_split('/\R+/', (string) $form_state->getValue('skip_path_prefixes')) ?: [];
    $prefixes = array_values(array_filter(array_map('trim', $prefixes)));
    $ext = array_values(array_filter(array_map('trim', explode(',', (string) $form_state->getValue('skip_extensions')))));
    $this->config('log_center.settings')
      ->set('access_logging', (bool) $form_state->getValue('access_logging'))
      ->set('retention_days', (int) $form_state->getValue('retention_days'))
      ->set('skip_path_prefixes', $prefixes)
      ->set('skip_extensions', $ext)
      ->save();
    parent::submitForm($form, $form_state);
  }

}
