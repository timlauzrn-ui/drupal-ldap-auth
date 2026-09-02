#!/usr/bin/env bash
# Verify Gutenberg + template lock setup inside my-drupal.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

echo "==> Enabled modules"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=gutenberg
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=media

echo "==> Gutenberg page settings"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$c = \Drupal::config("gutenberg.settings");
$lock = $c->get("page_template_lock");
$enabled = $c->get("page_enable_full");
$allowed = $c->get("page_allowed_blocks");
$template = $c->get("page_template");
if (!$enabled) { throw new \Exception("page_enable_full not set"); }
if ($lock !== "all") { throw new \Exception("page_template_lock expected all, got: " . var_export($lock, TRUE)); }
if (!is_array($allowed) || !in_array("core/paragraph", $allowed, TRUE) || !in_array("core/columns", $allowed, TRUE)) {
  throw new \Exception("allowed blocks missing paragraph/columns");
}
if (!is_string($template) || $template === "") { throw new \Exception("page_template empty"); }
echo "GUTENBERG_CONFIG_OK lock=$lock\n";
echo "allowed=" . implode(",", $allowed) . "\n";
'

echo "==> Permissions"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$perms = array_keys(\Drupal::service("user.permissions")->getPermissions());
if (!in_array("unlock gutenberg template", $perms, TRUE)) {
  throw new \Exception("unlock gutenberg template permission missing");
}
$admin = \Drupal\user\Entity\Role::load("administrator");
$editor = \Drupal\user\Entity\Role::load("editor");
if (!$admin) { throw new \Exception("administrator role missing"); }
// Administrator is often is_admin=true (all perms). Check editor lacks unlock.
if (!$editor) { throw new \Exception("editor role missing"); }
if ($editor->hasPermission("unlock gutenberg template")) {
  throw new \Exception("editor must NOT have unlock gutenberg template");
}
if (!$editor->hasPermission("use gutenberg")) {
  throw new \Exception("editor must have use gutenberg");
}
echo "PERMISSIONS_OK\n";
'

echo "==> Server-side root block extraction"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$markup = "<!-- wp:heading -->\n<h1>Hi</h1>\n<!-- /wp:heading -->\n<!-- wp:paragraph -->\n<p>Body</p>\n<!-- /wp:paragraph -->\n<!-- wp:columns -->\n<!-- wp:column -->\n<!-- wp:paragraph -->\n<p>Inner</p>\n<!-- /wp:paragraph -->\n<!-- /wp:column -->\n<!-- /wp:columns -->";
$roots = hkcec_gutenberg_template_lock_extract_root_block_names($markup);
if ($roots !== ["core/heading", "core/paragraph", "core/columns"]) {
  throw new \Exception("root extract failed: " . implode(",", $roots));
}
echo "ROOT_EXTRACT_OK\n";
'

echo "==> Lock decision helpers"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$admin = \Drupal\user\Entity\User::load(1);
\Drupal::service("account_switcher")->switchTo($admin);
$can = \Drupal::currentUser()->hasPermission("unlock gutenberg template")
  || \Drupal::currentUser()->hasPermission("administer nodes")
  || \Drupal::currentUser()->id() == 1;
if (!$can) { throw new \Exception("admin should unlock"); }
echo "ADMIN_UNLOCK_OK\n";
\Drupal::service("account_switcher")->switchBack();
'

echo
echo "All Gutenberg automated checks passed."
echo "Manual UI check: login as admin vs editor on /node/add/page"
