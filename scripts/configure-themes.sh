#!/usr/bin/env bash
# Ensure Bootstrap5 (front) + Gin (admin) themes are installed and healthy.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

composer_require() {
  if docker exec -u www-data -w /opt/drupal "${CONTAINER}" test -w composer.json 2>/dev/null; then
    docker exec -u www-data -w /opt/drupal "${CONTAINER}" composer require "$@" --no-interaction
  else
    docker exec -w /opt/drupal "${CONTAINER}" composer require "$@" --no-interaction
    docker exec "${CONTAINER}" chown -R www-data:www-data /opt/drupal/vendor /opt/drupal/composer.json /opt/drupal/composer.lock /opt/drupal/web/themes/contrib 2>/dev/null || true
  fi
}

echo "==> Installing Bootstrap5 + Gin (if needed)..."
composer_require 'drupal/bootstrap5:^4.0' 'drupal/gin:^5.0' 'drupal/gin_toolbar:^3.0'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush theme:enable bootstrap5 gin -y
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en gin_toolbar -y || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush config:set system.theme default bootstrap5 -y
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush config:set system.theme admin gin -y

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$theme = "bootstrap5";
$storage = \Drupal::entityTypeManager()->getStorage("block");
$placements = [
  ["id" => "bootstrap5_main_menu", "plugin" => "system_menu_block:main", "region" => "nav_main", "weight" => 0],
  ["id" => "bootstrap5_account_menu", "plugin" => "system_menu_block:account", "region" => "nav_additional", "weight" => 0],
  ["id" => "bootstrap5_branding", "plugin" => "system_branding_block", "region" => "nav_branding", "weight" => 0],
  ["id" => "bootstrap5_messages", "plugin" => "system_messages_block", "region" => "content", "weight" => -10],
  ["id" => "bootstrap5_content", "plugin" => "system_main_block", "region" => "content", "weight" => 0],
  ["id" => "bootstrap5_local_tasks", "plugin" => "local_tasks_block", "region" => "content", "weight" => -5],
  ["id" => "bootstrap5_local_actions", "plugin" => "local_actions_block", "region" => "content", "weight" => -6],
];
foreach ($placements as $p) {
  $block = $storage->load($p["id"]);
  if (!$block) {
    $block = $storage->create([
      "id" => $p["id"],
      "plugin" => $p["plugin"],
      "theme" => $theme,
      "region" => $p["region"],
      "weight" => $p["weight"],
      "settings" => ["label" => $p["id"], "label_display" => "0"],
    ]);
  }
  $block->set("theme", $theme)->setRegion($p["region"])->setWeight($p["weight"])->setStatus(TRUE)->save();
}
// Hide page title block for cleaner Gutenberg pages.
if ($title = $storage->load("bootstrap5_page_title")) {
  $title->setStatus(FALSE)->save();
}
// Disable duplicate main-menu blocks.
foreach ($storage->loadByProperties(["theme" => $theme]) as $id => $block) {
  if ($block->getPluginId() === "system_menu_block:main" && $id !== "bootstrap5_main_menu") {
    $block->setStatus(FALSE)->save();
  }
}
echo "THEME_BLOCKS_OK\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$default = \Drupal::config("system.theme")->get("default");
$admin = \Drupal::config("system.theme")->get("admin");
if ($default !== "bootstrap5") { throw new \Exception("default theme is $default"); }
if ($admin !== "gin") { throw new \Exception("admin theme is $admin"); }
if (!\Drupal::moduleHandler()->moduleExists("gin_toolbar")) { throw new \Exception("gin_toolbar missing"); }
echo "THEME_VERIFY_OK default=$default admin=$admin\n";
'

echo "Front theme: Bootstrap5 | Admin theme: Gin"
echo "Check: http://localhost:8080/node/8 and http://localhost:8080/admin"
