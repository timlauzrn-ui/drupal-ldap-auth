#!/usr/bin/env bash
# Create Department page (test): origin Gutenberg blocks only, Patterns available.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
JSON="${PROJECT_ROOT}/templates/gutenberg-department-page-test.json"
HTML="${PROJECT_ROOT}/templates/gutenberg-department-page-test.html"

if [[ ! -f "${JSON}" ]]; then
  echo "Missing ${JSON}" >&2
  exit 1
fi

if [[ "${SKIP_JSON_COPY:-}" != "1" ]]; then
  docker cp "${JSON}" "${CONTAINER}:/opt/drupal/department-page-test.json"
  docker exec "${CONTAINER}" chown www-data:www-data /opt/drupal/department-page-test.json
  if [[ -f "${HTML}" ]]; then
    docker cp "${HTML}" "${CONTAINER}:/opt/drupal/department-page-test.html"
    docker exec "${CONTAINER}" chown www-data:www-data /opt/drupal/department-page-test.html
  fi
fi

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$nt = "Drupal\\node\\Entity\\NodeType";
$fsc = "Drupal\\field\\Entity\\FieldStorageConfig";
$fc = "Drupal\\field\\Entity\\FieldConfig";

if (!$nt::load("department_page_test")) {
  $nt::create([
    "type" => "department_page_test",
    "name" => "Department page (test)",
    "description" => "Same layout as Department page using origin Gutenberg blocks only.",
    "new_revision" => TRUE,
    "display_submitted" => FALSE,
  ])->save();
  echo "CREATED_DEPARTMENT_PAGE_TEST\n";
}
if ($type = $nt::load("department_page_test")) {
  $type->setDisplaySubmitted(FALSE);
  $type->save();
}

if (!$fsc::loadByName("node", "body")) {
  $fsc::create([
    "field_name" => "body",
    "entity_type" => "node",
    "type" => "text_with_summary",
    "cardinality" => 1,
  ])->save();
}
if (!$fc::loadByName("node", "department_page_test", "body")) {
  $fc::create([
    "field_name" => "body",
    "entity_type" => "node",
    "bundle" => "department_page_test",
    "label" => "Body",
  ])->save();
  echo "CREATED_DEPARTMENT_PAGE_TEST_BODY\n";
}
$form = \Drupal::service("entity_display.repository")->getFormDisplay("node", "department_page_test", "default");
$form->setComponent("body", ["type" => "text_textarea_with_summary", "weight" => 0])->save();
$view = \Drupal::service("entity_display.repository")->getViewDisplay("node", "department_page_test", "default");
$view->removeComponent("uid");
$view->removeComponent("created");
$view->removeComponent("links");
$view->setComponent("body", ["type" => "text_default", "label" => "hidden", "weight" => 0])->save();

$core = [
  "core/block",
  "core/pattern",
  "core/missing",
  "core/freeform",
  "core/paragraph",
  "core/heading",
  "core/list",
  "core/list-item",
  "core/image",
  "core/gallery",
  "core/file",
  "core/embed",
  "core/video",
  "core/audio",
  "core/cover",
  "core/buttons",
  "core/button",
  "core/columns",
  "core/column",
  "core/group",
  "core/media-text",
  "core/quote",
  "core/pullquote",
  "core/table",
  "core/separator",
  "core/spacer",
  "core/html",
  "core/code",
  "core/preformatted",
  "core/verse",
  "core/details",
  "core/text-columns",
  "core-embed/youtube",
  "core-embed/vimeo",
  "core-embed/twitter",
  "core-embed/facebook",
  "core-embed/instagram",
];
$template = file_get_contents("/opt/drupal/department-page-test.json");
if ($template === FALSE) {
  throw new \Exception("Missing department-page-test.json in container");
}
json_decode($template);
if (json_last_error()) {
  throw new \Exception("Invalid department-page-test JSON: " . json_last_error_msg());
}

$c = \Drupal::configFactory()->getEditable("gutenberg.settings");
$c->set("department_page_test_enable_full", TRUE);
$c->set("department_page_test_template", $template);
$c->set("department_page_test_template_lock", "none");
$c->set("department_page_test_allowed_blocks", $core);
$c->set("department_page_test_allowed_drupal_blocks", []);
$c->set("department_page_test_allowed_content_block_types", []);
$c->save();
echo "DEPARTMENT_PAGE_TEST_ALLOWLIST_OK count=" . count($core) . "\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator \
  'create department_page_test content,edit any department_page_test content,edit own department_page_test content,delete any department_page_test content,delete own department_page_test content' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add editor \
  'create department_page_test content,edit own department_page_test content,edit any department_page_test content' || true

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\pathauto\Entity\PathautoPattern;
if (!class_exists("Drupal\\pathauto\\Entity\\PathautoPattern")) {
  echo "SKIP_PATHAUTO\n";
  return;
}
$id = "friendly_department_page_test";
if (!PathautoPattern::load($id)) {
  $entity = PathautoPattern::create([
    "id" => $id,
    "label" => "Friendly department page test",
    "type" => "canonical_entities:node",
    "pattern" => "[node:title]",
    "weight" => -10,
  ]);
  $entity->addSelectionCondition([
    "id" => "entity_bundle:node",
    "bundles" => ["department_page_test" => "department_page_test"],
    "negate" => FALSE,
    "context_mapping" => ["node" => "node"],
  ]);
  $entity->save();
  echo "PATHAUTO_DEPARTMENT_PAGE_TEST_OK\n";
}
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$html_path = "/opt/drupal/department-page-test.html";
$html = is_file($html_path) ? file_get_contents($html_path) : "";
$existing = \Drupal::entityQuery("node")->accessCheck(FALSE)
  ->condition("type", "department_page_test")
  ->range(0, 1)
  ->execute();
if ($existing) {
  echo "SAMPLE_EXISTS nid=" . reset($existing) . "\n";
  return;
}
$node = \Drupal\node\Entity\Node::create([
  "type" => "department_page_test",
  "title" => "Department page test",
  "uid" => 1,
  "status" => 1,
  "promote" => 0,
  "body" => [
    "value" => $html !== "" ? $html : "<p>Department name</p>",
    "format" => "gutenberg",
  ],
]);
$node->save();
$alias = \Drupal::service("path_alias.manager")->getAliasByPath("/node/" . $node->id());
echo "SAMPLE_CREATED nid=" . $node->id() . " alias=" . $alias . "\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "Department page (test) ready: http://localhost:8080/node/add/department_page_test"
