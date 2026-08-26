#!/usr/bin/env bash
# Apply a SAFE flat Gutenberg template for Basic page (avoids nested/[] attr bugs).
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

# Write PHP to a temp file to avoid bash quoting issues with [] inside single quotes.
TMP_PHP="$(mktemp)"
cat > "${TMP_PHP}" <<'PHP'
$config = \Drupal::configFactory()->getEditable('gutenberg.settings');
$config->set('page_enable_full', TRUE);

// SAFE: flat blocks only; empty attributes MUST be objects {}, never [].
$json = '[["core/heading",{"level":1,"placeholder":"Page title"}],["core/paragraph",{"placeholder":"Intro — edit this text in place"}],["core/heading",{"level":2,"placeholder":"Section heading"}],["core/paragraph",{"placeholder":"Body paragraph for testing"}],["core/image",{}],["core/paragraph",{"placeholder":"Caption or follow-up text under the image"}],["core/list",{}]]';

$config->set('page_template', $json);
$config->set('page_template_lock', 'all');
$config->set('page_allowed_blocks', [
  'core/paragraph',
  'core/heading',
  'core/list',
  'core/image',
  'core/file',
  'core/embed',
  'core/columns',
  'core/column',
  'core/group',
  'core/media-text',
]);
$config->save();

echo "SAFE_TEMPLATE_APPLIED\n";
echo $json, "\n";
echo 'lock=', $config->get('page_template_lock'), "\n";
PHP

docker cp "${TMP_PHP}" "${CONTAINER}:/tmp/apply-safe-gutenberg-template.php"
rm -f "${TMP_PHP}"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:script /tmp/apply-safe-gutenberg-template.php \
  || docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval "$(docker exec "${CONTAINER}" cat /tmp/apply-safe-gutenberg-template.php)"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

echo
echo "Done. Test at: http://localhost:8080/node/add/page"
echo
echo "Safe template JSON (also pasteable in Content type → Gutenberg → Template):"
cat <<'EOF'
[
  ["core/heading", {"level": 1, "placeholder": "Page title"}],
  ["core/paragraph", {"placeholder": "Intro — edit this text in place"}],
  ["core/heading", {"level": 2, "placeholder": "Section heading"}],
  ["core/paragraph", {"placeholder": "Body paragraph for testing"}],
  ["core/image", {}],
  ["core/paragraph", {"placeholder": "Caption or follow-up text under the image"}],
  ["core/list", {}]
]
EOF
