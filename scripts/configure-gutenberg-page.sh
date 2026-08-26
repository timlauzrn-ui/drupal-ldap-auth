#!/usr/bin/env bash
# Configure Gutenberg on the Page content type: template, lock=all, allowed blocks.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

# Ensure Basic page content type + body field exist (standard profile may be incomplete).
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\node\Entity\NodeType;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;
if (!NodeType::load("page")) {
  NodeType::create([
    "type" => "page",
    "name" => "Basic page",
    "description" => "Use basic pages for static content.",
    "new_revision" => TRUE,
    "display_submitted" => FALSE,
  ])->save();
  echo "CREATED_PAGE_TYPE\n";
}
// Always keep submitted-by chrome off for Gutenberg pages.
if ($page = NodeType::load("page")) {
  $page->setDisplaySubmitted(FALSE);
  $page->save();
}
if (!FieldStorageConfig::loadByName("node", "body")) {
  FieldStorageConfig::create([
    "field_name" => "body",
    "entity_type" => "node",
    "type" => "text_with_summary",
    "cardinality" => 1,
  ])->save();
}
if (!FieldConfig::loadByName("node", "page", "body")) {
  FieldConfig::create([
    "field_name" => "body",
    "entity_type" => "node",
    "bundle" => "page",
    "label" => "Body",
  ])->save();
}
$form = \Drupal::service("entity_display.repository")->getFormDisplay("node", "page", "default");
$form->setComponent("body", ["type" => "text_textarea_with_summary", "weight" => 0])->save();
$view = \Drupal::service("entity_display.repository")->getViewDisplay("node", "page", "default");
$view->setComponent("body", ["type" => "text_default", "label" => "hidden", "weight" => 0])->save();
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$config = \Drupal::configFactory()->getEditable("gutenberg.settings");

// Enable Gutenberg experience for the Page content type.
$config->set("page_enable_full", TRUE);

// SAFE flat template: empty attrs must be {} not [].
// Nested columns/group templates have caused Gutenberg to malfunction in 3.0.6.
$json = "[[\"core/heading\",{\"level\":1,\"placeholder\":\"Page title\"}],[\"core/paragraph\",{\"placeholder\":\"Intro — edit this text in place\"}],[\"core/heading\",{\"level\":2,\"placeholder\":\"Section heading\"}],[\"core/paragraph\",{\"placeholder\":\"Body paragraph for testing\"}],[\"core/image\",{}],[\"core/paragraph\",{\"placeholder\":\"Caption or follow-up text under the image\"}],[\"core/list\",{}]]";

$config->set("page_template", $json);
$config->set("page_template_lock", "all");

$allowed = [
  "core/paragraph",
  "core/heading",
  "core/list",
  "core/image",
  "core/file",
  "core/embed",
  "core/columns",
  "core/column",
  "core/group",
  "core/media-text",
];
$config->set("page_allowed_blocks", $allowed);
$config->save();

echo "GUTENBERG_PAGE_CONFIG_OK\n";
echo "template_lock=" . \Drupal::config("gutenberg.settings")->get("page_template_lock") . "\n";
'

# Grant unlock permission to administrator; create editor role without unlock.
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator 'unlock gutenberg template' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator 'use gutenberg' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:create editor 'Editor' 2>/dev/null || true

# Editor can use Gutenberg + media, but NOT unlock template.
# Drush 13 role:perm:add expects a single comma-delimited permissions argument.
# Drupal 11 media uses "update media" (not "edit own media").
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add editor \
  'access content,create page content,edit own page content,edit any page content,use gutenberg,use text format gutenberg,access media overview,create media,update media,view media,create image media,create document media,edit own image media,edit own document media'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:remove editor 'unlock gutenberg template' 2>/dev/null || true

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

echo "Gutenberg Page template configured (lock=all). Administrator can unlock; Editor cannot."
