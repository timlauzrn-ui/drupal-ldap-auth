<?php

declare(strict_types=1);

namespace Drupal\hkcec_department_access\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\user\Entity\Role;
use Psr\Log\LoggerInterface;

/**
 * Ensures Drupal roles exist for each configured department.
 */
final class DepartmentRoleEnsurer {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly LoggerInterface $logger,
  ) {}

  /**
   * Create missing roles for all departments in config.
   */
  public function ensureRoles(): void {
    $departments = $this->configFactory->get('hkcec_department_access.settings')->get('departments') ?? [];
    foreach ($departments as $row) {
      $role_id = trim((string) ($row['role'] ?? ''));
      $label = (string) ($row['label'] ?? $role_id);
      if ($role_id === '' || !preg_match('/^[a-z0-9_]+$/', $role_id)) {
        continue;
      }
      if (Role::load($role_id)) {
        continue;
      }
      $role = Role::create([
        'id' => $role_id,
        'label' => $label,
      ]);
      $role->save();
      $this->logger->notice('Created department role @role.', ['@role' => $role_id]);
    }
  }

}
