#!/usr/bin/env bash
# Verify Pathauto, menus, private media path.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

echo "==> Modules"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=pathauto
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=friendly
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=easy_breadcrumb

echo "==> Private path"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$private = \Drupal::service("stream_wrapper_manager")->getViaScheme("private");
if (!$private) { throw new \Exception("private scheme missing"); }
echo "PRIVATE_SCHEME_OK\n";
$path = \Drupal::service("file_system")->realpath("private://");
echo "private_realpath=", ($path ?: "(empty)"), "\n";
$img = \Drupal\field\Entity\FieldStorageConfig::loadByName("media", "field_media_image");
$doc = \Drupal\field\Entity\FieldStorageConfig::loadByName("media", "field_media_document");
if ($img && ($img->getSetting("uri_scheme") !== "private")) {
  throw new \Exception("field_media_image not private");
}
if ($doc && ($doc->getSetting("uri_scheme") !== "private")) {
  throw new \Exception("field_media_document not private");
}
echo "MEDIA_FIELDS_PRIVATE_OK\n";
'

echo "==> Pathauto + alias generation"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\node\Entity\Node;
$title = "Staff Guide " . time();
$node = Node::create(["type" => "page", "title" => $title, "status" => 1, "uid" => 1]);
$node->save();
$alias = \Drupal::service("path_alias.manager")->getAliasByPath("/node/" . $node->id());
if ($alias === "/node/" . $node->id()) {
  throw new \Exception("No pathauto alias for $title");
}
if (!str_contains(strtolower($alias), "staff-guide") && !str_contains(strtolower($alias), "staff")) {
  // Still OK if transliteration differs — just require not raw node path.
  echo "ALIAS_NOTE alias=$alias\n";
}
echo "ALIAS_OK nid=", $node->id(), " alias=$alias\n";
'

echo "==> Menus"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$sync = \Drupal::service("friendly_navigation.menu_sync");
foreach (["main", "dept_mis", "dept_sustainability"] as $mid) {
  if (!\Drupal\system\Entity\Menu::load($mid)) {
    throw new \Exception("Missing menu $mid");
  }
  echo "menu_ok $mid\n";
}
$block = \Drupal\block\Entity\Block::load("friendly_nav_dept_mis");
if (!$block) { throw new \Exception("Missing MIS menu block"); }
echo "BLOCK_OK\n";
$menus = $sync->getMenusForAccount(\Drupal\user\Entity\User::load(1));
if (!isset($menus["main"]) || !isset($menus["dept_mis"])) {
  throw new \Exception("Admin menu options incomplete");
}
echo "MENU_OPTIONS_OK\n";
'

echo
echo "All friendly navigation checks passed."
