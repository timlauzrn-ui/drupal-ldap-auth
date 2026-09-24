<?php

declare(strict_types=1);

namespace Drupal\hkcec_gutenberg_modern_blocks;

use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\node\Entity\Node;
use Drupal\node\Entity\NodeType;
use Drupal\user\Entity\Role;

/**
 * Creates the intranet Gutenberg types, templates, and editor setup.
 *
 * Runs from install and update so a site that only enables this module gets
 * the same page types the setup scripts used to create. Existing nodes are
 * left as they are.
 */
final class IntranetSetup {

  /**
   * Ensure content types, Gutenberg settings, roles, and themes.
   */
  public static function ensure(): void {
    self::ensureBundles();
    self::ensureGutenberg();
    self::ensureReusablePatternField();
    self::ensurePatternCategories();
    self::ensurePermissions();
    self::ensureSampleNodes();
    self::ensureContentDisplay();
    self::ensureThemes();
  }

  /**
   * Origin-Gutenberg block list shared by the test page types.
   *
   * @return string[]
   */
  private static function coreBlocks(): array {
    return [
      'core/block',
      'core/pattern',
      'core/missing',
      'core/freeform',
      'core/paragraph',
      'core/heading',
      'core/list',
      'core/list-item',
      'core/image',
      'core/gallery',
      'core/file',
      'core/embed',
      'core/video',
      'core/audio',
      'core/cover',
      'core/buttons',
      'core/button',
      'core/columns',
      'core/column',
      'core/group',
      'core/media-text',
      'core/quote',
      'core/pullquote',
      'core/table',
      'core/separator',
      'core/spacer',
      'core/html',
      'core/code',
      'core/preformatted',
      'core/verse',
      'core/details',
      'core/text-columns',
      'core-embed/youtube',
      'core-embed/vimeo',
      'core-embed/twitter',
      'core-embed/facebook',
      'core-embed/instagram',
    ];
  }

  /**
   * Read a JSON or HTML file shipped inside this module.
   */
  private static function readData(string $filename): ?string {
    $path = \Drupal::service('extension.list.module')->getPath('hkcec_gutenberg_modern_blocks') . '/data/' . $filename;
    if (!is_readable($path)) {
      \Drupal::logger('hkcec_gutenberg_modern_blocks')->error('Missing setup file @file.', ['@file' => $filename]);
      return NULL;
    }
    $raw = file_get_contents($path);
    if ($raw === FALSE || $raw === '') {
      return NULL;
    }
    if (str_ends_with($filename, '.json')) {
      json_decode($raw);
      if (json_last_error() !== JSON_ERROR_NONE) {
        \Drupal::logger('hkcec_gutenberg_modern_blocks')->error('Invalid JSON in @file.', ['@file' => $filename]);
        return NULL;
      }
    }
    return $raw;
  }

  /**
   * Create the page bundles and body fields used by the intranet editor.
   */
  private static function ensureBundles(): void {
    $bundles = [
      'page' => [
        'name' => 'Basic page',
        'description' => 'Intranet landing and general pages.',
      ],
      'department_page' => [
        'name' => 'Department page',
        'description' => 'HR / Finance / MIS style content pages.',
      ],
      'department_page_test' => [
        'name' => 'Department page (test)',
        'description' => 'Same layout as Department page using origin Gutenberg blocks only.',
      ],
      'homepage_test' => [
        'name' => 'Homepage (test)',
        'description' => 'Same layout as Basic page using origin Gutenberg blocks only.',
      ],
    ];
    foreach ($bundles as $id => $info) {
      $type = NodeType::load($id);
      if (!$type) {
        $type = NodeType::create([
          'type' => $id,
          'name' => $info['name'],
          'description' => $info['description'],
          'new_revision' => TRUE,
          'display_submitted' => FALSE,
        ]);
        $type->save();
      }
      else {
        $type->setDisplaySubmitted(FALSE);
        $type->save();
      }
      self::ensureBody($id);
    }
  }

  /**
   * Attach the body field and hide author chrome on one bundle.
   */
  private static function ensureBody(string $bundle): void {
    if (!FieldStorageConfig::loadByName('node', 'body')) {
      FieldStorageConfig::create([
        'field_name' => 'body',
        'entity_type' => 'node',
        'type' => 'text_with_summary',
        'cardinality' => 1,
      ])->save();
    }
    if (!FieldConfig::loadByName('node', $bundle, 'body')) {
      FieldConfig::create([
        'field_name' => 'body',
        'entity_type' => 'node',
        'bundle' => $bundle,
        'label' => 'Body',
      ])->save();
    }
    $form = \Drupal::service('entity_display.repository')->getFormDisplay('node', $bundle, 'default');
    $form->setComponent('body', [
      'type' => 'text_textarea_with_summary',
      'weight' => 0,
    ])->save();
    $view = \Drupal::service('entity_display.repository')->getViewDisplay('node', $bundle, 'default');
    $view->setComponent('body', [
      'type' => 'text_default',
      'label' => 'hidden',
      'weight' => 0,
    ])->save();
  }

