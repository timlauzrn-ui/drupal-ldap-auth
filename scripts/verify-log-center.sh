#!/usr/bin/env bash
# Verify Log Center capture, search, export, retention.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

echo "==> Module + permissions"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=log_center
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$role = \Drupal\user\Entity\Role::load("security");
if (!$role || !$role->hasPermission("view log center")) {
  throw new \Exception("security role missing view log center");
}
echo "SECURITY_ROLE_OK\n";
'

echo "==> Write sample logs"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$w = \Drupal::service("log_center.writer");
$w->access("VERIFY access hit", ["path" => "/verify-access", "status_code" => 200, "method" => "GET"]);
$w->error("VERIFY controlled error", ["channel" => "verify"]);
$w->security("VERIFY failed login sim", ["status_code" => 401, "username" => "baduser"]);
$w->custom("VERIFY node change sim", ["channel" => "entity"]);
$w->waf("VERIFY waf stub", ["path" => "/evil", "status_code" => 403]);
echo "SAMPLES_OK\n";
'

echo "==> Query filters + sort"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$q = \Drupal::service("log_center.query");
$access = $q->build(["types" => ["access"], "path" => "verify-access"], "timestamp", "DESC")->range(0, 5)->execute()->fetchAll();
if (!$access) { throw new \Exception("access filter failed"); }
$sec = $q->build(["type" => "security"], "timestamp", "DESC")->range(0, 5)->execute()->fetchAll();
if (!$sec) { throw new \Exception("security filter failed"); }
echo "FILTER_SORT_OK count_access=", count($access), " count_security=", count($sec), "\n";
'

echo "==> Retention purge"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$db = \Drupal::database();
$old = \Drupal::time()->getRequestTime() - (200 * 86400);
$db->insert("log_center_entry")->fields([
  "type" => "custom",
  "severity" => "info",
  "timestamp" => $old,
  "uid" => 0,
  "username" => "old",
  "ip" => "127.0.0.1",
  "method" => "GET",
  "path" => "/old",
  "status_code" => 200,
  "user_agent" => "verify",
  "message" => "OLD_ROW_TO_PURGE",
  "context" => NULL,
  "channel" => "verify",
])->execute();
$deleted = \Drupal::service("log_center.retention")->purge();
$left = $db->select("log_center_entry", "l")->fields("l", ["id"])->condition("message", "OLD_ROW_TO_PURGE")->countQuery()->execute()->fetchField();
if ((int) $left !== 0) { throw new \Exception("purge failed, row still present"); }
echo "RETENTION_OK deleted=$deleted\n";
'

echo "==> Route access"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$access = \Drupal::service("access_manager")->checkNamedRoute("log_center.overview", [], \Drupal\user\Entity\User::getAnonymousUser(), TRUE);
if ($access->isAllowed()) { throw new \Exception("anonymous must not access log center"); }
echo "ANON_DENIED_OK\n";
'

echo
echo "All Log Center checks passed."
echo "Open: http://localhost:8080/admin/reports/log-center"
