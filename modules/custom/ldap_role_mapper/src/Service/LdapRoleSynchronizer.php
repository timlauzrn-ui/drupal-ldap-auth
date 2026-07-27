<?php

declare(strict_types=1);

namespace Drupal\ldap_role_mapper\Service;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\ldap_servers\LdapGroupManager;
use Drupal\user\UserInterface;
use Psr\Log\LoggerInterface;

/**
 * Synchronizes Drupal roles from LDAP group membership on LDAP login.
 */
final class LdapRoleSynchronizer {

  public function __construct(
    private readonly ConfigFactoryInterface $configFactory,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly LdapGroupManager $groupManager,
    private readonly LoggerInterface $logger,
  ) {}

  /**
   * Overwrite the account's roles based on current LDAP group membership.
   *
   * @param \Drupal\Core\Session\AccountInterface $account
   *   The Drupal account that just authenticated via LDAP.
   * @param string|null $ldap_server_id
   *   Optional LDAP server entity ID. When NULL, the first enabled server is used.
   */
  public function syncRoles(AccountInterface $account, ?string $ldap_server_id = NULL): void {
    $storage = $this->entityTypeManager->getStorage('user');
    $user = $storage->load($account->id());
    if (!$user instanceof UserInterface) {
      $this->logger->error('Cannot sync roles: user @uid could not be loaded.', [
        '@uid' => $account->id(),
      ]);
      return;
    }

    $server_id = $ldap_server_id ?? $this->getDefaultServerId();
    if ($server_id === NULL) {
      $this->logger->warning('LDAP Role Mapper skipped role sync for @name: no enabled LDAP server.', [
        '@name' => $user->getAccountName(),
      ]);
      return;
    }

    $this->groupManager->setServerById($server_id);
    $group_dns = $this->groupManager->groupMembershipsFromUser($user->getAccountName());
    if (!is_array($group_dns)) {
      $group_dns = [];
    }

    $config = $this->configFactory->get('ldap_role_mapper.settings');
    $mappings = $config->get('mappings') ?? [];
    $protected = $config->get('protected_roles') ?? ['administrator'];

    $mapped_rids = $this->mapGroupsToRoles($group_dns, $mappings);
    $new_roles = $this->buildRoleList($user, $mapped_rids, $protected);

    $current = $user->getRoles(TRUE);
    sort($current);
    $sorted_new = $new_roles;
    sort($sorted_new);

    if ($current === $sorted_new) {
      $this->logger->info('LDAP Role Mapper: roles unchanged for @name. Groups: @groups. Roles: @roles.', [
        '@name' => $user->getAccountName(),
        '@groups' => $group_dns ? implode('; ', $group_dns) : '(none)',
        '@roles' => implode(', ', $sorted_new),
      ]);
      return;
    }

    $user->set('roles', $new_roles);
    $user->save();

    $this->logger->notice('LDAP Role Mapper: overwritten roles for @name. Groups: @groups. Previous: @previous. New: @roles.', [
      '@name' => $user->getAccountName(),
      '@groups' => $group_dns ? implode('; ', $group_dns) : '(none)',
      '@previous' => implode(', ', $current),
      '@roles' => implode(', ', $sorted_new),
    ]);
  }

  /**
   * Map LDAP group DNs/CNs to Drupal role IDs using configured mappings.
   *
   * @param string[] $group_dns
   *   Group DNs from LDAP (and optionally CNs).
   * @param array<int, array{ldap_group?: string, rid?: string}> $mappings
   *   Configured mappings.
   *
   * @return string[]
   *   Unique Drupal role IDs.
   */
  public function mapGroupsToRoles(array $group_dns, array $mappings): array {
    $normalized_groups = [];
    foreach ($group_dns as $group) {
      $group = trim((string) $group);
      if ($group === '') {
        continue;
      }
      $normalized_groups[] = mb_strtolower($group);
      $cn = $this->extractCn($group);
      if ($cn !== NULL) {
        $normalized_groups[] = mb_strtolower($cn);
      }
    }
    $normalized_groups = array_unique($normalized_groups);

    $rids = [];
    foreach ($mappings as $mapping) {
      $ldap_group = trim((string) ($mapping['ldap_group'] ?? ''));
      $rid = trim((string) ($mapping['rid'] ?? ''));
      if ($ldap_group === '' || $rid === '') {
        continue;
      }
      $needle = mb_strtolower($ldap_group);
      $needle_cn = $this->extractCn($ldap_group);
      $candidates = [$needle];
      if ($needle_cn !== NULL) {
        $candidates[] = mb_strtolower($needle_cn);
      }
      foreach ($candidates as $candidate) {
        if (in_array($candidate, $normalized_groups, TRUE)) {
          $rids[] = $rid;
          break;
        }
      }
    }

    return array_values(array_unique($rids));
  }

  /**
   * Build the final role ID list to apply to the user.
   *
   * @param \Drupal\user\UserInterface $user
   *   User entity.
   * @param string[] $mapped_rids
   *   Roles derived from LDAP groups.
   * @param string[] $protected_roles
   *   Roles never removed if the user already has them.
   *
   * @return string[]
   *   Role IDs excluding anonymous/authenticated (Drupal adds authenticated).
   */
  public function buildRoleList(UserInterface $user, array $mapped_rids, array $protected_roles): array {
    $existing = $user->getRoles(TRUE);
    $keep = [];
    foreach ($protected_roles as $rid) {
      $rid = trim((string) $rid);
      if ($rid !== '' && in_array($rid, $existing, TRUE)) {
        $keep[] = $rid;
      }
    }

    $roles = array_values(array_unique(array_merge($mapped_rids, $keep)));
    // authenticated/anonymous are implicit; strip if present in mapped config.
    return array_values(array_diff($roles, ['anonymous', 'authenticated']));
  }

  /**
   * Extract CN= value from a DN, if present.
   */
  public function extractCn(string $dn_or_cn): ?string {
    if (preg_match('/(^|,)\\s*cn\\s*=\\s*([^,]+)/i', $dn_or_cn, $matches)) {
      return trim($matches[2]);
    }
    // Already a bare CN / group name.
    if (!str_contains($dn_or_cn, '=')) {
      return trim($dn_or_cn);
    }
    return NULL;
  }

  /**
   * Load the first enabled LDAP server ID.
   */
  private function getDefaultServerId(): ?string {
    $servers = $this->entityTypeManager
      ->getStorage('ldap_server')
      ->loadByProperties(['status' => 1]);
    if (!$servers) {
      return NULL;
    }
    $server = reset($servers);
    return $server->id();
  }

}
