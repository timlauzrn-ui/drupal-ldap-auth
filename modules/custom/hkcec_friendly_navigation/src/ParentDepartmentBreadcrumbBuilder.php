<?php

declare(strict_types=1);

namespace Drupal\hkcec_friendly_navigation;

use Drupal\Core\Breadcrumb\Breadcrumb;
use Drupal\Core\Breadcrumb\BreadcrumbBuilderInterface;
use Drupal\Core\Link;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\node\NodeInterface;

/**
 * Builds Home → Parent department → Current page breadcrumbs for child pages.
 */
final class ParentDepartmentBreadcrumbBuilder implements BreadcrumbBuilderInterface {

  use StringTranslationTrait;

  /**
   * {@inheritdoc}
   */
  public function applies(RouteMatchInterface $route_match): bool {
    $node = $route_match->getParameter('node');
    if (!$node instanceof NodeInterface || !self::bundleUsesParent($node->bundle())) {
      return FALSE;
    }
    return self::parentOf($node) instanceof NodeInterface;
  }

  /**
   * Bundles whose breadcrumb can include Parent department.
   */
  private static function bundleUsesParent(string $bundle): bool {
    if ($bundle === 'page') {
      return TRUE;
    }
    return function_exists('hkcec_gutenberg_modern_blocks_department_list_bundles')
      && in_array($bundle, hkcec_gutenberg_modern_blocks_department_list_bundles(), TRUE);
  }

  /**
   * The parent node, when the field points at a real page.
   */
  private static function parentOf(NodeInterface $node): ?NodeInterface {
    if (!$node->hasField('field_parent_department') || $node->get('field_parent_department')->isEmpty()) {
      return NULL;
    }
    $parent = $node->get('field_parent_department')->entity;
    return $parent instanceof NodeInterface ? $parent : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function build(RouteMatchInterface $route_match): Breadcrumb {
    /** @var \Drupal\node\NodeInterface $node */
    $node = $route_match->getParameter('node');
    $chain = [];
    $current = $node;
    $seen = [(int) $node->id()];
    $guard = 0;
    while ($guard < 8) {
      $parent = self::parentOf($current);
      if (!$parent || in_array((int) $parent->id(), $seen, TRUE)) {
        break;
      }
      $seen[] = (int) $parent->id();
      array_unshift($chain, $parent);
      $current = $parent;
      $guard++;
    }

    $breadcrumb = new Breadcrumb();
    $breadcrumb->addCacheableDependency($node);
    $breadcrumb->addCacheContexts(['route']);
    $breadcrumb->addLink(Link::createFromRoute($this->t('Home'), '<front>'));
    foreach ($chain as $parent) {
      $breadcrumb->addCacheableDependency($parent);
      if ($parent->access('view')) {
        $breadcrumb->addLink(Link::fromTextAndUrl($parent->label(), $parent->toUrl()));
      }
    }
    $breadcrumb->addLink(Link::createFromRoute($node->label(), '<none>'));

    return $breadcrumb;
  }

}
