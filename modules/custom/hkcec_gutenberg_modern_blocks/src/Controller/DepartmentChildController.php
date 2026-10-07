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
      $html = $this->sectionHtml((string) ($payload['html'] ?? ''), $title, $bundle, $parent);
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
   * Body for the new page.
   *
   * Every department layout uses that template's shell: the department
   * title and Quick Navigation. A matching topic card fills the content
   * area. A line with no card uses the starter file's content area, including
   * its sample cards. A missing template file falls back to the posted HTML,
   * then a heading.
   */
  private function sectionHtml(string $posted, string $title, string $bundle, NodeInterface $parent): string {
    $clean = $this->cleanSectionHtml($posted);
    $from_template = $this->columnTopicHtml($clean, $title, $bundle, $parent, $this->columnBundleCount($bundle));
    if ($from_template !== '') {
      return $from_template;
    }
    if ($this->readTemplate($bundle) !== NULL) {
      return $this->headingOnly($title);
    }
    if ($clean !== '') {
      return $clean;
    }
    return $this->headingOnly($title);
  }

  /**
   * How many content columns this department bundle uses.
   */
  private function columnBundleCount(string $bundle): int {
    if (str_contains($bundle, '_3col')) {
      return 3;
    }
    if (str_contains($bundle, '_2col')) {
      return 2;
    }
    if (str_contains($bundle, '_1col')) {
      return 1;
    }
    return 0;
  }

  /**
   * Chosen department template. A missing topic card keeps the starter content.
   */
  private function columnTopicHtml(string $posted, string $title, string $bundle, NodeInterface $parent, int $count): string {
    try {
      $template = $this->readTemplate($bundle);
      if ($template === NULL) {
        return '';
      }
      $card = $this->resolveCard($posted, $title, $parent, $template);
      $nav = $this->resolveNavList($posted, $parent, $template);
      if ($nav === '') {
        return '';
      }
      $heading = $this->departmentHeading($parent);
      $nav_heading = $this->resolveNavHeading($posted, $parent, $template);
      if ($card !== '') {
        $html = $count > 0
          ? $this->buildColumnPage($heading, $nav_heading, $nav, $card, $count)
          : $this->buildLandingPage($heading, $nav_heading, $nav, $card);
      }
      else {
        $inner = $this->extractMainInner($template);
        if ($inner === '') {
          return '';
        }
        $html = $this->departmentShell($heading, $nav_heading, $nav, $inner);
      }
      $clean = $this->cleanSectionHtml($html);
      if ($clean === '' || !str_contains($clean, 'hkcec-dept-main') || !str_contains($clean, 'hkcec-dept-nav')) {
        return '';
      }
      if ($count > 0 && !str_contains($clean, 'hkcec-origin-cards-' . $count)) {
        return '';
      }
      return $clean;
    }
    catch (\Throwable $e) {
      return '';
    }
  }

  /**
   * Inner markup of the starter's right-hand content column.
   */
  private function extractMainInner(string $html): string {
    foreach ($this->blocksNamed($html, 'column') as $block) {
      if (!str_contains($block, 'hkcec-dept-main')) {
        continue;
      }
      if (!preg_match('/<div class="wp-block-column hkcec-dept-main"[^>]*>(.*)<\/div>\s*<!-- \/wp:column -->\s*$/s', $block, $matches)) {
        continue;
      }
      $inner = trim($matches[1]);
      if ($inner !== '' && str_contains($inner, '<!-- wp:')) {
        return $inner;
      }
    }
    return '';
  }

  /**
   * Saved body of the department page that is open.
   */
  private function parentBody(NodeInterface $parent): string {
    if (!$parent->hasField('body')) {
      return '';
    }
    return (string) $parent->get('body')->value;
  }

  /**
   * Visible department name from the parent page.
   */
  private function departmentHeading(NodeInterface $parent): string {
    $body = $this->parentBody($parent);
    if ($body !== '' && preg_match('/<h1\b[^>]*hkcec-dept-title[^>]*>(.*?)<\/h1>/s', $body, $matches)) {
      $text = trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
      if ($text !== '') {
        return $text;
      }
    }
    return trim((string) $parent->label());
  }

  /**
   * Topic card from the open editor, the saved page, then the starter file.
   */
  private function resolveCard(string $posted, string $title, NodeInterface $parent, string $template): string {
    foreach ([$posted, $this->parentBody($parent), $template] as $html) {
      if ($html === '') {
        continue;
      }
      $card = $this->extractCard($html, $title);
      if ($card !== '') {
        return $card;
      }
    }
    return '';
  }

  /**
   * Quick Navigation list from the open editor, the saved page, then the starter.
   */
  private function resolveNavList(string $posted, NodeInterface $parent, string $template): string {
    foreach ([$posted, $this->parentBody($parent), $template] as $html) {
      if ($html === '') {
        continue;
      }
      $nav = $this->extractNavList($html);
      if ($nav !== '') {
        return $nav;
      }
    }
    return '';
  }

  /**
   * Quick Navigation heading from the same sources, with a plain fallback.
   */
  private function resolveNavHeading(string $posted, NodeInterface $parent, string $template): string {
    foreach ([$posted, $this->parentBody($parent), $template] as $html) {
      if ($html !== '' && str_contains($html, 'hkcec-dept-nav')) {
        return $this->extractNavHeading($html);
      }
    }
    return $this->extractNavHeading('');
  }

  /**
   * Empty paragraph Gutenberg keeps inside a column.
   */
  private function blankParagraph(): string {
    return "<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph -->";
  }

  /**
   * Quick Navigation heading block from a template.
   */
  private function extractNavHeading(string $html): string {
    $pos = strpos($html, 'hkcec-dept-nav');
    $slice = $pos === FALSE ? '' : substr($html, $pos, 900);
    if ($slice !== '' && preg_match('/<!-- wp:heading\b.*?<!-- \/wp:heading -->/s', $slice, $matches)) {
      return $matches[0];
    }
    return "<!-- wp:heading {\"level\":2} -->\n<h2 class=\"wp-block-heading\">Quick Navigation</h2>\n<!-- /wp:heading -->";
  }

  /**
   * Navigation list that follows the Quick Navigation column.
   */
  private function extractNavList(string $html): string {
    $pos = strpos($html, 'hkcec-dept-nav');
    if ($pos === FALSE) {
      return '';
    }
    $blocks = $this->blocksNamed(substr($html, $pos), 'list');
    return $blocks[0] ?? '';
  }

  /**
   * Topic card whose heading matches the selected line.
   */
  private function extractCard(string $html, string $title): string {
    $wanted = mb_strtolower(trim($title));
    if ($html === '' || $wanted === '') {
      return '';
    }
    foreach ($this->blocksNamed($html, 'group') as $block) {
      if (!str_contains($block, 'hkcec-origin-card')) {
        continue;
      }
      if (!preg_match('/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/s', $block, $heading)) {
        continue;
      }
      $text = mb_strtolower(trim(html_entity_decode(strip_tags($heading[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
      if ($text === $wanted) {
        return $block;
      }
    }
    return '';
  }

  /**
   * Gutenberg blocks of one name, including blocks nested in other blocks.
   *
   * @return list<string>
   */
  private function blocksNamed(string $html, string $name): array {
    $open = '<!-- wp:' . $name;
    $close = '<!-- /wp:' . $name . ' -->';
    $blocks = [];
    $offset = 0;
    $length = strlen($html);
    $open_length = strlen($open);
    while ($offset < $length) {
      $start = strpos($html, $open, $offset);
      if ($start === FALSE) {
        break;
      }
      $marker = $html[$start + $open_length] ?? '';
      if ($marker !== ' ' && $marker !== '{' && $marker !== '/') {
        $offset = $start + $open_length;
        continue;
      }
      $depth = 1;
      $cursor = $start + $open_length;
      $end = NULL;
      while ($depth > 0) {
        $next_open = strpos($html, $open, $cursor);
        $next_close = strpos($html, $close, $cursor);
        if ($next_close === FALSE) {
          break;
        }
        if ($next_open !== FALSE && $next_open < $next_close) {
          $nested = $html[$next_open + $open_length] ?? '';
          if ($nested === ' ' || $nested === '{' || $nested === '/') {
            $depth++;
          }
          $cursor = $next_open + $open_length;
          continue;
        }
        $depth--;
        $cursor = $next_close + strlen($close);
        if ($depth === 0) {
          $end = $cursor;
        }
      }
      if ($end === NULL) {
        break;
      }
      $blocks[] = substr($html, $start, $end - $start);
      $offset = $end;
    }
    return $blocks;
  }

  /**
   * Department shell whose content area is one row of the chosen columns.
   */
  private function buildColumnPage(string $heading, string $nav_heading, string $nav_list, string $card, int $count): string {
    $width = $count === 1 ? '100%' : ($count === 2 ? '50%' : '33.33%');
    $columns = [$this->sizedColumn($card, $width)];
    $blank = $this->blankParagraph();
    for ($index = 1; $index < $count; $index++) {
      $columns[] = $this->sizedColumn($blank, $width);
    }
    $class = 'hkcec-origin-cards-' . $count;
    $row = "<!-- wp:columns {\"className\":\"{$class}\"} -->\n<div class=\"wp-block-columns {$class}\">\n" . implode("\n\n", $columns) . "\n</div>\n<!-- /wp:columns -->";
    return $this->departmentShell($heading, $nav_heading, $nav_list, $row);
  }

  /**
   * Department landing shell. The right column is the topic card or empty.
   */
  private function buildLandingPage(string $heading, string $nav_heading, string $nav_list, string $main_inner): string {
    return $this->departmentShell($heading, $nav_heading, $nav_list, $main_inner);
  }

  /**
   * Title, Quick Navigation, and one content area.
   */
  private function departmentShell(string $heading, string $nav_heading, string $nav_list, string $main_inner): string {
    $safe = htmlspecialchars($heading, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $nav = "<!-- wp:column {\"width\":\"28%\",\"className\":\"hkcec-dept-nav\"} -->\n<div class=\"wp-block-column hkcec-dept-nav\" style=\"flex-basis:28%\">{$nav_heading}\n\n{$nav_list}</div>\n<!-- /wp:column -->";
    $main = "<!-- wp:column {\"width\":\"72%\",\"className\":\"hkcec-dept-main\"} -->\n<div class=\"wp-block-column hkcec-dept-main\" style=\"flex-basis:72%\">{$main_inner}</div>\n<!-- /wp:column -->";
    return "<!-- wp:heading {\"level\":1,\"className\":\"hkcec-dept-title\"} -->\n<h1 class=\"wp-block-heading hkcec-dept-title\">{$safe}</h1>\n<!-- /wp:heading -->\n\n<!-- wp:columns {\"className\":\"hkcec-dept-shell\"} -->\n<div class=\"wp-block-columns hkcec-dept-shell\">{$nav}\n\n{$main}</div>\n<!-- /wp:columns -->";
  }

  /**
   * One content column with an explicit width Gutenberg can keep.
   */
  private function sizedColumn(string $inner, string $width): string {
    $style = htmlspecialchars($width, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    return "<!-- wp:column {\"width\":\"{$width}\"} -->\n<div class=\"wp-block-column\" style=\"flex-basis:{$style}\">{$inner}</div>\n<!-- /wp:column -->";
  }

  /**
   * Keep Gutenberg markup and drop script tags.
   */
  private function cleanSectionHtml(string $html): string {
    $html = trim($html);
    if ($html === '' || strlen($html) > 100000 || !str_contains($html, '<!-- wp:')) {
      return '';
    }
    $stripped = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $html);
    if (!is_string($stripped)) {
      return '';
    }
    $stripped = preg_replace('#<script\b[^>]*/?>#i', '', $stripped);
    if (!is_string($stripped)) {
      return '';
    }
    $stripped = preg_replace('#javascript:#i', '', $stripped);
    if (!is_string($stripped) || !str_contains($stripped, '<!-- wp:')) {
      return '';
    }
    return $stripped;
  }

  /**
   * One heading and an empty paragraph when no section matched.
   */
  private function headingOnly(string $title): string {
    $safe = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    return "<!-- wp:heading {\"level\":2} -->\n<h2 class=\"wp-block-heading\">{$safe}</h2>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p></p>\n<!-- /wp:paragraph -->";
  }

  /**
   * Raw starter body for a department page test type.
   */
  private function readTemplate(string $bundle): ?string {
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
    return $html;
  }

  /**
   * Starter body for a department page test type, with the visible title set.
   */
  private function templateHtml(string $bundle, string $title): ?string {
    $html = $this->readTemplate($bundle);
    if ($html === NULL) {
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
