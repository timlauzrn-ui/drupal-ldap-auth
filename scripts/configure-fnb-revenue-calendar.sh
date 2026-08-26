#!/usr/bin/env bash
# Configure F&B Daily Revenue Report calendar (roles, LDAP maps, content type, FullCalendar, drop-folder).
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${PROJECT_ROOT}/modules/custom/fnb_revenue_report"
DEST="/opt/drupal/web/modules/custom/fnb_revenue_report"

composer_require() {
  if docker exec -u www-data -w /opt/drupal "${CONTAINER}" test -w composer.json 2>/dev/null; then
    docker exec -u www-data -w /opt/drupal "${CONTAINER}" composer require "$@" --no-interaction
  else
    docker exec -w /opt/drupal "${CONTAINER}" composer require "$@" --no-interaction
    docker exec "${CONTAINER}" chown -R www-data:www-data /opt/drupal/vendor /opt/drupal/composer.json /opt/drupal/composer.lock /opt/drupal/web/modules/contrib 2>/dev/null || true
  fi
}

echo "==> Copy fnb_revenue_report module..."
docker exec "${CONTAINER}" mkdir -p /opt/drupal/web/modules/custom
docker exec "${CONTAINER}" rm -rf "${DEST}"
docker cp "${SRC}/." "${CONTAINER}:${DEST}"
docker exec "${CONTAINER}" chown -R www-data:www-data "${DEST}"

echo "==> Ensure private files path + fnb-revenue drop folder..."
docker exec "${CONTAINER}" bash -c '
SETTINGS=/opt/drupal/web/sites/default/settings.php
PRIVATE=/opt/drupal/web/sites/default/files/private
mkdir -p "$PRIVATE/fnb-revenue"
chown -R www-data:www-data /opt/drupal/web/sites/default/files
if [ ! -f "$PRIVATE/.htaccess" ]; then
  printf "Require all denied\n" > "$PRIVATE/.htaccess"
fi
if ! grep -E "^[[:space:]]*\$settings\[.file_private_path.\]" "$SETTINGS" | grep -vq "^[[:space:]]*#"; then
  cat >> "$SETTINGS" <<EOF

\$settings["file_private_path"] = "sites/default/files/private";
EOF
fi
'

echo "==> Require FullCalendar View (contrib)..."
composer_require 'drupal/fullcalendar_view:^5.2' || composer_require 'drupal/fullcalendar_view:^5.3@alpha' || true

echo "==> Enable modules..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en \
  datetime file node user views views_ui fullcalendar_view fnb_revenue_report ldap_role_mapper -y

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
\Drupal::moduleHandler()->loadInclude("fnb_revenue_report", "install");
fnb_revenue_report_ensure_bundle();
fnb_revenue_report_ensure_drop_folder();
echo "BUNDLE_OK\n";
'

echo "==> Roles + permissions..."
for role in fin_dev fnb_dev; do
  label=$( [ "$role" = "fin_dev" ] && echo "FIN Dev" || echo "F&B Dev" )
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:create "${role}" "${label}" 2>/dev/null || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'access content' || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'view fnb revenue reports' || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'manage fnb revenue reports' || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'create fnb_daily_revenue_report content' || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'edit any fnb_daily_revenue_report content' || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'delete any fnb_daily_revenue_report content' || true
done
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator 'view fnb revenue reports' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator 'manage fnb revenue reports' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator 'administer fnb revenue report' || true

echo "==> LDAP role mapper stubs (FIN_dev / F&B_dev)..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$cfg = \Drupal::configFactory()->getEditable("ldap_role_mapper.settings");
$mappings = $cfg->get("mappings") ?: [];
$wanted = [
  ["ldap_group" => "FIN_dev", "rid" => "fin_dev"],
  ["ldap_group" => "F&B_dev", "rid" => "fnb_dev"],
  ["ldap_group" => "FB_dev", "rid" => "fnb_dev"],
];
foreach ($wanted as $row) {
  $found = FALSE;
  foreach ($mappings as $m) {
    if (($m["ldap_group"] ?? "") === $row["ldap_group"] && ($m["rid"] ?? "") === $row["rid"]) {
      $found = TRUE;
      break;
    }
  }
  if (!$found) {
    $mappings[] = $row;
  }
}
$cfg->set("mappings", $mappings)->save();
echo "LDAP_MAP_OK count=", count($mappings), "\n";
'

echo "==> Demo users..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:create finuser --mail=fin@example.com --password=finuser 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:role:add fin_dev finuser 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:create fnbuser --mail=fnb@example.com --password=fnbuser 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:role:add fnb_dev fnbuser 2>/dev/null || true

echo "==> FullCalendar View page..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\views\Entity\View;

$vid = "fnb_revenue_calendar";
if ($existing = View::load($vid)) {
  $existing->delete();
}

