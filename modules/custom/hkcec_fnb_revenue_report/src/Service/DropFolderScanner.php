<?php

declare(strict_types=1);

namespace Drupal\hkcec_fnb_revenue_report\Service;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\file\FileInterface;
use Drupal\node\NodeInterface;
use Psr\Log\LoggerInterface;

/**
 * Scans the mounted drop folder and creates report nodes without copying files.
 */
final class DropFolderScanner {

  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly FileSystemInterface $fileSystem,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly TimeInterface $time,
    private readonly LoggerInterface $logger,
    private readonly AccountProxyInterface $currentUser,
  ) {}

  /**
   * Scan drop folder and ingest new PDFs.
   *
   * @return array{created: int, skipped: int, errors: int}
   */
  public function scan(): array {
    $config = $this->configFactory->get('hkcec_fnb_revenue_report.settings');
    $folder_uri = rtrim((string) ($config->get('drop_folder_uri') ?: 'private://fnb-revenue'), '/');
    $pattern = (string) ($config->get('filename_pattern') ?: 'Y-m-d');
    $unpublished = (bool) $config->get('create_nodes_unpublished');

    $stats = ['created' => 0, 'skipped' => 0, 'errors' => 0];

    try {
      $this->fileSystem->prepareDirectory(
        $folder_uri,
        FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS
      );
    }
    catch (\Throwable $e) {
      $this->logger->error('Drop folder unavailable (@uri): @msg', [
        '@uri' => $folder_uri,
        '@msg' => $e->getMessage(),
      ]);
      $stats['errors']++;
      return $stats;
    }

    $realpath = $this->fileSystem->realpath($folder_uri);
    if (!$realpath || !is_dir($realpath)) {
      $this->logger->warning('Drop folder realpath missing for @uri', ['@uri' => $folder_uri]);
      $stats['errors']++;
      return $stats;
    }

    $files = glob($realpath . '/*.pdf') ?: [];
    foreach ($files as $abs) {
      $basename = basename($abs);
      try {
        $date = $this->parseDateFromFilename($basename, $pattern);
        if ($date === NULL) {
          $this->logger->notice('Skipping @file: filename does not match pattern @pattern.pdf', [
            '@file' => $basename,
            '@pattern' => $pattern,
          ]);
          $stats['skipped']++;
          continue;
        }
        if ($this->findNodeByFilename($basename) || $this->findNodeByDate($date)) {
          $stats['skipped']++;
          continue;
        }
        $this->createReportNode($folder_uri . '/' . $basename, $basename, $date, $unpublished);
        $stats['created']++;
      }
      catch (\Throwable $e) {
        $stats['errors']++;
        $this->logger->error('Failed ingesting @file: @msg', [
          '@file' => $basename,
          '@msg' => $e->getMessage(),
        ]);
      }
    }

    $this->logger->info('F&B drop-folder scan complete: created=@c skipped=@s errors=@e', [
      '@c' => $stats['created'],
      '@s' => $stats['skipped'],
      '@e' => $stats['errors'],
    ]);
    return $stats;
  }

  /**
   * Parse YYYY-MM-DD (or custom date pattern) from filename stem.
   */
  private function parseDateFromFilename(string $basename, string $pattern): ?string {
    if (!preg_match('/^(.+)\.pdf$/i', $basename, $m)) {
      return NULL;
    }
    $stem = $m[1];
    // Accept exact pattern match via DateTime::createFromFormat.
    $dt = \DateTimeImmutable::createFromFormat('!' . $pattern, $stem);
    if ($dt instanceof \DateTimeImmutable) {
      $errors = \DateTimeImmutable::getLastErrors();
      if (empty($errors['warning_count']) && empty($errors['error_count'])) {
        return $dt->format('Y-m-d');
      }
    }
    // Fallback: YYYY-MM-DD or YYYYMMDD anywhere in stem.
    if (preg_match('/(\d{4})-(\d{2})-(\d{2})/', $stem, $mm)) {
      return $mm[1] . '-' . $mm[2] . '-' . $mm[3];
    }
    if (preg_match('/(\d{4})(\d{2})(\d{2})/', $stem, $mm)) {
      return $mm[1] . '-' . $mm[2] . '-' . $mm[3];
    }
    return NULL;
  }

  private function findNodeByFilename(string $filename): bool {
    $ids = $this->entityTypeManager->getStorage('node')->getQuery()
      ->accessCheck(FALSE)
      ->condition('type', 'fnb_daily_revenue_report')
      ->condition('field_source_filename', $filename)
      ->range(0, 1)
      ->execute();
    return !empty($ids);
  }

  private function findNodeByDate(string $date): bool {
    $ids = $this->entityTypeManager->getStorage('node')->getQuery()
      ->accessCheck(FALSE)
      ->condition('type', 'fnb_daily_revenue_report')
      ->condition('field_report_date', $date)
      ->range(0, 1)
      ->execute();
    return !empty($ids);
  }

  /**
   * Register existing file URI (no copy) and create the report node.
   */
  private function createReportNode(string $uri, string $basename, string $date, bool $unpublished): void {
    // Ensure file exists on disk before registering.
    $realpath = $this->fileSystem->realpath($uri);
    if (!$realpath || !is_file($realpath)) {
      throw new \RuntimeException('File not found on disk: ' . $uri);
    }

    $file_storage = $this->entityTypeManager->getStorage('file');
    $existing = $file_storage->getQuery()
      ->accessCheck(FALSE)
      ->condition('uri', $uri)
      ->range(0, 1)
      ->execute();
    if ($existing) {
      /** @var \Drupal\file\FileInterface $file */
      $file = $file_storage->load(reset($existing));
    }
    else {
      /** @var \Drupal\file\FileInterface $file */
      $file = $file_storage->create([
        'uid' => (int) $this->currentUser->id() ?: 1,
        'filename' => $basename,
        'uri' => $uri,
        'status' => FileInterface::STATUS_PERMANENT,
        'filesize' => filesize($realpath) ?: 0,
      ]);
      // Avoid FileRepository::writeData (would copy). Save metadata only.
      $file->save();
    }

    /** @var \Drupal\node\NodeInterface $node */
    $node = $this->entityTypeManager->getStorage('node')->create([
      'type' => 'fnb_daily_revenue_report',
      'title' => 'F&B Revenue ' . $date,
      'uid' => (int) $this->currentUser->id() ?: 1,
      'status' => $unpublished ? NodeInterface::NOT_PUBLISHED : NodeInterface::PUBLISHED,
      'field_report_date' => $date,
      'field_report_file' => [
        'target_id' => $file->id(),
        'display' => 1,
        'description' => 'Download PDF',
      ],
      'field_source_filename' => $basename,
    ]);
    $node->save();

    $this->logger->notice('Created F&B report node @nid for @file (@date)', [
      '@nid' => $node->id(),
      '@file' => $basename,
      '@date' => $date,
    ]);
  }

}
