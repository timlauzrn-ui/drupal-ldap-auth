#!/usr/bin/env bash
# Install and enable Log Center on the running Drupal container.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${PROJECT_ROOT}/modules/custom/hkcec_log_center"
DEST="/opt/drupal/web/modules/custom/hkcec_log_center"

docker exec "${CONTAINER}" mkdir -p /opt/drupal/web/modules/custom
docker exec "${CONTAINER}" rm -rf "${DEST}"
docker cp "${SRC}/." "${CONTAINER}:${DEST}"
docker exec "${CONTAINER}" chown -R www-data:www-data "${DEST}"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en hkcec_log_center -y
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:create security 'Security' 2>/dev/null || true
# Grant one permission per call (Drush treats commas as separators).
for role in administrator security; do
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'view log center' || true
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" 'administer log center' || true
done

# Demo security user.
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:create secuser --mail=security@example.com --password=secuser 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:role:add security secuser 2>/dev/null || true

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "LOG_CENTER_CONFIG_OK"
echo "UI: http://localhost:8080/admin/reports/log-center"
echo "Settings: http://localhost:8080/admin/config/development/log-center"
echo "Users: admin/admin, secuser/secuser (security role)"
