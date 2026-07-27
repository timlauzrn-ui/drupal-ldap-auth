<?php

declare(strict_types=1);

namespace Drupal\ldap_role_mapper\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\user\Entity\Role;

/**
 * Admin settings for LDAP group to Drupal role mappings.
 */
final class LdapRoleMapperSettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'ldap_role_mapper_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['ldap_role_mapper.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('ldap_role_mapper.settings');
    $mappings = $config->get('mappings') ?? [];

    if ($form_state->get('mappings') === NULL) {
      $form_state->set('mappings', $mappings);
    }
    $rows = $form_state->get('mappings');

    $role_options = $this->getAssignableRoleOptions();

    $form['description'] = [
      '#markup' => '<p>' . $this->t('On every LDAP login, Drupal roles are replaced with roles mapped from the user’s LDAP/AD groups. Manually assigned roles are overwritten. The <em>authenticated</em> role is always kept. Protected roles (default: <em>administrator</em>) are never removed.') . '</p>',
    ];

    $form['mappings_wrapper'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Group to role mappings'),
      '#prefix' => '<div id="ldap-role-mapper-mappings-wrapper">',
      '#suffix' => '</div>',
      '#tree' => TRUE,
    ];

    $form['mappings_wrapper']['mappings'] = [
      '#type' => 'table',
      '#header' => [
        $this->t('LDAP group (CN or DN)'),
        $this->t('Drupal role'),
        $this->t('Remove'),
      ],
      '#empty' => $this->t('No mappings yet. Add a row for each LDAP group.'),
    ];

    foreach ($rows as $delta => $row) {
      $form['mappings_wrapper']['mappings'][$delta]['ldap_group'] = [
        '#type' => 'textfield',
        '#default_value' => $row['ldap_group'] ?? '',
        '#size' => 40,
        '#required' => TRUE,
        '#attributes' => [
          'placeholder' => 'Intranet-Editors or CN=Intranet-Editors,OU=Groups,DC=example,DC=com',
        ],
      ];
      $form['mappings_wrapper']['mappings'][$delta]['rid'] = [
        '#type' => 'select',
        '#options' => $role_options,
        '#default_value' => $row['rid'] ?? '',
        '#required' => TRUE,
      ];
      $form['mappings_wrapper']['mappings'][$delta]['remove'] = [
        '#type' => 'checkbox',
        '#title' => $this->t('Remove'),
        '#title_display' => 'invisible',
      ];
    }

    $form['mappings_wrapper']['actions'] = [
      '#type' => 'actions',
    ];
    $form['mappings_wrapper']['actions']['add'] = [
      '#type' => 'submit',
      '#value' => $this->t('Add mapping'),
      '#submit' => ['::addMapping'],
      '#ajax' => [
        'callback' => '::ajaxRebuildMappings',
        'wrapper' => 'ldap-role-mapper-mappings-wrapper',
      ],
      '#limit_validation_errors' => [],
    ];
    $form['mappings_wrapper']['actions']['remove_selected'] = [
      '#type' => 'submit',
      '#value' => $this->t('Remove selected'),
      '#submit' => ['::removeMappings'],
      '#ajax' => [
        'callback' => '::ajaxRebuildMappings',
        'wrapper' => 'ldap-role-mapper-mappings-wrapper',
      ],
      '#limit_validation_errors' => [],
    ];

    $protected = $config->get('protected_roles') ?? ['administrator'];
    $form['protected_roles'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Protected role IDs'),
      '#description' => $this->t('Comma-separated role IDs that the mapper will never remove. Example: administrator'),
      '#default_value' => implode(', ', $protected),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * AJAX callback to rebuild the mappings table.
   */
  public function ajaxRebuildMappings(array &$form, FormStateInterface $form_state): array {
    return $form['mappings_wrapper'];
  }

  /**
   * Submit handler: add an empty mapping row.
   */
  public function addMapping(array &$form, FormStateInterface $form_state): void {
    $rows = $form_state->get('mappings') ?? [];
    $rows[] = ['ldap_group' => '', 'rid' => ''];
    $form_state->set('mappings', $rows);
    $form_state->setRebuild();
  }

  /**
   * Submit handler: remove checked mapping rows.
   */
  public function removeMappings(array &$form, FormStateInterface $form_state): void {
    $input = $form_state->getUserInput();
    $current = $form_state->get('mappings') ?? [];
    $submitted = $input['mappings_wrapper']['mappings'] ?? [];
    $kept = [];
    foreach ($current as $delta => $row) {
      if (empty($submitted[$delta]['remove'])) {
        $kept[] = [
          'ldap_group' => $submitted[$delta]['ldap_group'] ?? ($row['ldap_group'] ?? ''),
          'rid' => $submitted[$delta]['rid'] ?? ($row['rid'] ?? ''),
        ];
      }
    }
    $form_state->set('mappings', $kept);
    $form_state->setRebuild();
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state): void {
    parent::validateForm($form, $form_state);
    $trigger = $form_state->getTriggeringElement();
    if (($trigger['#value'] ?? NULL) !== $this->t('Save configuration')) {
      return;
    }

    $rows = $form_state->getValue(['mappings_wrapper', 'mappings']) ?? [];
    $role_options = $this->getAssignableRoleOptions();
    foreach ($rows as $delta => $row) {
      if (!empty($row['remove'])) {
        continue;
      }
      $group = trim((string) ($row['ldap_group'] ?? ''));
      $rid = (string) ($row['rid'] ?? '');
      if ($group === '') {
        $form_state->setErrorByName("mappings_wrapper][mappings][$delta][ldap_group", $this->t('LDAP group is required.'));
      }
      if ($rid === '' || !isset($role_options[$rid])) {
        $form_state->setErrorByName("mappings_wrapper][mappings][$delta][rid", $this->t('Select a valid Drupal role.'));
      }
    }
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $rows = $form_state->getValue(['mappings_wrapper', 'mappings']) ?? [];
    $mappings = [];
    foreach ($rows as $row) {
      if (!empty($row['remove'])) {
        continue;
      }
      $group = trim((string) ($row['ldap_group'] ?? ''));
      $rid = (string) ($row['rid'] ?? '');
      if ($group === '' || $rid === '') {
        continue;
      }
      $mappings[] = [
        'ldap_group' => $group,
        'rid' => $rid,
      ];
    }

    $protected_raw = (string) $form_state->getValue('protected_roles');
    $protected = array_values(array_filter(array_map('trim', explode(',', $protected_raw))));
    if (!in_array('administrator', $protected, TRUE)) {
      $protected[] = 'administrator';
    }

    $this->config('ldap_role_mapper.settings')
      ->set('mappings', $mappings)
      ->set('protected_roles', $protected)
      ->save();

    $form_state->set('mappings', $mappings);
    parent::submitForm($form, $form_state);
  }

  /**
   * Roles that may be assigned by the mapper (excludes authenticated/anonymous).
   *
   * @return array<string, string>
   *   Role ID => label.
   */
  private function getAssignableRoleOptions(): array {
    $options = [];
    foreach (Role::loadMultiple() as $role) {
      $id = $role->id();
      if (in_array($id, ['anonymous', 'authenticated'], TRUE)) {
        continue;
      }
      $options[$id] = $role->label() . " ($id)";
    }
    return $options;
  }

}
