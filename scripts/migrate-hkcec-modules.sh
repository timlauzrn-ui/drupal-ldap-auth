#!/usr/bin/env bash
# Migrate live container from legacy custom module names to hkcec_* prefixes.
# Safe order: copy new modules → rewrite DB core.extension/config → clear caches.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DB_FILE="${DB_FILE:-/opt/drupal/web/default/files/.ht.sqlite}"

MODULES=(
  ldap_role_mapper:hkcec_ldap_role_mapper
  gutenberg_template_lock:hkcec_gutenberg_template_lock
  gutenberg_modern_blocks:hkcec_gutenberg_modern_blocks
  department_access:hkcec_department_access
  friendly_navigation:hkcec_friendly_navigation
  log_center:hkcec_log_center
  fnb_revenue_report:hkcec_fnb_revenue_report
)

echo "==> Copying HKCEC modules into ${CONTAINER}..."
docker exec "${CONTAINER}" mkdir -p /opt/drupal/web/modules/custom
for pair in "${MODULES[@]}"; do
  new="${pair##*:}"
  src="${PROJECT_ROOT}/modules/custom/${new}"
  dest="/opt/drupal/web/modules/custom/${new}"
  docker exec "${CONTAINER}" rm -rf "${dest}"
  docker cp "${src}/." "${CONTAINER}:${dest}"
done
docker exec "${CONTAINER}" chown -R www-data:www-data /opt/drupal/web/modules/custom

echo "==> Rewriting core.extension + config in SQLite (${DB_FILE})..."
docker exec "${CONTAINER}" php -r '
$db = new PDO("sqlite:'"${DB_FILE}"'");
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$row = $db->query("SELECT data FROM config WHERE name = \"core.extension\"")->fetch(PDO::FETCH_ASSOC);
if (!$row) { fwrite(STDERR, "core.extension missing\n"); exit(1); }
$data = unserialize($row["data"]);
$map = [
  "ldap_role_mapper" => "hkcec_ldap_role_mapper",
  "gutenberg_template_lock" => "hkcec_gutenberg_template_lock",
  "gutenberg_modern_blocks" => "hkcec_gutenberg_modern_blocks",
  "department_access" => "hkcec_department_access",
  "friendly_navigation" => "hkcec_friendly_navigation",
  "log_center" => "hkcec_log_center",
  "fnb_revenue_report" => "hkcec_fnb_revenue_report",
];
$modules = $data["module"];
foreach ($map as $old => $new) {
  if (isset($modules[$old])) {
    $modules[$new] = $modules[$old];
    unset($modules[$old]);
    echo "core.extension: $old -> $new\n";
  }
}
asort($modules, SORT_NUMERIC);
$data["module"] = $modules;
$db->prepare("UPDATE config SET data = ? WHERE name = \"core.extension\"")->execute([serialize($data)]);

foreach ([
  "ldap_role_mapper.settings" => "hkcec_ldap_role_mapper.settings",
  "department_access.settings" => "hkcec_department_access.settings",
  "log_center.settings" => "hkcec_log_center.settings",
  "fnb_revenue_report.settings" => "hkcec_fnb_revenue_report.settings",
] as $old => $new) {
  $c = $db->prepare("SELECT data FROM config WHERE name = ?");
  $c->execute([$old]);
  $r = $c->fetch(PDO::FETCH_ASSOC);
  if (!$r) { continue; }
  $db->prepare("DELETE FROM config WHERE name = ?")->execute([$new]);
  $db->prepare("UPDATE config SET name = ? WHERE name = ?")->execute([$new, $old]);
  echo "config: $old -> $new\n";
}

$c = $db->query("SELECT data FROM config WHERE name = \"gutenberg.settings\"")->fetch(PDO::FETCH_ASSOC);
if ($c) {
  $g = unserialize($c["data"]);
  $walk = function (&$v) use (&$walk) {
    if (is_string($v)) {
      $v = str_replace(["modern-blocks/", "gutenberg_modern_blocks"], ["hkcec/", "hkcec_gutenberg_modern_blocks"], $v);
    } elseif (is_array($v)) {
      foreach ($v as &$x) { $walk($x); }
    }
  };
  $walk($g);
  $db->prepare("UPDATE config SET data = ? WHERE name = \"gutenberg.settings\"")->execute([serialize($g)]);
  echo "gutenberg.settings rewritten\n";
}

$schema = $db->query("SELECT name, value FROM key_value WHERE collection=\"system.schema\"")->fetchAll(PDO::FETCH_ASSOC);
foreach ($schema as $r) {
  if (isset($map[$r["name"]])) {
    $new = $map[$r["name"]];
    $db->prepare("DELETE FROM key_value WHERE collection=\"system.schema\" AND name=?")->execute([$new]);
    $db->prepare("UPDATE key_value SET name=? WHERE collection=\"system.schema\" AND name=?")->execute([$new, $r["name"]]);
    echo "schema: {$r["name"]} -> $new\n";
  }
}

// Log Center table: copy if needed (ALTER can fail on NOCASE_UTF8 indexes).
$tables = $db->query("SELECT name FROM sqlite_master WHERE type=\"table\"")->fetchAll(PDO::FETCH_COLUMN);
if (in_array("log_center_entry", $tables, true) && !in_array("hkcec_log_center_entry", $tables, true)) {
  echo "NOTE: create hkcec_log_center_entry via install schema after boot\n";
}

foreach (["cache_bootstrap","cache_container","cache_config","cache_discovery","cache_data"] as $t) {
  try { $db->exec("DELETE FROM \"$t\""); } catch (Throwable $e) {}
}
echo "DB_OK\n";
'

# Remove legacy dirs after DB rename so ModuleHandler resolves hkcec_* only.
for pair in "${MODULES[@]}"; do
  old="${pair%%:*}"
  docker exec "${CONTAINER}" rm -rf "/opt/drupal/web/modules/custom/${old}"
done

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$schema = \Drupal::database()->schema();
if (!$schema->tableExists("hkcec_log_center_entry")) {
  require_once DRUPAL_ROOT . "/modules/custom/hkcec_log_center/hkcec_log_center.install";
  foreach (hkcec_log_center_schema() as $table => $def) {
    $schema->createTable($table, $def);
    echo "created $table\n";
  }
}
if (\Drupal::database()->schema()->tableExists("log_center_entry") && \Drupal::database()->schema()->tableExists("hkcec_log_center_entry")) {
  try {
    \Drupal::database()->query("INSERT OR IGNORE INTO {hkcec_log_center_entry} SELECT * FROM {log_center_entry}");
    echo "copied log rows\n";
  } catch (\Throwable $e) {
    echo "copy_skip: ", $e->getMessage(), "\n";
  }
}
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

echo "==> Re-applying intranet templates..."
chmod +x "${SCRIPT_DIR}/configure-intranet-templates.sh"
CONTAINER="${CONTAINER}" "${SCRIPT_DIR}/configure-intranet-templates.sh" || true

echo
echo "HKCEC migration finished on ${CONTAINER}."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --format=list | grep '^hkcec_' || true
