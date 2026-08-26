#!/usr/bin/env bash
# Enable award-inspired modern Gutenberg blocks on Page/Layout.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${PROJECT_ROOT}/modules/custom/gutenberg_modern_blocks"
DEST="/opt/drupal/web/modules/custom/gutenberg_modern_blocks"

docker exec "${CONTAINER}" mkdir -p /opt/drupal/web/modules/custom
docker exec "${CONTAINER}" rm -rf "${DEST}"
docker cp "${SRC}/." "${CONTAINER}:${DEST}"
docker exec "${CONTAINER}" chown -R www-data:www-data "${DEST}"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en gutenberg_modern_blocks -y

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$config = \Drupal::configFactory()->getEditable("gutenberg.settings");
$config->set("page_enable_full", TRUE);

// Flat landing-page template inspired by award-site section order.
$json = "[[\"modern-blocks/hero\",{\"contentAlign\":\"left\",\"overlay\":\"dark\"}],[\"modern-blocks/marquee\",{\"text\":\"Award-ready storytelling · Trust · Clarity · Conversion\",\"speed\":22}],[\"modern-blocks/logo-cloud\",{\"heading\":\"Trusted by partners\",\"logos\":[]}],[\"modern-blocks/stats\",{\"items\":[{\"value\":\"120+\",\"label\":\"Events\"},{\"value\":\"40k\",\"label\":\"Visitors\"},{\"value\":\"98%\",\"label\":\"Satisfaction\"}]}],[\"modern-blocks/bento\",{}],[\"modern-blocks/feature-card\",{}],[\"modern-blocks/process\",{}],[\"modern-blocks/testimonials\",{\"items\":[]}],[\"modern-blocks/pricing\",{}],[\"modern-blocks/tabs\",{}],[\"modern-blocks/cta-banner\",{\"tone\":\"brand\"}],[\"modern-blocks/accordion\",{\"items\":[],\"allowMultiple\":false}],[\"modern-blocks/countdown\",{\"heading\":\"Next milestone\",\"target\":\"\"}],[\"modern-blocks/ad-slider\",{\"autoplay\":true,\"interval\":5,\"slides\":[]}]]";
$config->set("page_template", $json);
$config->set("page_template_lock", "all");

$modern = [
  "modern-blocks/hero",
  "modern-blocks/ad-slider",
  "modern-blocks/marquee",
  "modern-blocks/logo-cloud",
  "modern-blocks/stats",
  "modern-blocks/bento",
  "modern-blocks/feature-card",
  "modern-blocks/process",
  "modern-blocks/testimonials",
  "modern-blocks/pricing",
  "modern-blocks/tabs",
  "modern-blocks/cta-banner",
  "modern-blocks/accordion",
  "modern-blocks/countdown",
];

$allowed = array_values(array_unique(array_merge($modern, [
  "core/paragraph",
  "core/heading",
  "core/list",
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
  "core-embed/youtube",
  "core-embed/vimeo",
])));
$config->set("page_allowed_blocks", $allowed);

$layout = $config->get("layout_allowed_blocks") ?: [];
foreach ($modern as $block_id) {
  if (!in_array($block_id, $layout, TRUE)) {
    $layout[] = $block_id;
  }
}
if ($layout) {
  $config->set("layout_allowed_blocks", $layout);
}

$config->save();
echo "MODERN_BLOCKS_CONFIG_OK\n";
echo "modern_count=" . count($modern) . "\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "Award-inspired Gutenberg kit ready (14 modern blocks)."
echo "Edit a Page: http://localhost:8080/node/add/page"
