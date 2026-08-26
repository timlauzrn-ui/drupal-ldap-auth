#!/usr/bin/env bash
# Hide node title / author / date chrome so front-end pages show Gutenberg content only.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\layout_builder\Section;
use Drupal\node\Entity\NodeType;

foreach (["layout", "page", "article"] as $bundle) {
  $type = NodeType::load($bundle);
  if (!$type) {
    continue;
  }
  $type->setDisplaySubmitted(FALSE);
  $type->save();

  /** @var \Drupal\Core\Entity\Display\EntityViewDisplayInterface $view */
  $view = \Drupal::service("entity_display.repository")->getViewDisplay("node", $bundle, "default");
  foreach (["title", "uid", "created", "links"] as $field) {
    $view->removeComponent($field);
  }

  if (method_exists($view, "isLayoutBuilderEnabled") && $view->isLayoutBuilderEnabled()) {
    $arrays = [];
    foreach ($view->getSections() as $section) {
      $data = $section->toArray();
      $components = [];
      foreach ($data["components"] as $uuid => $comp) {
        $id = (string) ($comp["configuration"]["id"] ?? "");
        if (
          str_ends_with($id, ":links") ||
          str_ends_with($id, ":uid") ||
          str_ends_with($id, ":created") ||
          str_ends_with($id, ":title")
        ) {
          continue;
        }
        if (str_starts_with($id, "field_block:")) {
          $comp["configuration"]["label_display"] = "0";
          $comp["configuration"]["label"] = "";
          $comp["configuration"]["formatter"]["label"] = "hidden";
        }
        $components[$uuid] = $comp;
      }
      $data["components"] = $components;
      $arrays[] = $data;
    }

    $count = count($view->getSections());
    for ($i = $count - 1; $i >= 0; $i--) {
      $view->removeSection($i);
    }
    foreach ($arrays as $data) {
      $view->appendSection(Section::fromArray($data));
    }
  }

  foreach ($view->getComponents() as $name => $comp) {
    $comp["label"] = "hidden";
    $view->setComponent($name, $comp);
  }
  $view->save();
  echo $bundle, ": CONTENT_ONLY_OK\n";
}
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "Content pages now show Gutenberg body only (no By author / date / field title label)."
