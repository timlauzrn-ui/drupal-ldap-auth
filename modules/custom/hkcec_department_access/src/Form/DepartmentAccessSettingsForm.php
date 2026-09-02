<?php

declare(strict_types=1);

namespace Drupal\hkcec_department_access\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\hkcec_department_access\Service\DepartmentFolderSync;
use Drupal\hkcec_department_access\Service\DepartmentRoleEnsurer;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Admin UI for department ↔ role ↔ folder mappings.
 */
final class DepartmentAccessSettingsForm extends ConfigFormBase {

  private DepartmentRoleEnsurer $roleEnsurer;
  private DepartmentFolderSync $folderSync;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    $instance = parent::create($container);
    $instance->roleEnsurer = $container->get('hkcec_department_access.role_ensurer');
    $instance->folderSync = $container->get('hkcec_department_access.folder_sync');
    return $instance;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'hkcec_department_access_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['hkcec_department_access.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('hkcec_department_access.settings');
    $departments = $config->get('departments') ?? [];
    if ($form_state->get('departments') === NULL) {
      $form_state->set('departments', $departments);
    }
    $rows = $form_state->get('departments');

    $form['help'] = [
      '#markup' => '<p>' . $this->t('Each department gets a Drupal role (for LDAP mapping) and a media folder under <em>Root</em>. Members of that role can only browse/upload media in their folder.') . '</p>',
    ];

    $form['departments_wrapper'] = [
      '#type' => 'fieldset',
      '#title' => $this->t('Departments'),
      '#prefix' => '<div id="department-access-rows">',
      '#suffix' => '</div>',
      '#tree' => TRUE,
    ];

    $form['departments_wrapper']['departments'] = [
      '#type' => 'table',
      '#header' => [
        $this->t('Label'),
        $this->t('ID'),
        $this->t('Role'),
        $this->t('Folder name'),
        $this->t('Remove'),
      ],
      '#empty' => $this->t('No departments yet.'),
    ];

    foreach ($rows as $delta => $row) {
      // Label must come before machine_name "id" (Drupal MachineName source order).
      $form['departments_wrapper']['departments'][$delta]['label'] = [
        '#type' => 'textfield',
        '#default_value' => $row['label'] ?? '',
        '#required' => TRUE,
        '#size' => 20,
        '#id' => 'department-label-' . $delta,
      ];
      $form['departments_wrapper']['departments'][$delta]['id'] = [
        '#type' => 'machine_name',
        '#default_value' => $row['id'] ?? '',
        '#machine_name' => [
          'exists' => [static::class, 'machineNameExistsDummy'],
          'source' => ['departments_wrapper', 'departments', $delta, 'label'],
        ],
        '#required' => TRUE,
      ];
      if (!empty($row['id'])) {
        // Keep value on submit (disabled elements are omitted from input).
        $form['departments_wrapper']['departments'][$delta]['id']['#attributes']['readonly'] = 'readonly';
      }
      $form['departments_wrapper']['departments'][$delta]['role'] = [
        '#type' => 'textfield',
        '#default_value' => $row['role'] ?? ($row['id'] ?? ''),
        '#required' => TRUE,
        '#size' => 20,
        '#pattern' => '[a-z0-9_]+',
        '#attributes' => [
          'placeholder' => 'mis',
        ],
      ];
      $form['departments_wrapper']['departments'][$delta]['folder_name'] = [
        '#type' => 'textfield',
        '#default_value' => $row['folder_name'] ?? ($row['label'] ?? ''),
        '#required' => TRUE,
        '#size' => 20,
      ];
      $form['departments_wrapper']['departments'][$delta]['remove'] = [
        '#type' => 'checkbox',
        '#title' => $this->t('Remove'),
        '#title_display' => 'invisible',
      ];
    }

    $form['departments_wrapper']['actions'] = [
      '#type' => 'actions',
      'add' => [
        '#type' => 'submit',
        '#value' => $this->t('Add department'),
        '#submit' => ['::addRow'],
        '#ajax' => [
          'callback' => '::ajaxRebuild',
          'wrapper' => 'department-access-rows',
        ],
        '#limit_validation_errors' => [],
      ],
      'remove' => [
        '#type' => 'submit',
        '#value' => $this->t('Remove selected'),
        '#submit' => ['::removeRows'],
        '#ajax' => [
          'callback' => '::ajaxRebuild',
          'wrapper' => 'department-access-rows',
        ],
        '#limit_validation_errors' => [],
      ],
    ];

    $priority = $config->get('primary_department_priority') ?? [];
    $form['primary_department_priority'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Primary department priority'),
      '#description' => $this->t('Comma-separated department IDs used when a user has multiple department roles. First match wins.'),
      '#default_value' => implode(', ', $priority),
    ];

    $form['sync'] = [
      '#type' => 'submit',
      '#value' => $this->t('Save and sync folders/roles'),
      '#button_type' => 'primary',
    ];

    return $form;
  }

  /**
   * Machine name exists callback (always false — uniqueness checked on save).
   */
  public static function machineNameExistsDummy(string $value): bool {
    return FALSE;
  }

  /**
   * AJAX rebuild.
   */
  public function ajaxRebuild(array &$form, FormStateInterface $form_state): array {
    return $form['departments_wrapper'];
  }

  /**
   * Add empty row.
   */
  public function addRow(array &$form, FormStateInterface $form_state): void {
    $rows = $form_state->get('departments') ?? [];
    $rows[] = ['id' => '', 'label' => '', 'role' => '', 'folder_name' => ''];
    $form_state->set('departments', $rows);
    $form_state->setRebuild();
  }

  /**
   * Remove checked rows.
   */
  public function removeRows(array &$form, FormStateInterface $form_state): void {
    $input = $form_state->getUserInput();
    $current = $form_state->get('departments') ?? [];
    $submitted = $input['departments_wrapper']['departments'] ?? [];
    $kept = [];
    foreach ($current as $delta => $row) {
      if (empty($submitted[$delta]['remove'])) {
        $kept[] = [
          'id' => $submitted[$delta]['id'] ?? ($row['id'] ?? ''),
          'label' => $submitted[$delta]['label'] ?? ($row['label'] ?? ''),
          'role' => $submitted[$delta]['role'] ?? ($row['role'] ?? ''),
          'folder_name' => $submitted[$delta]['folder_name'] ?? ($row['folder_name'] ?? ''),
        ];
      }
    }
    $form_state->set('departments', $kept);
    $form_state->setRebuild();
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $rows = $form_state->getValue(['departments_wrapper', 'departments']) ?? [];
    $departments = [];
    foreach ($rows as $row) {
      if (!empty($row['remove'])) {
        continue;
      }
      $id = trim((string) ($row['id'] ?? ''));
      if ($id === '') {
        continue;
      }
      $departments[] = [
        'id' => $id,
        'label' => trim((string) ($row['label'] ?? $id)),
        'role' => trim((string) ($row['role'] ?? $id)),
        'folder_name' => trim((string) ($row['folder_name'] ?? $row['label'] ?? $id)),
      ];
    }

    $priority_raw = (string) $form_state->getValue('primary_department_priority');
    $priority = array_values(array_filter(array_map('trim', explode(',', $priority_raw))));

    $this->config('hkcec_department_access.settings')
      ->set('departments', $departments)
      ->set('primary_department_priority', $priority)
      ->save();

    $this->roleEnsurer->ensureRoles();
    $this->folderSync->sync();

    $form_state->set('departments', $departments);
    $this->messenger()->addStatus($this->t('Departments saved. Roles and media folders synced.'));
  }

}