  /**
   * Write Gutenberg templates and allowlists, including the empty-array guards.
   */
  private static function ensureGutenberg(): void {
    if (!\Drupal::moduleHandler()->moduleExists('gutenberg')) {
      return;
    }
    $core = self::coreBlocks();
    $hkcec = [
      'hkcec/ad-slider',
      'hkcec/resource-grid',
      'hkcec/hot-news',
      'hkcec/page-intro',
      'hkcec/quick-nav',
      'hkcec/dept-layout',
      'hkcec/hero',
      'hkcec/feature-card',
    ];
    $full = array_values(array_unique(array_merge($hkcec, $core)));
    $config = \Drupal::configFactory()->getEditable('gutenberg.settings');

    $landing = self::readData('gutenberg-landing-page.json');
    if ($landing !== NULL) {
      $config->set('page_template', $landing);
    }
    $config->set('page_enable_full', TRUE);
    $config->set('page_template_lock', 'all');
    $config->set('page_allowed_blocks', $full);
    $config->set('page_allowed_drupal_blocks', []);
    $config->set('page_allowed_content_block_types', []);

    $department = self::readData('gutenberg-department-page.json');
    if ($department !== NULL) {
      $config->set('department_page_template', $department);
    }
    $config->set('department_page_enable_full', TRUE);
    $config->set('department_page_template_lock', 'all');
    $config->set('department_page_allowed_blocks', $full);
    $config->set('department_page_allowed_drupal_blocks', []);
    $config->set('department_page_allowed_content_block_types', []);

    $home_test = self::readData('gutenberg-homepage-test.json');
    if ($home_test !== NULL) {
      $config->set('homepage_test_template', $home_test);
    }
    $config->set('homepage_test_enable_full', TRUE);
    $config->set('homepage_test_template_lock', 'none');
    $config->set('homepage_test_allowed_blocks', $core);
    $config->set('homepage_test_allowed_drupal_blocks', []);
    $config->set('homepage_test_allowed_content_block_types', []);

    $dept_test = self::readData('gutenberg-department-page-test.json');
    if ($dept_test !== NULL) {
      $config->set('department_page_test_template', $dept_test);
    }
    $config->set('department_page_test_enable_full', TRUE);
    $config->set('department_page_test_template_lock', 'none');
    $config->set('department_page_test_allowed_blocks', $core);
    $config->set('department_page_test_allowed_drupal_blocks', []);
    $config->set('department_page_test_allowed_content_block_types', []);

    $config->save();
  }

  /**
   * Gutenberg reusable patterns cannot use a summary property.
   */
  private static function ensureReusablePatternField(): void {
    $body_field = \Drupal::configFactory()->getEditable('field.field.block_content.reusable_block.body');
    if (!$body_field || $body_field->get('field_type') !== 'text_with_summary') {
      return;
    }
    $body_field->set('field_type', 'text_long');
    $settings = $body_field->get('settings') ?: [];
    unset($settings['display_summary'], $settings['required_summary']);
    $settings['allowed_formats'] = ['plain_text'];
    $body_field->set('settings', $settings);
    $body_field->save();
  }

  /**
   * Seed pattern category terms when Gutenberg created an empty vocabulary.
   */
  private static function ensurePatternCategories(): void {
    if (!\Drupal::moduleHandler()->moduleExists('taxonomy')) {
      return;
    }
    $vocab = \Drupal::entityTypeManager()->getStorage('taxonomy_vocabulary')->load('pattern_categories');
    if (!$vocab) {
      return;
    }
    $storage = \Drupal::entityTypeManager()->getStorage('taxonomy_term');
    if ($storage->loadTree('pattern_categories')) {
      return;
    }
    foreach (['Featured', 'Text', 'Headers', 'Columns', 'Gallery', 'Call to action'] as $name) {
      $storage->create([
        'vid' => 'pattern_categories',
        'name' => $name,
      ])->save();
    }
  }

