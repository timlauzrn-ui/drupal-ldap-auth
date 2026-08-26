<?php

declare(strict_types=1);

namespace Drupal\department_access\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\taxonomy\TermInterface;
use Psr\Log\LoggerInterface;

/**
 * Syncs Root > {Department} taxonomy terms for media_directories.
 */
final class DepartmentFolderSync {

  public const VOCABULARY_ID = 'media_directory';
  public const ROOT_NAME = 'Root';

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly LoggerInterface $logger,
  ) {}

  /**
   * Ensure vocabulary, media_directories config, Root term, and department folders.
   */
  public function sync(): void {
    $this->ensureVocabulary();
    $this->ensureMediaDirectoriesConfig();
    $root = $this->ensureRootTerm();
    $departments = $this->configFactory->get('department_access.settings')->get('departments') ?? [];
    foreach ($departments as $row) {
      $folder = trim((string) ($row['folder_name'] ?? $row['label'] ?? ''));
      if ($folder === '') {
        continue;
      }
      $this->ensureChildFolder($root, $folder);
    }
  }

  /**
   * Create media_directory vocabulary if missing.
   */
  private function ensureVocabulary(): void {
    if (Vocabulary::load(self::VOCABULARY_ID)) {
      return;
    }
    Vocabulary::create([
      'vid' => self::VOCABULARY_ID,
      'name' => 'Media directory',
      'description' => 'Department media folders (Root > Department).',
      'hierarchy' => 1,
    ])->save();
    $this->logger->notice('Created vocabulary @vid.', ['@vid' => self::VOCABULARY_ID]);
  }

  /**
   * Point media_directories at our vocabulary.
   */
  private function ensureMediaDirectoriesConfig(): void {
    $config = $this->configFactory->getEditable('media_directories.settings');
    if ($config->get('directory_taxonomy') !== self::VOCABULARY_ID) {
      $config->set('directory_taxonomy', self::VOCABULARY_ID)->save();
      $this->logger->notice('Configured media_directories vocabulary @vid.', ['@vid' => self::VOCABULARY_ID]);
    }
  }

  /**
   * Ensure top-level Root term.
   */
  private function ensureRootTerm(): TermInterface {
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $existing = $storage->loadByProperties([
      'vid' => self::VOCABULARY_ID,
      'name' => self::ROOT_NAME,
      'parent' => [0],
    ]);
    if ($existing) {
      return reset($existing);
    }
    // Also accept any Root regardless of parent load quirks.
    $by_name = $storage->loadByProperties([
      'vid' => self::VOCABULARY_ID,
      'name' => self::ROOT_NAME,
    ]);
    if ($by_name) {
      return reset($by_name);
    }
    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = $storage->create([
      'vid' => self::VOCABULARY_ID,
      'name' => self::ROOT_NAME,
      'parent' => [0],
    ]);
    $term->save();
    $this->logger->notice('Created media folder Root.');
    return $term;
  }

  /**
   * Ensure a department folder under Root.
   */
  private function ensureChildFolder(TermInterface $root, string $folder_name): TermInterface {
    $storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $children = $storage->loadByProperties([
      'vid' => self::VOCABULARY_ID,
      'name' => $folder_name,
      'parent' => [$root->id()],
    ]);
    if ($children) {
      return reset($children);
    }
    // Fallback: same name anywhere in vocab (avoid duplicates).
    $any = $storage->loadByProperties([
      'vid' => self::VOCABULARY_ID,
      'name' => $folder_name,
    ]);
    if ($any) {
      $term = reset($any);
      $term->set('parent', [$root->id()]);
      $term->save();
      return $term;
    }
    /** @var \Drupal\taxonomy\TermInterface $term */
    $term = $storage->create([
      'vid' => self::VOCABULARY_ID,
      'name' => $folder_name,
      'parent' => [$root->id()],
    ]);
    $term->save();
    $this->logger->notice('Created media folder Root > @folder.', ['@folder' => $folder_name]);
    return $term;
  }

}