$view = View::create([
  "id" => $vid,
  "label" => "F&B Revenue Calendar",
  "module" => "views",
  "base_table" => "node_field_data",
  "base_field" => "nid",
  "status" => TRUE,
  "display" => [
    "default" => [
      "display_plugin" => "default",
      "id" => "default",
      "display_title" => "Default",
      "position" => 0,
      "display_options" => [
        "title" => "F&B Daily Revenue Reports",
        "access" => [
          "type" => "perm",
          "options" => ["perm" => "view fnb revenue reports"],
        ],
        "cache" => ["type" => "tag", "options" => []],
        "query" => ["type" => "views_query", "options" => []],
        "exposed_form" => ["type" => "basic", "options" => []],
        "pager" => ["type" => "none", "options" => ["offset" => 0]],
        "style" => [
          "type" => "fullcalendar_view_display",
          "options" => [
            "default_date_source" => "now",
            "defaultDate" => "today",
            "start" => "field_report_date",
            "end" => "",
            "title" => "title",
            "right_buttons" => "dayGridMonth,timeGridWeek,listYear",
            "default_view" => "dayGridMonth",
          ],
        ],
        "row" => ["type" => "fields"],
        "fields" => [
          "title" => [
            "id" => "title",
            "table" => "node_field_data",
            "field" => "title",
            "plugin_id" => "field",
            "label" => "",
            "alter" => ["alter_text" => FALSE],
            "element_default_classes" => TRUE,
            "type" => "string",
            "settings" => ["link_to_entity" => TRUE],
          ],
          "field_report_date" => [
            "id" => "field_report_date",
            "table" => "node__field_report_date",
            "field" => "field_report_date",
            "plugin_id" => "field",
            "label" => "",
            "type" => "datetime_default",
            "settings" => [
              "timezone_override" => "",
              "format_type" => "html_date",
            ],
          ],
        ],
        "filters" => [
          "status" => [
            "id" => "status",
            "table" => "node_field_data",
            "field" => "status",
            "plugin_id" => "boolean",
            "value" => "1",
            "group" => 1,
            "expose" => ["operator" => FALSE],
          ],
          "type" => [
            "id" => "type",
            "table" => "node_field_data",
            "field" => "type",
            "plugin_id" => "bundle",
            "value" => ["fnb_daily_revenue_report" => "fnb_daily_revenue_report"],
            "group" => 1,
          ],
        ],
        "filter_groups" => [
          "operator" => "AND",
          "groups" => [1 => "AND"],
        ],
      ],
    ],
    "page_1" => [
      "display_plugin" => "page",
      "id" => "page_1",
      "display_title" => "Page",
      "position" => 1,
      "display_options" => [
        "path" => "finance/fnb-revenue-calendar",
        "menu" => [
          "type" => "normal",
          "title" => "F&B Revenue Calendar",
          "description" => "Daily F&B revenue reports",
          "expanded" => FALSE,
          "parent" => "system.admin_reports",
          "weight" => 10,
          "context" => "0",
          "menu_name" => "admin",
        ],
        "display_extenders" => [],
      ],
    ],
  ],
]);
$view->save();
echo "VIEW_OK\n";
'

# Also add a public/main menu link with role-based access via custom menu - use Tools menu for authenticated finance users.
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$storage = \Drupal::entityTypeManager()->getStorage("menu_link_content");
$found = $storage->loadByProperties(["link.uri" => "internal:/finance/fnb-revenue-calendar", "menu_name" => "main"]);
foreach ($found as $link) { $link->delete(); }
$link = $storage->create([
  "title" => "F&B Revenue Calendar",
  "link" => ["uri" => "internal:/finance/fnb-revenue-calendar"],
  "menu_name" => "main",
  "weight" => 50,
  "enabled" => TRUE,
]);
$link->save();
echo "MENU_OK\n";
'

echo "==> Seed stub PDF for local verify (simulates J-drive drop)..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$date = date("Y-m-d");
$fs = \Drupal::service("file_system");
$dir = "private://fnb-revenue";
$fs->prepareDirectory($dir, \Drupal\Core\File\FileSystemInterface::CREATE_DIRECTORY);
$path = $fs->realpath("private://fnb-revenue");
$file = $path . "/" . $date . ".pdf";
if (!file_exists($file)) {
  $pdf = "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";
  file_put_contents($file, $pdf);
}
echo "STUB=", $file, "\n";
$stats = \Drupal::service("fnb_revenue_report.drop_folder_scanner")->scan();
print_r($stats);
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo
echo "FNB_REVENUE_CALENDAR_CONFIG_OK"
echo "Calendar: http://localhost:8080/finance/fnb-revenue-calendar"
echo "Settings: http://localhost:8080/admin/config/content/fnb-revenue-report"
echo "Users: finuser/finuser (fin_dev), fnbuser/fnbuser (fnb_dev)"
echo "Drop folder (mount target): sites/default/files/private/fnb-revenue/"
echo "Filename convention: YYYY-MM-DD.pdf"
