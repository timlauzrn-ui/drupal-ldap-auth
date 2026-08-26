<?php

declare(strict_types=1);

namespace Drupal\department_access\EventSubscriber;

use Drupal\Core\Config\ConfigCrudEvent;
use Drupal\Core\Config\ConfigEvents;
use Drupal\department_access\Service\DepartmentFolderSync;
use Drupal\department_access\Service\DepartmentRoleEnsurer;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Re-sync roles and folders when department config is saved.
 */
final class DepartmentConfigSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly DepartmentRoleEnsurer $roleEnsurer,
    private readonly DepartmentFolderSync $folderSync,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [
      ConfigEvents::SAVE => 'onConfigSave',
    ];
  }

  /**
   * Sync when department_access.settings changes.
   */
  public function onConfigSave(ConfigCrudEvent $event): void {
    if ($event->getConfig()->getName() !== 'department_access.settings') {
      return;
    }
    $this->roleEnsurer->ensureRoles();
    $this->folderSync->sync();
  }

}
