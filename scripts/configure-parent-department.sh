#!/usr/bin/env bash
# Add Parent department field on Basic pages + wire display for back link / breadcrumbs.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$fc = "Drupal\\field\\Entity\\FieldConfig";
$fsc = "Drupal\\field\\Entity\\FieldStorageConfig";

if (!\Drupal\node\Entity\NodeType::load("page") || !\Drupal\node\Entity\NodeType::load("department_page")) {
  throw new \Exception("page and department_page content types are required");
}

if (!$fsc::loadByName("node", "field_parent_department")) {
  $fsc::create([
    "field_name" => "field_parent_department",
    "entity_type" => "node",
    "type" => "entity_reference",
    "cardinality" => 1,
    "settings" => [
      "target_type" => "node",
    ],
  ])->save();
  echo "CREATED_STORAGE\n";
}

if (!$fc::loadByName("node", "page", "field_parent_department")) {
  $fc::create([
    "field_name" => "field_parent_department",
    "entity_type" => "node",
    "bundle" => "page",
    "label" => "Parent department",
    "required" => FALSE,
    "description" => "Optional. Makes this page a child of a Department page so visitors can go back from the sidebar / breadcrumbs.",
    "settings" => [
      "handler" => "default:node",
      "handler_settings" => [
        "target_bundles" => [
          "department_page" => "department_page",
          "department_page_test" => "department_page_test",
        ],
        "sort" => ["field" => "title", "direction" => "ASC"],
        "auto_create" => FALSE,
      ],
    ],
  ])->save();
  echo "CREATED_FIELD_PAGE\n";
}

$form = \Drupal::service("entity_display.repository")->getFormDisplay("node", "page", "default");
$form->setComponent("field_parent_department", [
  "type" => "entity_reference_autocomplete",
  "weight" => -4,
  "settings" => [
    "match_operator" => "CONTAINS",
    "size" => 60,
    "placeholder" => "Start typing a department page title…",
  ],
])->save();

$view = \Drupal::service("entity_display.repository")->getViewDisplay("node", "page", "default");
// Hidden on body; we render a custom back link in preprocess.
$view->removeComponent("field_parent_department");
$view->save();

echo "PARENT_DEPARTMENT_FIELD_OK\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "Parent department field ready on Basic pages."
