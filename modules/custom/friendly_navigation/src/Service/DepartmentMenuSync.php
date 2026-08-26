<?php

declare(strict_types=1);

namespace Drupal\friendly_navigation\Service;

use Drupal\block\Entity\Block;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Logger\LoggerChannelInterface;
use Drupal\department_access\Service\DepartmentResolver;
use Drupal\system\Entity\Menu;

/**
 * Ensures public starter links and per-department menus + blocks.
 */
final class DepartmentMenuSync {

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly LoggerChannelInterface $logger,
    private readonly DepartmentResolver $departmentResolver,
  ) {}

  /**
   * Sync Main starter links and all department menus/blocks.
   */
  public function syncAll(): void {
    $this->ensureMainMenuStarters();
    foreach ($this->departmentResolver->getDepartments() as $dept) {
      $this->ensureDepartmentMenu($dept);
      $this->ensureDepartmentMenuBlock($dept);
    }
  }

  /**
   * Menu machine name for a department id.
   */
  public function menuIdForDepartment(string $department_id): string {
    return 'dept_' . preg_replace('/[^a-z0-9_]+/', '_', strtolower($department_id));
  }

  /**
   * Ensure Main menu has Home / About / News placeholders.
   */
  public function ensureMainMenuStarters(): void {
    $storage = $this->entityTypeManager->getStorage('menu_link_content');
    $starters = [
      ['title' => 'Home', 'uri' => 'internal:/', 'weight' => -50],
      ['title' => 'About', 'uri' => 'internal:/about', 'weight' => -40],
      ['title' => 'News', 'uri' => 'internal:/news', 'weight' => -30],
    ];
    foreach ($starters as $item) {
      $existing = $storage->loadByProperties([
        'menu_name' => 'main',
        'title' => $item['title'],
        'link.uri' => $item['uri'],
      ]);
      if ($existing) {
        continue;
      }
      // Also skip if same title already in main.
      $by_title = $storage->loadByProperties([
        'menu_name' => 'main',
        'title' => $item['title'],
      ]);
      if ($by_title) {
        continue;
      }
      $link = $storage->create([
        'title' => $item['title'],
        'link' => ['uri' => $item['uri']],
        'menu_name' => 'main',
        'weight' => $item['weight'],
        'enabled' => TRUE,
      ]);
      $link->save();
      $this->logger->notice('Added Main menu starter: @t', ['@t' => $item['title']]);
    }
  }

  /**
   * Create department menu if missing.
   *
   * @param array{id: string, label: string, role: string, folder_name: string} $dept
   */
  public function ensureDepartmentMenu(array $dept): void {
    $menu_id = $this->menuIdForDepartment($dept['id']);
    if (!Menu::load($menu_id)) {
      Menu::create([
        'id' => $menu_id,
        'label' => $dept['label'] . ' menu',
        'description' => 'Navigation for ' . $dept['label'] . ' department members.',
      ])->save();
      $this->logger->notice('Created menu @id', ['@id' => $menu_id]);
    }

    // Starter home link inside department menu.
    $storage = $this->entityTypeManager->getStorage('menu_link_content');
    $title = $dept['label'] . ' home';
    $existing = $storage->loadByProperties([
      'menu_name' => $menu_id,
      'title' => $title,
    ]);
    if (!$existing) {
      $storage->create([
        'title' => $title,
        'link' => ['uri' => 'internal:/'],
        'menu_name' => $menu_id,
        'weight' => -50,
        'enabled' => TRUE,
      ])->save();
    }
  }

  /**
   * Place department menu block with role visibility.
   *
   * @param array{id: string, label: string, role: string, folder_name: string} $dept
   */
  public function ensureDepartmentMenuBlock(array $dept): void {
    $menu_id = $this->menuIdForDepartment($dept['id']);
    $block_id = 'friendly_nav_' . $menu_id;
    $theme = $this->configFactory->get('system.theme')->get('default') ?: 'olivero';

    $block = Block::load($block_id);
    $roles = [$dept['role'], 'administrator'];
    $visibility = [
      'user_role' => [
        'id' => 'user_role',
        'negate' => FALSE,
        'context_mapping' => ['user' => '@user.current_user_context:current_user'],
        'roles' => array_combine($roles, $roles),
      ],
    ];

    if (!$block) {
      $block = Block::create([
        'id' => $block_id,
        'theme' => $theme,
        'region' => $this->pickSecondaryRegion($theme),
        'weight' => -10,
        'plugin' => 'system_menu_block:' . $menu_id,
        'settings' => [
          'id' => 'system_menu_block:' . $menu_id,
          'label' => $dept['label'] . ' navigation',
          'label_display' => 'visible',
          'provider' => 'system',
          'level' => 1,
          'depth' => 0,
          'expand_all_items' => FALSE,
        ],
        'visibility' => $visibility,
      ]);
      $block->save();
      $this->logger->notice('Created block @id in theme @theme', [
        '@id' => $block_id,
        '@theme' => $theme,
      ]);
      return;
    }

    // Keep visibility in sync.
    $block->setVisibilityConfig('user_role', $visibility['user_role']);
    $block->save();
  }

  /**
   * Prefer a region under the main header for second nav.
   */
  private function pickSecondaryRegion(string $theme): string {
    $candidates = [
      'secondary_menu',
      'breadcrumb',
      'highlighted',
      'content_above',
      'sidebar_first',
      'content',
    ];
    // Without theme region introspection dependency, use safe defaults.
    if (str_contains($theme, 'olivero')) {
      return 'secondary_menu';
    }
    if (str_contains($theme, 'claro') || str_contains($theme, 'gin')) {
      return 'content';
    }
    return 'sidebar_first';
  }

  /**
   * Menus an account may add pages to (main + their departments; admins all).
   *
   * @return array<string, string>
   *   menu_id => label
   */
  public function getMenusForAccount(\Drupal\Core\Session\AccountInterface $account): array {
    $options = [
      'main' => (string) t('Main menu (public)'),
    ];
    $depts = $this->departmentResolver->getDepartments();
    $all = $this->departmentResolver->canAccessAllFolders($account)
      || $account->hasPermission('administer menu');
    foreach ($depts as $dept) {
      if ($all || in_array($dept['role'], $account->getRoles(), TRUE)) {
        $mid = $this->menuIdForDepartment($dept['id']);
        $options[$mid] = $dept['label'] . ' menu';
      }
    }
    return $options;
  }

}
