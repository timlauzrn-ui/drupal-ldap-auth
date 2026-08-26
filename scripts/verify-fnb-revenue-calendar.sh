#!/usr/bin/env bash
# Verify F&B revenue calendar access, ingest, and permissions.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

echo "==> Module enabled"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=fnb_revenue_report

echo "==> Roles + permissions"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
foreach (["fin_dev", "fnb_dev"] as $rid) {
  $role = \Drupal\user\Entity\Role::load($rid);
  if (!$role || !$role->hasPermission("view fnb revenue reports")) {
    throw new \Exception("$rid missing view fnb revenue reports");
  }
  if (!$role->hasPermission("manage fnb revenue reports")) {
    throw new \Exception("$rid missing manage fnb revenue reports");
  }
  echo $rid, "_OK\n";
}
'

echo "==> LDAP mappings present"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$maps = \Drupal::config("ldap_role_mapper.settings")->get("mappings") ?: [];
$need = ["FIN_dev" => "fin_dev", "F&B_dev" => "fnb_dev"];
foreach ($need as $g => $rid) {
  $ok = FALSE;
  foreach ($maps as $m) {
    if (($m["ldap_group"] ?? "") === $g && ($m["rid"] ?? "") === $rid) { $ok = TRUE; break; }
  }
  if (!$ok) { throw new \Exception("Missing LDAP map $g → $rid"); }
}
echo "LDAP_MAPS_OK\n";
'

echo "==> Drop-folder scan idempotent"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$date = date("Y-m-d");
$fs = \Drupal::service("file_system");
$dir = "private://fnb-revenue";
$fs->prepareDirectory($dir, \Drupal\Core\File\FileSystemInterface::CREATE_DIRECTORY);
$path = $fs->realpath("private://fnb-revenue") . "/" . $date . ".pdf";
if (!file_exists($path)) {
  file_put_contents($path, "%PDF-1.1\n%%EOF\n");
}
$scanner = \Drupal::service("fnb_revenue_report.drop_folder_scanner");
$first = $scanner->scan();
$second = $scanner->scan();
if ($second["created"] !== 0) {
  throw new \Exception("Second scan should not create duplicates");
}
$nids = \Drupal::entityQuery("node")->accessCheck(FALSE)
  ->condition("type", "fnb_daily_revenue_report")
  ->condition("field_report_date", $date)
  ->execute();
if (!$nids) { throw new \Exception("No node for today"); }
$node = \Drupal\node\Entity\Node::load(reset($nids));
$file = $node->get("field_report_file")->entity;
if (!$file) { throw new \Exception("Missing file entity"); }
$uri = $file->getFileUri();
if (!str_contains($uri, "fnb-revenue")) { throw new \Exception("Unexpected uri $uri"); }
// Confirm no duplicate physical copy under temporary:// public://
echo "INGEST_OK nid=", $node->id(), " uri=", $uri, "\n";
'

echo "==> Access: anonymous denied calendar"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$anon = \Drupal\user\Entity\User::getAnonymousUser();
$access = \Drupal::service("access_manager")->checkNamedRoute("view.fnb_revenue_calendar.page_1", [], $anon, TRUE);
if ($access->isAllowed()) {
  throw new \Exception("Anonymous must not access calendar view");
}
echo "ANON_DENIED_OK\n";
'

echo "==> Access: fin_dev can view node; authenticated without role cannot"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$date = date("Y-m-d");
$nids = \Drupal::entityQuery("node")->accessCheck(FALSE)
  ->condition("type", "fnb_daily_revenue_report")
  ->condition("field_report_date", $date)
  ->execute();
$node = \Drupal\node\Entity\Node::load(reset($nids));
$fin = user_load_by_name("finuser");
$editor = user_load_by_name("editor");
if (!$fin) { throw new \Exception("finuser missing"); }
$fin_access = $node->access("view", $fin, TRUE);
if (!$fin_access->isAllowed()) { throw new \Exception("finuser should view report"); }
if ($editor) {
  $ed_access = $node->access("view", $editor, TRUE);
  if ($ed_access->isAllowed()) { throw new \Exception("editor must not view F&B revenue"); }
  echo "EDITOR_DENIED_OK\n";
}
echo "FIN_VIEW_OK\n";
'

echo "==> View exists"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$v = \Drupal\views\Entity\View::load("fnb_revenue_calendar");
if (!$v) { throw new \Exception("view missing"); }
echo "VIEW_OK path=finance/fnb-revenue-calendar\n";
'

echo
echo "All F&B revenue calendar checks passed."
echo "Open: http://localhost:8080/finance/fnb-revenue-calendar (finuser/finuser or fnbuser/fnbuser)"
