# Drupal 11 with PHP LDAP extension for AD bind + Gutenberg editing.
FROM drupal:11-php8.4-apache

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libldap2-dev \
    git \
    unzip \
    patch \
  && (docker-php-ext-configure ldap --with-libdir=lib/$(uname -m)-linux-gnu || docker-php-ext-configure ldap) \
  && docker-php-ext-install ldap \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/drupal

# Install contrib packages used by this project.
RUN composer require --no-interaction \
    'drupal/ldap:^4.12' \
    'drupal/externalauth:^2.0' \
    'drupal/gutenberg:3.0.6' \
    'drush/drush' \
  && chown -R www-data:www-data /opt/drupal/vendor /opt/drupal/composer.json /opt/drupal/composer.lock /opt/drupal/web/modules/contrib \
  || true

# Patches and custom modules are mounted at runtime via docker-compose.
