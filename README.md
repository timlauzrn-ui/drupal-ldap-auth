# Drupal LDAP Auth + Gutenberg Content Editing

Forkable Drupal 11 project with:

1. **AD/LDAP login** (`drupal/ldap`) + custom **`ldap_role_mapper`** (group → role overwrite on LDAP login)
2. **Gutenberg** page editing with **template lock `all`** for non-admins (`gutenberg_template_lock`)
3. Docker Compose for local development (bind-mounted custom modules)

## Quick start (recommended for forks)

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone https://github.com/timlauzrn-ui/drupal-ldap-auth.git
cd drupal-ldap-auth
chmod +x scripts/*.sh
./scripts/setup-compose.sh
```

Open http://localhost:8080 — admin / `admin`.

Custom modules live under `modules/custom/` and are mounted into the container. Edit on the host, then:

```bash
docker exec -u www-data -w /opt/drupal drupal-ldap-auth vendor/bin/drush cr
```

## Project layout

```
modules/custom/ldap_role_mapper/          # LDAP group → Drupal role sync
modules/custom/gutenberg_template_lock/   # Template lock all except unlock permission
patches/                                  # Gutenberg D11 compatibility patches
scripts/setup-compose.sh                  # Friend/fork: compose up + site install
scripts/install-into-my-drupal.sh         # Alternate: install into existing my-drupal
scripts/configure-gutenberg-page.sh
scripts/verify-*.sh
docker-compose.yml
Dockerfile
```

## Features

### LDAP role mapping
- Configure server: `/admin/config/people/ldap/server`
- Map groups: `/admin/config/people/ldap-role-mapper`
- On LDAP login, roles are replaced from mappings (`administrator` protected)

### Gutenberg editing
- Create pages: `/node/add/page`
- Blocks: Paragraph, Image, File, Columns, Heading, List, Group, …
- **Administrator**: full drag/drop structure
- **Editor** (no `unlock gutenberg template`): in-place content edit only; structure locked

## Verify

```bash
CONTAINER=drupal-ldap-auth ./scripts/verify-gutenberg.sh
CONTAINER=drupal-ldap-auth ./scripts/verify-my-drupal.sh   # if LDAP stack enabled
```

## License

Proprietary / internal use unless otherwise stated by the repo owner.