  /**
   * Editor role can write pages but cannot unlock a locked template.
   */
  private static function ensurePermissions(): void {
    if (!Role::load('editor')) {
      Role::create([
        'id' => 'editor',
        'label' => 'Editor',
      ])->save();
    }
    $editor = [
      'access content',
      'create page content',
      'edit own page content',
      'edit any page content',
      'create department_page content',
      'edit own department_page content',
      'edit any department_page content',
      'create department_page_test content',
      'edit own department_page_test content',
      'edit any department_page_test content',
      'create homepage_test content',
      'edit own homepage_test content',
      'edit any homepage_test content',
      'use gutenberg',
      'use text format gutenberg',
      'access media overview',
      'create media',
      'update media',
      'view media',
      'create image media',
      'create document media',
      'edit own image media',
      'edit own document media',
    ];
    self::grant('editor', $editor);
    self::revoke('editor', ['unlock gutenberg template']);
    self::grant('administrator', [
      'unlock gutenberg template',
      'use gutenberg',
      'use text format gutenberg',
      'create department_page content',
      'edit any department_page content',
      'edit own department_page content',
      'delete any department_page content',
      'delete own department_page content',
      'create department_page_test content',
      'edit any department_page_test content',
      'edit own department_page_test content',
      'delete any department_page_test content',
      'delete own department_page_test content',
      'create homepage_test content',
      'edit any homepage_test content',
      'edit own homepage_test content',
      'delete any homepage_test content',
      'delete own homepage_test content',
    ]);
  }

  /**
   * Grant permissions that exist on this site.
   *
   * @param string[] $permissions
   */
  private static function grant(string $role_id, array $permissions): void {
    $role = Role::load($role_id);
    if (!$role || $role->isAdmin()) {
      return;
    }
    $available = array_keys(\Drupal::service('user.permissions')->getPermissions());
    foreach ($permissions as $permission) {
      if (in_array($permission, $available, TRUE)) {
        $role->grantPermission($permission);
      }
    }
    $role->save();
  }

  /**
   * @param string[] $permissions
   */
  private static function revoke(string $role_id, array $permissions): void {
    $role = Role::load($role_id);
    if (!$role || $role->isAdmin()) {
      return;
    }
    foreach ($permissions as $permission) {
      $role->revokePermission($permission);
    }
    $role->save();
  }

  /**
   * Create the starter pages only when that title is not already present.
   */
  private static function ensureSampleNodes(): void {
    $samples = [
      [
        'type' => 'homepage_test',
        'title' => 'Homepage test',
        'file' => 'gutenberg-homepage-test.html',
        'fallback' => '<p>HKCEC Intranet</p>',
        'match_title' => TRUE,
      ],
      [
        'type' => 'department_page_test',
        'title' => 'Department page test',
        'file' => 'gutenberg-department-page-test.html',
        'fallback' => '<p>Department name</p>',
        'match_title' => FALSE,
      ],
    ];
    foreach ($samples as $sample) {
      $query = \Drupal::entityQuery('node')
        ->accessCheck(FALSE)
        ->condition('type', $sample['type'])
        ->range(0, 1);
      if ($sample['match_title']) {
        $query->condition('title', $sample['title']);
      }
      $existing = $query->execute();
      if ($existing) {
        continue;
      }
      $html = self::readData($sample['file']) ?: $sample['fallback'];
      $node = Node::create([
        'type' => $sample['type'],
        'title' => $sample['title'],
        'uid' => 1,
        'status' => 1,
        'promote' => 0,
        'body' => [
          'value' => $html,
          'format' => 'gutenberg',
        ],
      ]);
      $node->save();
    }
    self::ensurePathautoPattern('friendly_homepage_test', 'Friendly homepage test', 'homepage_test');
    self::ensurePathautoPattern('friendly_department_page_test', 'Friendly department page test', 'department_page_test');
  }

  /**
   * Add a pathauto pattern when Pathauto is installed and the pattern is new.
   */
  private static function ensurePathautoPattern(string $id, string $label, string $bundle): void {
    if (!class_exists('Drupal\\pathauto\\Entity\\PathautoPattern')) {
      return;
    }
    try {
      $class = 'Drupal\\pathauto\\Entity\\PathautoPattern';
      if ($class::load($id)) {
        return;
      }
      $entity = $class::create([
        'id' => $id,
        'label' => $label,
        'type' => 'canonical_entities:node',
        'pattern' => '[node:title]',
        'weight' => -10,
      ]);
      $entity->addSelectionCondition([
        'id' => 'entity_bundle:node',
        'bundles' => [$bundle => $bundle],
        'negate' => FALSE,
        'context_mapping' => ['node' => 'node'],
      ]);
      $entity->save();
    }
    catch (\Throwable $e) {
      \Drupal::logger('hkcec_gutenberg_modern_blocks')->warning('Pathauto pattern @id was not created: @msg', [
        '@id' => $id,
        '@msg' => $e->getMessage(),
      ]);
    }
  }

