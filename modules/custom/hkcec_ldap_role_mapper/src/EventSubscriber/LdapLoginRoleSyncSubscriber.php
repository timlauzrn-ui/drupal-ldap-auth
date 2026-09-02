<?php

declare(strict_types=1);

namespace Drupal\hkcec_ldap_role_mapper\EventSubscriber;

use Drupal\externalauth\Event\ExternalAuthEvents;
use Drupal\externalauth\Event\ExternalAuthLoginEvent;
use Drupal\hkcec_ldap_role_mapper\Service\LdapRoleSynchronizer;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Runs LDAP group → Drupal role sync after ExternalAuth LDAP login.
 *
 * Primary AD/LDAP form logins are handled by hook_user_login() in
 * hkcec_ldap_role_mapper.module (Drupal 11 removed UserLoginEvent). This subscriber
 * covers ExternalAuth::login() callers / future LDAP changes.
 */
final class LdapLoginRoleSyncSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly LdapRoleSynchronizer $synchronizer,
    private readonly LoggerInterface $logger,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return [
      ExternalAuthEvents::LOGIN => ['onExternalAuthLogin', 0],
    ];
  }

  /**
   * Sync roles when ExternalAuth LOGIN fires with an LDAP provider.
   */
  public function onExternalAuthLogin(ExternalAuthLoginEvent $event): void {
    $provider = (string) $event->getProvider();
    if (!$this->isLdapProvider($provider)) {
      return;
    }

    $account = $event->getAccount();
    $this->logger->info('LDAP Role Mapper: ExternalAuth LDAP login for @name via @provider.', [
      '@name' => $account->getAccountName(),
      '@provider' => $provider,
    ]);
    $this->synchronizer->syncRoles($account);
  }

  /**
   * Whether the externalauth provider belongs to the LDAP stack.
   */
  private function isLdapProvider(string $provider): bool {
    $provider = strtolower($provider);
    return $provider === 'ldap_user'
      || $provider === 'ldap_authentication'
      || str_starts_with($provider, 'ldap');
  }

}
