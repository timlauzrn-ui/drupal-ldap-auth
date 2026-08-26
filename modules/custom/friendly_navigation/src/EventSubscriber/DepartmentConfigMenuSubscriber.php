<?php

declare(strict_types=1);

namespace Drupal\friendly_navigation\EventSubscriber;

use Drupal\Core\Config\ConfigCrudEvent;
use Drupal\Core\Config\ConfigEvents;
use Drupal\friendly_navigation\Service\DepartmentMenuSync;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Re-sync department menus when department_access settings change.
 */
final class DepartmentConfigMenuSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly DepartmentMenuSync $menuSync,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [ConfigEvents::SAVE => 'onSave'];
  }

  /**
   * Sync menus on department config save.
   */
  public function onSave(ConfigCrudEvent $event): void {
    if ($event->getConfig()->getName() !== 'department_access.settings') {
      return;
    }
    $this->menuSync->syncAll();
  }

}
