<?php

declare(strict_types=1);

namespace Drupal\hkcec_gutenberg_modern_blocks\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\node\NodeInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Creates a department topic page and lists pages already under a parent.
 */
final class DepartmentChildController extends ControllerBase {

  /**
   * Create a child page and return its address.
   */
  public function createChild(Request $request): JsonResponse {
    try {
      $token = (string) $request->headers->get('X-CSRF-Token');
      if (!\Drupal::csrfToken()->validate($token, 'hkcec-department-child')) {
        return $this->fail('Reload the editor and try again.', 403);
      }
      $payload = json_decode((string) $request->getContent(), TRUE);
      if (!is_array($payload)) {
        return $this->fail('The page could not be created.', 400);
      }
      $parent_id = (int) ($payload['parent'] ?? 0);
      $title = trim(strip_tags((string) ($payload['title'] ?? '')));
      $bundle = (string) ($payload['bundle'] ?? '');
      if ($parent_id < 1 || $title === '') {
        return $this->fail('Save this department page, then enter a page title.', 400);
      }
      if (mb_strlen($title) > 255) {
        $title = mb_substr($title, 0, 255);
      }
      if (!in_array($bundle, hkcec_gutenberg_modern_blocks_department_list_bundles(), TRUE)) {
        return $this->fail('Choose a department page layout.', 400);
      }
      $parent = $this->entityTypeManager()->getStorage('node')->load($parent_id);
      if (!$parent instanceof NodeInterface || !in_array($parent->bundle(), hkcec_gutenberg_modern_blocks_department_list_bundles(), TRUE)) {
        return $this->fail('Save this department page before creating a child page.', 400);
      }
      if (!$parent->access('update')) {
        return $this->fail('You do not have permission to update this department page.', 403);
      }
      if (!$this->currentUser()->hasPermission('create ' . $bundle . ' content')) {
        return $this->fail('You do not have permission to create this page.', 403);
      }
      if (!$parent->hasField('field_parent_department')) {
        return $this->fail('Parent department is not available yet. Reload the site and try again.', 500);
      }
      $html = $this->templateHtml($bundle, $title);
      if ($html === NULL) {
        return $this->fail('The department page template could not be read.', 500);
      }
      $node = $this->entityTypeManager()->getStorage('node')->create([
        'type' => $bundle,
        'title' => $title,
        'uid' => $this->currentUser()->id(),
        'status' => 1,
        'promote' => 0,
        'field_parent_department' => $parent->id(),
        'body' => [
          'value' => $html,
          'format' => 'gutenberg',
        ],
      ]);
      if ($node->hasField('path')) {
        $node->set('path', ['pathauto' => TRUE]);
      }
      $node->save();
      return new JsonResponse([
        'ok' => TRUE,
        'nid' => (int) $node->id(),
        'title' => $node->label(),
        'url' => $node->toUrl()->toString(),
      ]);
    }
    catch (\Throwable $e) {
      $this->getLogger('hkcec_gutenberg_modern_blocks')->error('Department child page was not created: @message', [
        '@message' => $e->getMessage(),
      ]);
      return $this->fail('The page could not be created.', 500);
    }
  }

  /**
   * Department pages that can be linked from this page.
   *
   * Includes pages that are not under this department yet, so an editor can
   * choose a page they created on their own.
   */
  public function listChildren(NodeInterface $node): JsonResponse {
    try {
      if (!in_array($node->bundle(), hkcec_gutenberg_modern_blocks_department_list_bundles(), TRUE)) {
        return new JsonResponse(['ok' => TRUE, 'pages' => []]);
      }
      if (!\Drupal\field\Entity\FieldStorageConfig::loadByName('node', 'field_parent_department')) {
        return new JsonResponse(['ok' => TRUE, 'pages' => []]);
      }
      $ids = $this->entityTypeManager()->getStorage('node')->getQuery()
        ->accessCheck(FALSE)
        ->condition('type', hkcec_gutenberg_modern_blocks_department_list_bundles(), 'IN')
        ->condition('nid', (int) $node->id(), '<>')
        ->sort('title')
        ->range(0, 200)
        ->execute();
      $pages = [];
      $parent_id = (int) $node->id();
      foreach ($this->entityTypeManager()->getStorage('node')->loadMultiple($ids) as $child) {
        if (!$child instanceof NodeInterface) {
          continue;
        }
        if (hkcec_gutenberg_modern_blocks_parent_would_cycle($child, $parent_id)) {
          continue;
        }
        $current = $child->hasField('field_parent_department') && !$child->get('field_parent_department')->isEmpty()
          ? (int) $child->get('field_parent_department')->target_id
          : 0;
        $under_this = $current === $parent_id;
        if (!$under_this && !$child->access('update')) {
          continue;
        }
        if ($under_this && !$child->access('view')) {
          continue;
        }
        $pages[] = [
          'nid' => (int) $child->id(),
          'title' => $child->label(),
          'url' => $child->toUrl()->toString(),
          'underThis' => $under_this,
          'hasParent' => $current > 0 && !$under_this,
        ];
      }
      return new JsonResponse(['ok' => TRUE, 'pages' => $pages]);
    }
    catch (\Throwable $e) {
      $this->getLogger('hkcec_gutenberg_modern_blocks')->error('Department child list failed: @message', [
        '@message' => $e->getMessage(),
      ]);
      return $this->fail('The child pages could not be loaded.', 500);
    }
  }

