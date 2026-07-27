#!/usr/bin/env bash
# Install LDAP + Gutenberg stacks and custom modules into the running my-drupal container.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

LDAP_SRC="${PROJECT_ROOT}/modules/custom/ldap_role_mapper"
LDAP_DEST="/opt/drupal/web/modules/custom/ldap_role_mapper"
GTL_SRC="${PROJECT_ROOT}/modules/custom/gutenberg_template_lock"
GTL_DEST="/opt/drupal/web/modules/custom/gutenberg_template_lock"
PATCHES_DIR="${PROJECT_ROOT}/patches"

if ! docker inspect -f '{{.State.Running}}' "${CONTAINER}" 2>/dev/null | grep -qx true; then
  echo "Error: container '${CONTAINER}' is not running." >&2
  echo "Start it first, e.g.: docker start ${CONTAINER}" >&2
  exit 1
fi

composer_require() {
  if docker exec -u www-data -w /opt/drupal "${CONTAINER}" test -w composer.json 2>/dev/null; then
    docker exec -u www-data -w /opt/drupal "${CONTAINER}" composer require "$@" --no-interaction
  else
    docker exec -w /opt/drupal "${CONTAINER}" composer require "$@" --no-interaction
    docker exec "${CONTAINER}" chown -R www-data:www-data /opt/drupal/vendor /opt/drupal/composer.json /opt/drupal/composer.lock /opt/drupal/web/modules/contrib 2>/dev/null || true
  fi
}

copy_custom_module() {
  local src="$1"
  local dest="$2"
  docker exec "${CONTAINER}" mkdir -p "$(dirname "${dest}")"
  docker exec "${CONTAINER}" rm -rf "${dest}"
  docker cp "${src}/." "${CONTAINER}:${dest}"
  docker exec "${CONTAINER}" chown -R www-data:www-data "${dest}"
}

echo "==> Ensuring PHP LDAP extension..."
if ! docker exec "${CONTAINER}" php -m 2>/dev/null | grep -qi '^ldap$'; then
  docker exec "${CONTAINER}" bash -c 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y libldap2-dev \
    && (docker-php-ext-configure ldap --with-libdir=lib/$(uname -m)-linux-gnu || docker-php-ext-configure ldap) \
    && docker-php-ext-install ldap'
  docker exec "${CONTAINER}" apachectl graceful || true
fi

echo "==> Ensuring Composer packages..."
composer_require 'drupal/ldap:^4.12' 'drupal/externalauth:^2.0' 'drush/drush' 'drupal/gutenberg:3.0.6'

echo "==> Applying Gutenberg compatibility patches (if present)..."
if [[ -d "${PATCHES_DIR}" ]]; then
  docker exec "${CONTAINER}" bash -c 'command -v patch >/dev/null || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y patch)'
  GUTENBERG_DIR="/opt/drupal/web/modules/contrib/gutenberg"
  for patch in \
    gutenberg-drupal-114-route-methods.patch \
    gutenberg-php85-nullable-and-empty-field-guard.patch
  do
    if [[ -f "${PATCHES_DIR}/${patch}" ]]; then
      docker cp "${PATCHES_DIR}/${patch}" "${CONTAINER}:/tmp/${patch}"
      docker exec "${CONTAINER}" bash -c "cd '${GUTENBERG_DIR}' && patch -p1 --forward < '/tmp/${patch}' || true"
    fi
  done
  # Skip group-node patch unless group module is installed.
fi

echo "==> Copying custom modules..."
copy_custom_module "${LDAP_SRC}" "${LDAP_DEST}"
copy_custom_module "${GTL_SRC}" "${GTL_DEST}"

if ! docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush status --fields=bootstrap 2>/dev/null | grep -qi 'Successful'; then
  echo "==> Drupal is not installed yet. Preparing sites/default permissions..."
  docker exec "${CONTAINER}" bash -c 'mkdir -p /opt/drupal/web/sites/default/files && chown -R www-data:www-data /opt/drupal/web/sites/default && chmod 755 /opt/drupal/web/sites/default && cp -n /opt/drupal/web/sites/default/default.settings.php /opt/drupal/web/sites/default/settings.php 2>/dev/null; chown www-data:www-data /opt/drupal/web/sites/default/settings.php; chmod 666 /opt/drupal/web/sites/default/settings.php'
  echo "==> Installing standard profile (SQLite)..."
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush site:install standard \
    --db-url='sqlite://sites/default/files/.ht.sqlite' \
    --site-name='Drupal LDAP Auth' \
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

echo "==> Configuring Gutenberg Page template (lock=all)..."
chmod +x "${SCRIPT_DIR}/configure-gutenberg-page.sh"
CONTAINER="${CONTAINER}" "${SCRIPT_DIR}/configure-gutenberg-page.sh"

echo "==> Clearing caches..."
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr

echo
echo "Done."
echo "Admin login: admin / admin"
echo "Next steps:"
echo "  LDAP: /admin/config/people/ldap/server"
echo "  Role mapper: /admin/config/people/ldap-role-mapper"
echo "  Gutenberg Page: Structure → Content types → Page → Gutenberg"
echo "  Create/edit a Page at /node/add/page (admin unlocked; editor locked)"
