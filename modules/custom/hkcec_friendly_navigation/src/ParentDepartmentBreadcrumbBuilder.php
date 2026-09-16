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
    if (!$node instanceof NodeInterface || $node->bundle() !== 'page') {
      return FALSE;
    }
    if (!$node->hasField('field_parent_department') || $node->get('field_parent_department')->isEmpty()) {
      return FALSE;
    }
    $parent = $node->get('field_parent_department')->entity;
    return $parent instanceof NodeInterface;
  }

  /**
   * {@inheritdoc}
   */
  public function build(RouteMatchInterface $route_match): Breadcrumb {
    /** @var \Drupal\node\NodeInterface $node */
    $node = $route_match->getParameter('node');
    /** @var \Drupal\node\NodeInterface $parent */
    $parent = $node->get('field_parent_department')->entity;

    $breadcrumb = new Breadcrumb();
    $breadcrumb->addCacheableDependency($node);
    $breadcrumb->addCacheableDependency($parent);
    $breadcrumb->addCacheContexts(['route']);

    $breadcrumb->addLink(Link::createFromRoute($this->t('Home'), '<front>'));
    if ($parent->access('view')) {
      $breadcrumb->addLink(Link::fromTextAndUrl($parent->label(), $parent->toUrl()));
    }
    $breadcrumb->addLink(Link::createFromRoute($node->label(), '<none>'));

    return $breadcrumb;
  }

}
