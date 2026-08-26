<?php

declare(strict_types=1);

namespace Drupal\Tests\department_access\Unit;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Config\ImmutableConfig;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\department_access\Service\DepartmentResolver;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\department_access\Service\DepartmentResolver
 * @group department_access
 */
final class DepartmentResolverTest extends UnitTestCase {

  /**
   * @covers ::getUserDepartmentIds
   * @covers ::getPrimaryDepartmentId
   */
  public function testPrimaryDepartmentFromPriority(): void {
    $settings = $this->createMock(ImmutableConfig::class);
    $settings->method('get')->willReturnCallback(static function ($key) {
      return match ($key) {
        'departments' => [
          ['id' => 'mis', 'label' => 'MIS', 'role' => 'mis', 'folder_name' => 'MIS'],
          ['id' => 'sustainability', 'label' => 'Sustainability', 'role' => 'sustainability', 'folder_name' => 'Sustainability'],
        ],
        'primary_department_priority' => ['sustainability', 'mis'],
        default => NULL,
      };
    });
    $factory = $this->createMock(ConfigFactoryInterface::class);
    $factory->method('get')->with('department_access.settings')->willReturn($settings);

    $resolver = new DepartmentResolver($factory, $this->createMock(EntityTypeManagerInterface::class));
    $account = $this->createMock(AccountInterface::class);
    $account->method('getRoles')->willReturn(['authenticated', 'mis', 'sustainability']);

    $this->assertSame(['mis', 'sustainability'], $resolver->getUserDepartmentIds($account));
    $this->assertSame('sustainability', $resolver->getPrimaryDepartmentId($account));
  }

}
