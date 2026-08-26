<?php

declare(strict_types=1);

namespace Drupal\department_access\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountInterface;

/**
 * Resolves department membership for a user account.
 */
final class DepartmentResolver {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly EntityTypeManagerInterface $entityTypeManager,
  ) {}

  /**
   * All configured departments keyed by id.
   *
   * @return array<string, array{id: string, label: string, role: string, folder_name: string}>
   */
  public function getDepartments(): array {
    $list = $this->configFactory->get('department_access.settings')->get('departments') ?? [];
    $out = [];
    foreach ($list as $row) {
      $id = trim((string) ($row['id'] ?? ''));
      if ($id === '') {
        continue;
      }
      $out[$id] = [
        'id' => $id,
        'label' => (string) ($row['label'] ?? $id),
        'role' => (string) ($row['role'] ?? $id),
        'folder_name' => (string) ($row['folder_name'] ?? $row['label'] ?? $id),
      ];
    }
    return $out;
  }

  /**
   * Department IDs the account belongs to (via role).
   *
   * @return string[]
   */
  public function getUserDepartmentIds(AccountInterface $account): array {
    $roles = $account->getRoles();
    $ids = [];
    foreach ($this->getDepartments() as $id => $dept) {
      if (in_array($dept['role'], $roles, TRUE)) {
        $ids[] = $id;
      }
    }
    return $ids;
  }

  /**
   * Primary department ID when user has multiple (priority list, else first).
   */
  public function getPrimaryDepartmentId(AccountInterface $account): ?string {
    $ids = $this->getUserDepartmentIds($account);
    if ($ids === []) {
      return NULL;
    }
    if (count($ids) === 1) {
      return $ids[0];
    }
    $priority = $this->configFactory->get('department_access.settings')->get('primary_department_priority') ?? [];
    foreach ($priority as $pid) {
      if (in_array($pid, $ids, TRUE)) {
        return $pid;
      }
    }
    return $ids[0];
  }

  /**
   * Taxonomy term IDs for the user's allowed department folders.
   *
   * @return int[]
   */
  public function getUserFolderTermIds(AccountInterface $account): array {
    $ids = [];
    foreach ($this->getUserDepartmentIds($account) as $dept_id) {
      $tid = $this->getFolderTermIdForDepartment($dept_id);
      if ($tid !== NULL) {
        $ids[] = $tid;
      }
    }
    return $ids;
  }

  /**
   * Folder term ID for a department, if synced.
   */
  public function getFolderTermIdForDepartment(string $department_id): ?int {
    $depts = $this->getDepartments();
    if (!isset($depts[$department_id])) {
      return NULL;
    }
    $vocab = $this->getDirectoryVocabularyId();
    if ($vocab === NULL) {
      return NULL;
    }
    $folder_name = $depts[$department_id]['folder_name'];
    $terms = $this->entityTypeManager->getStorage('taxonomy_term')->loadByProperties([
      'vid' => $vocab,
      'name' => $folder_name,
    ]);
    if (!$terms) {
      return NULL;
    }
    $term = reset($terms);
    return (int) $term->id();
  }

  /**
   * Media directories vocabulary machine name from media_directories settings.
   */
  public function getDirectoryVocabularyId(): ?string {
    $vocab = $this->configFactory->get('media_directories.settings')->get('directory_taxonomy');
    return is_string($vocab) && $vocab !== '' ? $vocab : NULL;
  }

  /**
   * Whether the account may administer all media folders.
   */
  public function canAccessAllFolders(AccountInterface $account): bool {
    return $account->hasPermission('administer media')
      || $account->hasPermission('administer department access')
      || (int) $account->id() === 1;
  }

}