  /**
   * Hide the node title, author, and date on the intranet page types.
   */
  private static function ensureContentDisplay(): void {
    foreach (['page', 'department_page', 'department_page_test', 'homepage_test'] as $bundle) {
      if (!NodeType::load($bundle)) {
        continue;
      }
      $view = \Drupal::service('entity_display.repository')->getViewDisplay('node', $bundle, 'default');
      foreach (['title', 'uid', 'created', 'links'] as $field) {
        $view->removeComponent($field);
      }
      foreach ($view->getComponents() as $name => $component) {
        $component['label'] = 'hidden';
        $view->setComponent($name, $component);
      }
      $view->save();
    }
  }

  /**
   * Use Bootstrap 5 and Gin when those themes are already in the codebase.
   */
  private static function ensureThemes(): void {
    try {
      $handler = \Drupal::service('theme_handler');
      $data = $handler->rebuildThemeData();
      $installer = \Drupal::service('theme_installer');
      foreach (['bootstrap5', 'gin'] as $theme) {
        if (isset($data[$theme]) && empty($data[$theme]->status)) {
          $installer->install([$theme]);
        }
      }
      $config = \Drupal::configFactory()->getEditable('system.theme');
      $changed = FALSE;
      if ($handler->themeExists('bootstrap5') && $config->get('default') !== 'bootstrap5') {
        $config->set('default', 'bootstrap5');
        $changed = TRUE;
      }
      if ($handler->themeExists('gin') && $config->get('admin') !== 'gin') {
        $config->set('admin', 'gin');
        $changed = TRUE;
      }
      if ($changed) {
        $config->save();
      }
      if (\Drupal::service('extension.list.module')->exists('gin_toolbar') && !\Drupal::moduleHandler()->moduleExists('gin_toolbar')) {
        \Drupal::service('module_installer')->install(['gin_toolbar'], TRUE);
      }
      self::ensureBootstrapBlocks();
    }
    catch (\Throwable $e) {
      \Drupal::logger('hkcec_gutenberg_modern_blocks')->warning('Theme setup skipped: @msg', [
        '@msg' => $e->getMessage(),
      ]);
    }
  }

  /**
   * Place the main menu, account menu, and page content in Bootstrap 5.
   */
  private static function ensureBootstrapBlocks(): void {
    if (!\Drupal::service('theme_handler')->themeExists('bootstrap5')) {
      return;
    }
    $storage = \Drupal::entityTypeManager()->getStorage('block');
    $placements = [
      ['id' => 'bootstrap5_main_menu', 'plugin' => 'system_menu_block:main', 'region' => 'nav_main', 'weight' => 0],
      ['id' => 'bootstrap5_account_menu', 'plugin' => 'system_menu_block:account', 'region' => 'nav_additional', 'weight' => 0],
      ['id' => 'bootstrap5_branding', 'plugin' => 'system_branding_block', 'region' => 'nav_branding', 'weight' => 0],
      ['id' => 'bootstrap5_messages', 'plugin' => 'system_messages_block', 'region' => 'content', 'weight' => -10],
      ['id' => 'bootstrap5_content', 'plugin' => 'system_main_block', 'region' => 'content', 'weight' => 0],
      ['id' => 'bootstrap5_local_tasks', 'plugin' => 'local_tasks_block', 'region' => 'content', 'weight' => -5],
      ['id' => 'bootstrap5_local_actions', 'plugin' => 'local_actions_block', 'region' => 'content', 'weight' => -6],
    ];
    foreach ($placements as $placement) {
      $block = $storage->load($placement['id']);
      if (!$block) {
        $block = $storage->create([
          'id' => $placement['id'],
          'plugin' => $placement['plugin'],
          'theme' => 'bootstrap5',
          'region' => $placement['region'],
          'weight' => $placement['weight'],
          'settings' => [
            'label' => $placement['id'],
            'label_display' => '0',
          ],
        ]);
      }
      $block->set('theme', 'bootstrap5');
      $block->setRegion($placement['region']);
      $block->setWeight($placement['weight']);
      $block->setStatus(TRUE);
      $block->save();
    }
  }

}
