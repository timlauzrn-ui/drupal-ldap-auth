#!/usr/bin/env bash
# Keep Department page (test) on origin Gutenberg blocks, with Patterns available.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$nt = "Drupal\\node\\Entity\\NodeType";
if (!$nt::load("department_page_test")) {
  echo "SKIP_NO_DEPARTMENT_PAGE_TEST\n";
  return;
}
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
$c = \Drupal::configFactory()->getEditable("gutenberg.settings");
$c->set("department_page_test_enable_full", TRUE);
$c->set("department_page_test_template_lock", "none");
$c->set("department_page_test_allowed_blocks", $core);
$c->set("department_page_test_allowed_drupal_blocks", []);
$c->set("department_page_test_allowed_content_block_types", []);
$c->save();
echo "DEPARTMENT_PAGE_TEST_ALLOWLIST_OK count=" . count($core) . "\n";
'
