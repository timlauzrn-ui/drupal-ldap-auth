<?php

declare(strict_types=1);

namespace Drupal\Tests\hkcec_ldap_role_mapper\Unit;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\hkcec_ldap_role_mapper\Service\LdapRoleSynchronizer;
use Drupal\ldap_servers\LdapGroupManager;
use Drupal\Tests\UnitTestCase;
use Drupal\user\UserInterface;
use Psr\Log\LoggerInterface;

/**
 * Unit tests for LDAP group → role mapping overwrite logic.
 *
 * @group hkcec_ldap_role_mapper
 * @coversDefaultClass \Drupal\hkcec_ldap_role_mapper\Service\LdapRoleSynchronizer
 */
final class LdapRoleSynchronizerTest extends UnitTestCase {

  private LdapRoleSynchronizer $synchronizer;

  /**
   * {@inheritdoc}
   */
  protected function setUp(): void {
    parent::setUp();
    $this->synchronizer = new LdapRoleSynchronizer(
      $this->createMock(ConfigFactoryInterface::class),
      $this->createMock(EntityTypeManagerInterface::class),
      $this->createMock(LdapGroupManager::class),
      $this->createMock(LoggerInterface::class),
    );
  }

  /**
   * @covers ::mapGroupsToRoles
   */
  public function testMapGroupsByCnAndDn(): void {
    $mappings = [
      ['ldap_group' => 'Intranet-Editors', 'rid' => 'editor'],
      ['ldap_group' => 'CN=Intranet-Admins,OU=Groups,DC=example,DC=com', 'rid' => 'content_admin'],
      ['ldap_group' => 'Unmatched-Group', 'rid' => 'should_not_apply'],
    ];
    $groups = [
      'CN=Intranet-Editors,OU=Groups,DC=example,DC=com',
      'CN=Intranet-Admins,OU=Groups,DC=example,DC=com',
    ];

    $rids = $this->synchronizer->mapGroupsToRoles($groups, $mappings);
    sort($rids);
    $this->assertSame(['content_admin', 'editor'], $rids);
  }

  /**
   * @covers ::mapGroupsToRoles
   */
  public function testMapGroupsIsCaseInsensitive(): void {
    $mappings = [
      ['ldap_group' => 'intranet-editors', 'rid' => 'editor'],
    ];
    $groups = ['CN=Intranet-Editors,OU=Groups,DC=example,DC=com'];
    $this->assertSame(['editor'], $this->synchronizer->mapGroupsToRoles($groups, $mappings));
  }

  /**
   * @covers ::buildRoleList
   */
  public function testBuildRoleListOverwritesManualRolesButKeepsAdministrator(): void {
    $user = $this->createMock(UserInterface::class);
    $user->method('getRoles')->with(TRUE)->willReturn([
      'authenticated',
      'administrator',
      'editor',
      'manually_assigned',
    ]);

    $roles = $this->synchronizer->buildRoleList(
      $user,
      ['content_admin'],
      ['administrator'],
    );
    sort($roles);
    $this->assertSame(['administrator', 'content_admin'], $roles);
  }

  /**
   * @covers ::buildRoleList
   */
  public function testBuildRoleListDropsUnmappedRolesWhenNotProtected(): void {
    $user = $this->createMock(UserInterface::class);
    $user->method('getRoles')->with(TRUE)->willReturn([
      'authenticated',
      'editor',
      'manually_assigned',
    ]);

    $roles = $this->synchronizer->buildRoleList($user, [], ['administrator']);
    $this->assertSame([], $roles);
  }

  /**
   * @covers ::extractCn
   */
  public function testExtractCn(): void {
    $this->assertSame(
      'Intranet-Editors',
      $this->synchronizer->extractCn('CN=Intranet-Editors,OU=Groups,DC=example,DC=com'),
    );
    $this->assertSame('Intranet-Editors', $this->synchronizer->extractCn('Intranet-Editors'));
  }

}
