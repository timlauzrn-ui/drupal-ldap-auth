<?php

declare(strict_types=1);

namespace Drupal\department_access\Service;

use Drupal\Core\Session\AccountInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\media\MediaInterface;

/**
 * Access helpers for department-scoped media.
 */
final class DepartmentMediaAccess {

  public function __construct(
    private readonly DepartmentResolver $resolver,
    private readonly AccountProxyInterface $currentUser,
  ) {}

  /**
   * Whether account may view/update media in its directory.
   */
  public function accountMayAccessMedia(MediaInterface $media, AccountInterface $account, string $operation = 'view'): bool {
    if ($this->resolver->canAccessAllFolders($account)) {
      return TRUE;
    }
    $tid = $this->getMediaDirectoryTid($media);
    if ($tid === NULL) {
      // Unfiled media: only owner or admins (admins already returned).
      return (int) $media->getOwnerId() === (int) $account->id();
    }
    $allowed = $this->resolver->getUserFolderTermIds($account);
    return in_array($tid, $allowed, TRUE);
  }

  /**
   * Directory term ID on a media entity, if set.
   */
  public function getMediaDirectoryTid(MediaInterface $media): ?int {
    if (!$media->hasField('directory') || $media->get('directory')->isEmpty()) {
      return NULL;
    }
    $tid = (int) $media->get('directory')->target_id;
    return $tid > 0 ? $tid : NULL;
  }

  /**
   * Auto-assign directory from the current user's primary department.
   */
  public function assignDirectoryFromCurrentUser(MediaInterface $media): void {
    $account = $this->currentUser;
    if ($this->resolver->canAccessAllFolders($account)) {
      // Admins may set folder manually; only fill if empty.
      if (!$media->get('directory')->isEmpty()) {
        return;
      }
    }
    $dept_id = $this->resolver->getPrimaryDepartmentId($account);
    if ($dept_id === NULL) {
      return;
    }
    $tid = $this->resolver->getFolderTermIdForDepartment($dept_id);
    if ($tid === NULL) {
      return;
    }
    // Non-admins always forced into their department folder.
    if (!$this->resolver->canAccessAllFolders($account) || $media->get('directory')->isEmpty()) {
      $media->set('directory', ['target_id' => $tid]);
    }
  }

}
