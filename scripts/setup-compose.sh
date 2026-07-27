#!/usr/bin/env bash
# First-time setup for docker compose stack (friend / fork workflow).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONTAINER="${CONTAINER:-drupal-ldap-auth}"

cd "${PROJECT_ROOT}"

echo "==> Building and starting containers..."
docker compose up -d --build

echo "==> Waiting for Drupal container..."
for i in $(seq 1 60); do
  if docker exec "${CONTAINER}" test -f /opt/drupal/vendor/bin/drush 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "==> Applying Gutenberg patches (best-effort)..."
if [[ -d "${PROJECT_ROOT}/patches" ]]; then
  for patch in \
    gutenberg-drupal-114-route-methods.patch \
    gutenberg-php85-nullable-and-empty-field-guard.patch
  do
    if [[ -f "${PROJECT_ROOT}/patches/${patch}" ]]; then
      docker exec "${CONTAINER}" bash -c "cd /opt/drupal/web/modules/contrib/gutenberg && patch -p1 --forward < /opt/drupal/patches/${patch} || true" 2>/dev/null \
        || docker cp "${PROJECT_ROOT}/patches/${patch}" "${CONTAINER}:/tmp/${patch}" \
        && docker exec "${CONTAINER}" bash -c "cd /opt/drupal/web/modules/contrib/gutenberg && patch -p1 --forward < /tmp/${patch} || true"
    fi
  done
fi

# Mount provides modules/custom; ensure ownership.
docker exec "${CONTAINER}" chown -R www-data:www-data /opt/drupal/web/modules/custom || true

if ! docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush status --fields=bootstrap 2>/dev/null | grep -qi 'Successful'; then
  echo "==> Installing Drupal (MySQL)..."
  docker exec "${CONTAINER}" bash -c 'mkdir -p /opt/drupal/web/sites/default/files && chown -R www-data:www-data /opt/drupal/web/sites/default && chmod -R 775 /opt/drupal/web/sites/default'
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush site:install standard \
    --db-url='mysql://drupal:drupal@mysql:3306/drupal' \
    --site-name='Drupal LDAP + Gutenberg' \
    --account-name=admin \
    --account-pass=admin \
    -y
fi

echo "==> Enabling modules..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en \
  externalauth \
  ldap_servers \
  ldap_user \
  ldap_authentication \
  ldap_role_mapper \
  media \
  media_library \
  file \
  image \
  gutenberg \
  gutenberg_template_lock \
  -y

echo "==> Configuring Gutenberg Page template..."
CONTAINER="${CONTAINER}" "${SCRIPT_DIR}/configure-gutenberg-page.sh"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

echo
echo "Ready: http://localhost:8080"
echo "Admin: admin / admin"
echo "Editor (after configure script): create with scripts or UI"
echo
echo "Develop: edit modules/custom/* on the host; they are bind-mounted into the container."
echo "Then: docker exec -u www-data -w /opt/drupal ${CONTAINER} vendor/bin/drush cr"