  /**
   * Store an existing page under this department page.
   */
  public function attachChild(NodeInterface $node, Request $request): JsonResponse {
    try {
      $token = (string) $request->headers->get('X-CSRF-Token');
      if (!\Drupal::csrfToken()->validate($token, 'hkcec-department-child')) {
        return $this->fail('Reload the editor and try again.', 403);
      }
      if (!in_array($node->bundle(), hkcec_gutenberg_modern_blocks_department_list_bundles(), TRUE)) {
        return $this->fail('Save this department page before choosing a child page.', 400);
      }
      if (!$node->access('update')) {
        return $this->fail('You do not have permission to update this department page.', 403);
      }
      $payload = json_decode((string) $request->getContent(), TRUE);
      $child_id = is_array($payload) ? (int) ($payload['child'] ?? 0) : 0;
      $child = $child_id > 0 ? $this->entityTypeManager()->getStorage('node')->load($child_id) : NULL;
      if (!$child instanceof NodeInterface || !in_array($child->bundle(), hkcec_gutenberg_modern_blocks_department_list_bundles(), TRUE)) {
        return $this->fail('That page could not be chosen.', 400);
      }
      if (!$child->access('update')) {
        return $this->fail('You do not have permission to update that page.', 403);
      }
      if (!$child->hasField('field_parent_department')) {
        return $this->fail('Parent department is not available yet. Reload the site and try again.', 500);
      }
      if (hkcec_gutenberg_modern_blocks_parent_would_cycle($child, (int) $node->id())) {
        return $this->fail('That page cannot sit under this one.', 400);
      }
      $child->set('field_parent_department', $node->id());
      $child->save();
      return new JsonResponse([
        'ok' => TRUE,
        'nid' => (int) $child->id(),
        'title' => $child->label(),
        'url' => $child->toUrl()->toString(),
      ]);
    }
    catch (\Throwable $e) {
      $this->getLogger('hkcec_gutenberg_modern_blocks')->error('Department child page was not attached: @message', [
        '@message' => $e->getMessage(),
      ]);
      return $this->fail('That page could not be chosen.', 500);
    }
  }

  /**
   * Starter body for a department page test type, with the visible title set.
   */
  private function templateHtml(string $bundle, string $title): ?string {
    $files = [
      'department_page_test' => 'gutenberg-department-page-test.html',
      'department_page_test_1col' => 'gutenberg-department-page-test-1col.html',
      'department_page_test_2col' => 'gutenberg-department-page-test-2col.html',
      'department_page_test_3col' => 'gutenberg-department-page-test-3col.html',
    ];
    $filename = $files[$bundle] ?? '';
    if ($filename === '') {
      return NULL;
    }
    $path = $this->moduleHandler()->getModule('hkcec_gutenberg_modern_blocks')->getPath() . '/data/' . $filename;
    if (!is_readable($path)) {
      return NULL;
    }
    $html = file_get_contents($path);
    if (!is_string($html) || $html === '') {
      return NULL;
    }
    $safe = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $updated = preg_replace(
      '/(<h1\b[^>]*hkcec-dept-title[^>]*>)(.*?)(<\/h1>)/s',
      '$1' . $safe . '$3',
      $html,
      1
    );
    return is_string($updated) ? $updated : $html;
  }

  /**
   * JSON error that the editor can show without a PHP page.
   */
  private function fail(string $message, int $status): JsonResponse {
    return new JsonResponse([
      'ok' => FALSE,
      'message' => (string) $this->t($message),
    ], $status);
  }

}
