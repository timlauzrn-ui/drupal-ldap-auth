#!/usr/bin/env bash
# Create Homepage (test): origin Gutenberg blocks only (same idea as department_page_test).
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
JSON="${PROJECT_ROOT}/templates/gutenberg-homepage-test.json"
HTML="${PROJECT_ROOT}/templates/gutenberg-homepage-test.html"

if [[ ! -f "${JSON}" ]]; then
  echo "Missing ${JSON}" >&2
  exit 1
fi

if [[ "${SKIP_JSON_COPY:-}" != "1" ]]; then
  docker cp "${JSON}" "${CONTAINER}:/opt/drupal/homepage-test.json"
  docker exec "${CONTAINER}" chown www-data:www-data /opt/drupal/homepage-test.json
  if [[ -f "${HTML}" ]]; then
    docker cp "${HTML}" "${CONTAINER}:/opt/drupal/homepage-test.html"
    docker exec "${CONTAINER}" chown www-data:www-data /opt/drupal/homepage-test.html
  fi
fi

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$nt = "Drupal\\node\\Entity\\NodeType";
$fsc = "Drupal\\field\\Entity\\FieldStorageConfig";
$fc = "Drupal\\field\\Entity\\FieldConfig";

if (!$nt::load("homepage_test")) {
  $nt::create([
    "type" => "homepage_test",
    "name" => "Homepage (test)",
    "description" => "Same layout as Basic page (banner, four resource cards, Hot News) using origin Gutenberg blocks only.",
    "new_revision" => TRUE,
    "display_submitted" => FALSE,
  ])->save();
  echo "CREATED_HOMEPAGE_TEST\n";
}
if ($type = $nt::load("homepage_test")) {
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
if (!$fc::loadByName("node", "homepage_test", "body")) {
  $fc::create([
    "field_name" => "body",
    "entity_type" => "node",
    "bundle" => "homepage_test",
    "label" => "Body",
  ])->save();
  echo "CREATED_HOMEPAGE_TEST_BODY\n";
}
$form = \Drupal::service("entity_display.repository")->getFormDisplay("node", "homepage_test", "default");
$form->setComponent("body", ["type" => "text_textarea_with_summary", "weight" => 0])->save();
$view = \Drupal::service("entity_display.repository")->getViewDisplay("node", "homepage_test", "default");
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
$template = file_get_contents("/opt/drupal/homepage-test.json");
if ($template === FALSE) {
  throw new \Exception("Missing homepage-test.json in container");
}
json_decode($template);
if (json_last_error()) {
  throw new \Exception("Invalid homepage-test JSON: " . json_last_error_msg());
}

$c = \Drupal::configFactory()->getEditable("gutenberg.settings");
$c->set("homepage_test_enable_full", TRUE);
$c->set("homepage_test_template", $template);
$c->set("homepage_test_template_lock", "none");
$c->set("homepage_test_allowed_blocks", $core);
$c->set("homepage_test_allowed_drupal_blocks", []);
$c->set("homepage_test_allowed_content_block_types", []);
$c->save();
echo "HOMEPAGE_TEST_ALLOWLIST_OK count=" . count($core) . "\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator \
  'create homepage_test content,edit any homepage_test content,edit own homepage_test content,delete any homepage_test content,delete own homepage_test content' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add editor \
  'create homepage_test content,edit own homepage_test content,edit any homepage_test content' || true

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\pathauto\Entity\PathautoPattern;
if (!class_exists("Drupal\\pathauto\\Entity\\PathautoPattern")) {
  echo "SKIP_PATHAUTO\n";
  return;
}
$id = "friendly_homepage_test";
if (!PathautoPattern::load($id)) {
  $entity = PathautoPattern::create([
    "id" => $id,
    "label" => "Friendly homepage test",
    "type" => "canonical_entities:node",
    "pattern" => "[node:title]",
    "weight" => -10,
  ]);
  $entity->addSelectionCondition([
    "id" => "entity_bundle:node",
    "bundles" => ["homepage_test" => "homepage_test"],
    "negate" => FALSE,
    "context_mapping" => ["node" => "node"],
  ]);
  $entity->save();
  echo "PATHAUTO_HOMEPAGE_TEST_OK\n";
}
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$html_path = "/opt/drupal/homepage-test.html";
$html = is_file($html_path) ? file_get_contents($html_path) : "";
$existing = \Drupal::entityQuery("node")->accessCheck(FALSE)
  ->condition("type", "homepage_test")
  ->condition("title", "Homepage test")
  ->execute();
if ($existing) {
  $nid = (int) reset($existing);
  $node = \Drupal\node\Entity\Node::load($nid);
  if ($node && $html !== "") {
    $node->set("body", ["value" => $html, "format" => "gutenberg"]);
    $node->save();
    echo "SAMPLE_UPDATED nid=" . $nid . "\n";
  }
  else {
    echo "SAMPLE_EXISTS nid=" . $nid . "\n";
  }
  return;
}
$node = \Drupal\node\Entity\Node::create([
  "type" => "homepage_test",
  "title" => "Homepage test",
  "uid" => 1,
  "status" => 1,
  "promote" => 0,
  "body" => [
    "value" => $html !== "" ? $html : "<p>HKCEC Intranet</p>",
    "format" => "gutenberg",
  ],
]);
$node->save();
$alias = \Drupal::service("path_alias.manager")->getAliasByPath("/node/" . $node->id());
echo "SAMPLE_CREATED nid=" . $node->id() . " alias=" . $alias . "\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "Homepage (test) ready: http://localhost:8080/node/add/homepage_test"
