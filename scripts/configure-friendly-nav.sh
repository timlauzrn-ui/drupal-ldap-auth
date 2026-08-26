#!/usr/bin/env bash
# Configure Pathauto, Easy Breadcrumb, private media files, public + department menus.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Copy friendly_navigation module..."
docker exec "${CONTAINER}" mkdir -p /opt/drupal/web/modules/custom
docker exec "${CONTAINER}" rm -rf /opt/drupal/web/modules/custom/friendly_navigation
docker cp "${PROJECT_ROOT}/modules/custom/friendly_navigation/." "${CONTAINER}:/opt/drupal/web/modules/custom/friendly_navigation"
docker exec "${CONTAINER}" chown -R www-data:www-data /opt/drupal/web/modules/custom/friendly_navigation

echo "==> Ensure private files path in settings.php..."
docker exec "${CONTAINER}" bash -c "
PRIVATE=/opt/drupal/web/sites/default/files/private
mkdir -p \"\$PRIVATE\"
chown -R www-data:www-data /opt/drupal/web/sites/default/files
SETTINGS=/opt/drupal/web/sites/default/settings.php
chmod u+w \"\$SETTINGS\" || true
# Ignore commented defaults; require an active assignment.
if ! grep -E \"^[[:space:]]*\\\$settings\\[.file_private_path.\\]\" \"\$SETTINGS\" | grep -vq '^[[:space:]]*#'; then
  cat >> \"\$SETTINGS\" <<'EOF'

/**
 * Private file path (Friendly Navigation / department media).
 */
\$settings[\"file_private_path\"] = \"sites/default/files/private\";
EOF
fi
if [[ ! -f \"\$PRIVATE/.htaccess\" ]]; then
  cat > \"\$PRIVATE/.htaccess\" <<'EOF'
# Deny all requests from Apache.
Require all denied
EOF
  chown www-data:www-data \"\$PRIVATE/.htaccess\"
fi
"

echo "==> Enable modules..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en \
  pathauto token easy_breadcrumb menu_ui menu_link_content \
  friendly_navigation \
  -y

echo "==> Pathauto patterns + settings..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\pathauto\Entity\PathautoPattern;
use Drupal\Component\Uuid\Php as Uuid;

$defs = [
  ["friendly_page", "Friendly page", "canonical_entities:node", "[node:title]", "page"],
  ["friendly_article", "Friendly article", "canonical_entities:node", "news/[node:title]", "article"],
  ["friendly_media", "Friendly media", "canonical_entities:media", "media/[media:mid]-[media:name]", NULL],
];
$uuid = new Uuid();
foreach ($defs as [$id, $label, $type, $pattern, $bundle]) {
  if (PathautoPattern::load($id)) {
    echo "pattern_exists $id\n";
    continue;
  }
  /** @var \Drupal\pathauto\Entity\PathautoPattern $entity */
  $entity = PathautoPattern::create([
    "id" => $id,
    "label" => $label,
    "type" => $type,
    "pattern" => $pattern,
    "weight" => -10,
  ]);
  if ($bundle) {
    $entity->addSelectionCondition([
      "id" => "entity_bundle:node",
      "bundles" => [$bundle => $bundle],
      "negate" => FALSE,
      "context_mapping" => ["node" => "node"],
    ]);
  }
  $entity->save();
  echo "pattern_created $id\n";
}
\Drupal::configFactory()->getEditable("pathauto.settings")
  ->set("update_action", 2)
  ->save();
echo "PATHAUTO_OK\n";
'

echo "==> Switch media fields to private://"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\field\Entity\FieldStorageConfig;
$fields = [
  ["media", "field_media_image"],
  ["media", "field_media_document"],
  ["media", "field_media_file"],
];
foreach ($fields as [$entity, $name]) {
  $storage = FieldStorageConfig::loadByName($entity, $name);
  if (!$storage) {
    echo "skip_missing $entity.$name\n";
    continue;
  }
  $settings = $storage->getSettings();
  $settings["uri_scheme"] = "private";
  $storage->setSettings($settings);
  $storage->save();
  echo "private_ok $entity.$name\n";
}
'

echo "==> Sync menus and blocks..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
\Drupal::service("friendly_navigation.menu_sync")->syncAll();
echo "MENU_SYNC_OK\n";
'

# Create stub About / News pages so starter links resolve (optional).
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
use Drupal\node\Entity\Node;
foreach ([["About", "about"], ["News", "news"]] as [$title, $hint]) {
  $nids = \Drupal::entityQuery("node")->accessCheck(FALSE)->condition("type", "page")->condition("title", $title)->range(0, 1)->execute();
  if ($nids) { echo "page_exists $title\n"; continue; }
  $node = Node::create(["type" => "page", "title" => $title, "status" => 1, "uid" => 1]);
  $node->save();
  echo "page_created $title nid=", $node->id(), "\n";
}
'

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "FRIENDLY_NAV_CONFIG_OK"
