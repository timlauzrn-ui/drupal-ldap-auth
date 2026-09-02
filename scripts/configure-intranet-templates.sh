#!/usr/bin/env bash
# Install HKCEC Intranet Gutenberg templates (landing + department pages).
# Landing → Basic page
# Department → department_page (HR / Finance / MIS style)
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${PROJECT_ROOT}/modules/custom/hkcec_gutenberg_modern_blocks"
DEST="/opt/drupal/web/modules/custom/hkcec_gutenberg_modern_blocks"
LANDING_JSON="${PROJECT_ROOT}/templates/gutenberg-landing-page.json"
DEPT_JSON="${PROJECT_ROOT}/templates/gutenberg-department-page.json"

docker exec "${CONTAINER}" mkdir -p /opt/drupal/web/modules/custom
docker exec "${CONTAINER}" rm -rf "${DEST}"
docker cp "${SRC}/." "${CONTAINER}:${DEST}"
docker exec "${CONTAINER}" chown -R www-data:www-data "${DEST}"

docker cp "${LANDING_JSON}" "${CONTAINER}:/opt/drupal/landing.json"
docker cp "${DEPT_JSON}" "${CONTAINER}:/opt/drupal/dept.json"
docker exec "${CONTAINER}" chown www-data:www-data /opt/drupal/landing.json /opt/drupal/dept.json

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en hkcec_gutenberg_modern_blocks gutenberg hkcec_gutenberg_template_lock -y

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
$nt = "Drupal\\node\\Entity\\NodeType";
$fsc = "Drupal\\field\\Entity\\FieldStorageConfig";
$fc = "Drupal\\field\\Entity\\FieldConfig";

if (!$nt::load("page")) {
  $nt::create([
    "type" => "page",
    "name" => "Basic page",
    "description" => "Intranet landing and general pages.",
    "new_revision" => TRUE,
    "display_submitted" => FALSE,
  ])->save();
}
if ($page = $nt::load("page")) {
  $page->setDisplaySubmitted(FALSE);
  $page->save();
}

if (!$nt::load("department_page")) {
  $nt::create([
    "type" => "department_page",
    "name" => "Department page",
    "description" => "HR / Finance / MIS style content pages.",
    "new_revision" => TRUE,
    "display_submitted" => FALSE,
  ])->save();
  echo "CREATED_DEPARTMENT_PAGE\n";
}
if ($dept = $nt::load("department_page")) {
  $dept->setDisplaySubmitted(FALSE);
  $dept->save();
}

if (!$fsc::loadByName("node", "body")) {
  $fsc::create([
    "field_name" => "body",
    "entity_type" => "node",
    "type" => "text_with_summary",
    "cardinality" => 1,
  ])->save();
}

foreach (["page", "department_page"] as $bundle) {
  if (!$fc::loadByName("node", $bundle, "body")) {
    $fc::create([
      "field_name" => "body",
      "entity_type" => "node",
      "bundle" => $bundle,
      "label" => "Body",
    ])->save();
  }
  $form = \Drupal::service("entity_display.repository")->getFormDisplay("node", $bundle, "default");
  $form->setComponent("body", ["type" => "text_textarea_with_summary", "weight" => 0])->save();
  $view = \Drupal::service("entity_display.repository")->getViewDisplay("node", $bundle, "default");
  $view->setComponent("body", ["type" => "text_default", "label" => "hidden", "weight" => 0])->save();
}

$landing = file_get_contents("/opt/drupal/landing.json");
$deptJson = file_get_contents("/opt/drupal/dept.json");
if ($landing === FALSE || $deptJson === FALSE) {
  throw new \Exception("Missing landing/dept JSON in container");
}
json_decode($landing);
if (json_last_error()) { throw new \Exception("Invalid landing JSON"); }
json_decode($deptJson);
if (json_last_error()) { throw new \Exception("Invalid department JSON"); }

$blocks = [
  "hkcec/ad-slider",
  "hkcec/resource-grid",
  "hkcec/hot-news",
  "hkcec/page-intro",
  "hkcec/quick-nav",
  "hkcec/dept-layout",
  "hkcec/hero",
  "hkcec/feature-card",
  "core/paragraph",
  "core/heading",
  "core/list",
  "core/image",
  "core/gallery",
  "core/file",
  "core/embed",
  "core/columns",
  "core/column",
  "core/group",
  "core/buttons",
  "core/button",
  "core/spacer",
  "core/separator",
  "core/html",
];

$c = \Drupal::configFactory()->getEditable("gutenberg.settings");
$c->set("page_enable_full", TRUE);
$c->set("page_template", $landing);
$c->set("page_template_lock", "all");
$c->set("page_allowed_blocks", $blocks);
$c->set("department_page_enable_full", TRUE);
$c->set("department_page_template", $deptJson);
$c->set("department_page_template_lock", "all");
$c->set("department_page_allowed_blocks", $blocks);
$c->save();
echo "INTRANET_TEMPLATES_OK\n";
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator \
  'create department_page content,edit any department_page content,edit own department_page content,delete any department_page content,delete own department_page content' || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add editor \
  'create department_page content,edit own department_page content,edit any department_page content' || true

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

echo
echo "Intranet Gutenberg templates ready."
echo "  Landing (home):   http://localhost:8080/node/add/page"
echo "  Department (HR):  http://localhost:8080/node/add/department_page"
echo
echo "JSON sources:"
echo "  templates/gutenberg-landing-page.json"
echo "  templates/gutenberg-department-page.json"
echo
echo "Top nav (HKCEC Intranet / HR / Finance / MIS / Others) = Main menu in the theme,"
echo "not part of the Gutenberg body template."
