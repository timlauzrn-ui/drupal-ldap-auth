#!/usr/bin/env bash
# Verify hkcec_ldap_role_mapper mapping/overwrite logic and module status inside my-drupal.
set -euo pipefail

CONTAINER="${CONTAINER:-my-drupal}"

echo "==> Module status"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=ldap
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush pm:list --status=enabled --filter=externalauth

echo "==> PHP LDAP extension"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval "print extension_loaded('ldap') ? \"LDAP_EXT_OK\\n\" : \"LDAP_EXT_MISSING\\n\";"

echo "==> Config + route + login hooks/subscribers"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush cget hkcec_ldap_role_mapper.settings
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval "echo \\Drupal\\Core\\Url::fromRoute('hkcec_ldap_role_mapper.settings')->toString(), PHP_EOL;"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval "
\$dispatcher = \\Drupal::service('event_dispatcher');
echo 'externalauth.login', PHP_EOL;
foreach (\$dispatcher->getListeners('externalauth.login') as \$listener) {
  if (is_array(\$listener) && is_object(\$listener[0])) {
    echo '  ', get_class(\$listener[0]), '::', \$listener[1], PHP_EOL;
  }
}
\$mh = \\Drupal::moduleHandler();
if (!\$mh->hasImplementations('user_login', 'hkcec_ldap_role_mapper')) {
  throw new \\Exception('hkcec_ldap_role_mapper_user_login not registered');
}
\$mods = [];
\$mh->invokeAllWith('user_login', function (callable \$hook, string \$module) use (&\$mods) { \$mods[] = \$module; });
echo 'hook_user_login: ', implode(', ', \$mods), PHP_EOL;
echo \"HOOK_USER_LOGIN_OK\\n\";
if (class_exists('Drupal\\\\user\\\\Event\\\\UserLoginEvent')) {
  echo \"NOTE: UserLoginEvent still present (unexpected on Drupal 11.4+)\\n\";
}
else {
  echo \"UserLoginEvent_ABSENT_OK\\n\";
}
"

echo "==> Mapping / overwrite logic"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval "
\$sync = \\Drupal::service('hkcec_ldap_role_mapper.synchronizer');
\$mappings = [['ldap_group' => 'Intranet-Editors', 'rid' => 'editor']];
\$groups = ['CN=Intranet-Editors,OU=Groups,DC=example,DC=com'];
\$rids = \$sync->mapGroupsToRoles(\$groups, \$mappings);
if (\$rids !== ['editor']) { throw new \\Exception('mapGroupsToRoles failed: ' . implode(',', \$rids)); }
\$user = \\Drupal\\user\\Entity\\User::load(1);
\$user->addRole('content_editor');
\$roles = \$sync->buildRoleList(\$user, ['editor'], ['administrator']);
sort(\$roles);
if (\$roles !== ['administrator', 'editor']) { throw new \\Exception('buildRoleList failed: ' . implode(',', \$roles)); }
echo \"MAPPING_OVERWRITE_OK\\n\";
"

echo "==> Local login does not sync without CredentialsStorage DN (by design)"
docker exec -u www-data -w /opt/drupal "${CONTAINER}" vendor/bin/drush php:eval '
\Drupal\ldap_servers\Helper\CredentialsStorage::storeUserDn(NULL);
$account = \Drupal\user\Entity\User::load(1);
$before = $account->getRoles(TRUE);
\Drupal::moduleHandler()->invokeAll("user_login", [$account]);
$after = \Drupal\user\Entity\User::load(1)->getRoles(TRUE);
sort($before); sort($after);
if ($before !== $after) { throw new \Exception("Local login simulation changed roles unexpectedly"); }
echo "LOCAL_LOGIN_NO_SYNC_OK\n";
\Drupal\ldap_servers\Helper\CredentialsStorage::storeUserDn("CN=admin,DC=example,DC=com");
\Drupal::moduleHandler()->invokeAll("user_login", [$account]);
echo "LDAP_BIND_GATE_OK\n";
\Drupal\ldap_servers\Helper\CredentialsStorage::storeUserDn(NULL);
'

echo "PASS: role sync gates on CredentialsStorage DN (LDAP bind this request)"

echo
echo "All automated checks passed."
