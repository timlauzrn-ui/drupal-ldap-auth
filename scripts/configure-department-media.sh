#!/usr/bin/env bash
# Seed department roles/folders and grant MIS media permissions.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush en taxonomy media media_library media_directories hkcec_department_access -y

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
\Drupal::service("hkcec_department_access.role_ensurer")->ensureRoles();
\Drupal::service("hkcec_department_access.folder_sync")->sync();
$resolver = \Drupal::service("hkcec_department_access.resolver");
$depts = $resolver->getDepartments();
foreach ($depts as $id => $d) {
  $tid = $resolver->getFolderTermIdForDepartment($id);
  echo $id, " role=", $d["role"], " folder=", $d["folder_name"], " tid=", ($tid ?? "NULL"), PHP_EOL;
}
$vocab = $resolver->getDirectoryVocabularyId();
echo "vocab=", ($vocab ?? "NULL"), PHP_EOL;
'

# Grant department roles media create/view/update (folder ACL still applies).
for role in mis sustainability; do
  docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add "${role}" \
    'access content,view media,create media,update media,access media overview,access media library,create image media,create document media,view own unpublished media' \
    2>/dev/null || true
done

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush role:perm:add administrator 'administer department access' || true

# Demo users (local) for verification without LDAP.
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:create misuser --mail=mis@example.com --password=misuser 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:role:add mis misuser 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:create sususer --mail=sus@example.com --password=sususer 2>/dev/null || true
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush user:role:add sustainability sususer 2>/dev/null || true

docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cr
echo "DEPARTMENT_MEDIA_CONFIG_OK"
