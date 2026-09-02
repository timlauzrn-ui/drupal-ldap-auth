# Drupal LDAP Auth + Gutenberg + Department Media + Friendly Nav + Log Center

Forkable Drupal 11 project with:

1. **AD/LDAP login** + **`hkcec_ldap_role_mapper`**
2. **Gutenberg** with template lock for non-admins
3. **Department media folders** (`Root > MIS`, …) with ACL
4. **Friendly navigation** — public Main menu + department menus; auto URL aliases (Pathauto); private media files
5. **Log Center** — Access / Error / Security / Custom / WAF (import stub); search, sort, CSV export, retention
6. **Modern Gutenberg blocks** — Ad Slider (timed rotating banners) plus expanded core blocks (gallery, cover, buttons, video, …)
7. **F&B Daily Revenue Calendar** — mount/drop-folder PDFs (no Drupal copy), FullCalendar view, LDAP roles `FIN_dev` / `F&B_dev`

## Run on another PC (full guide)

This repo is **code + setup scripts**. It does **not** include your live database or uploaded files. A fresh install gets the **same features/modules/themes**; pages/media you created on this laptop appear only if you also copy a database dump (optional, see below).

### 1. Prerequisites on the other PC

| Tool | Why |
|------|-----|
| [Git](https://git-scm.com/downloads) | Download the project |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Runs Drupal in a container (same approach as this laptop) |

Install both, then start **Docker Desktop** and wait until it says Docker is running.

### 2. Download (clone) from GitHub

```bash
git clone https://github.com/timlauzrn-ui/drupal-ldap-auth.git
cd drupal-ldap-auth
chmod +x scripts/*.sh
```

Or download the ZIP from the green **Code** button on GitHub → unzip → open that folder in Terminal.

### 3. Recommended: start with Docker Compose (new PC)

This builds a full stack (Drupal + MySQL), installs modules, themes (Bootstrap5 + Gin 5), and configures features:

```bash
./scripts/setup-compose.sh
```

First run can take several minutes (image build + Composer packages).

When it finishes:

- Site: **http://localhost:8080**
- Login: **admin** / **admin**

Container name for this path: `drupal-ldap-auth`.

### 4. Alternate: stock `drupal` container (like this laptop’s `my-drupal`)

Only use this if you already run an official Drupal image named `my-drupal` on port 8080:

```bash
docker run -d --name my-drupal -p 8080:80 drupal:11-php8.4-apache
# wait ~30s, then:
./scripts/install-into-my-drupal.sh
```

That script installs LDAP, Gutenberg, Log Center, themes, etc. into the existing container.

### 5. Daily use after setup

| Action | Compose stack | `my-drupal` stack |
|--------|---------------|-------------------|
| Start | `docker compose up -d` | `docker start my-drupal` |
| Stop | `docker compose stop` | `docker stop my-drupal` |
| Open site | http://localhost:8080 | http://localhost:8080 |

### 6. Optional: copy **content** from this laptop (same pages/media)

Features install automatically; **your pages, users, and files** live in the container DB/files. To mirror content:

**On this laptop** (export):

```bash
# Database (SQLite example for my-drupal; adjust if you use MySQL)
docker exec my-drupal bash -lc 'cd /opt/drupal/web/sites/default/files && tar czf - private public 2>/dev/null' > drupal-files-backup.tgz
docker cp my-drupal:/opt/drupal/web/sites/default/files/db.sqlite ./drupal-db.sqlite 2>/dev/null \
  || docker exec my-drupal bash -lc 'find /opt/drupal -name "*.sqlite" 2>/dev/null | head -5'
```

For the Compose MySQL stack, prefer:

```bash
docker exec drupal-ldap-auth-mysql mysqldump -udrupal -pdrupal drupal > drupal-db.sql
```

Copy `drupal-db.sql` / sqlite + `drupal-files-backup.tgz` to the other PC (USB, cloud, etc.), then import after setup. Ask if you want a one-shot export/import script.

### 7. Point at your real Active Directory (optional)

Default install uses Drupal’s local `admin` user. To use company AD:

1. Log in as admin → **Configuration → People → LDAP**
2. Add your LDAP server, bind DN, base DN, and group → role maps  
   (or use `/admin/config/people/ldap-role-mapper` and department access settings)

### 8. Verify everything works

```bash
# Compose:
CONTAINER=drupal-ldap-auth ./scripts/verify-log-center.sh
CONTAINER=drupal-ldap-auth ./scripts/verify-gutenberg.sh

# Or my-drupal:
CONTAINER=my-drupal ./scripts/verify-log-center.sh
```

### What you get vs this laptop

| Same automatically | Not automatic |
|--------------------|---------------|
| Custom modules, themes (Bootstrap5 + Gin), Gutenberg blocks, Log Center, F&B calendar, LDAP mapper | Pages/articles you already wrote |
| Port 8080, admin/admin on fresh install | Uploaded images/PDFs |
| Scripts under `scripts/` | Live LDAP passwords / server secrets |

## Quick start (same as §2–3)

```bash
git clone https://github.com/timlauzrn-ui/drupal-ldap-auth.git
cd drupal-ldap-auth
chmod +x scripts/*.sh
./scripts/setup-compose.sh
# or: ./scripts/install-into-my-drupal.sh
```

Open http://localhost:8080 — `admin` / `admin`.

## Intranet Gutenberg templates (Figma)

Matches the HKCEC Intranet Figma Make designs:

| Design | Content type | Create URL |
|--------|--------------|------------|
| Landing (hero slider + 4 resource cards + Hot News) | Basic page | `/node/add/page` |
| Department / HR (intro + quick nav + service cards) | Department page | `/node/add/department_page` |

```bash
CONTAINER=my-drupal ./scripts/configure-intranet-templates.sh
```

Pasteable template JSON (also applied by the script):

- `templates/gutenberg-landing-page.json`
- `templates/gutenberg-department-page.json`

**Note:** The dark blue top bar (HKCEC Intranet / Human Resources / Finance / MIS / Others) is the **theme Main menu**, not Gutenberg. Edit under Structure → Menus → Main navigation. Breadcrumbs come from Easy Breadcrumb when enabled.

New blocks for these templates: Resource / service cards, Hot News, Page intro, Quick Navigation, Department layout.

## Themes

- **Front (public site):** Bootstrap5 — wider content region than Olivero for Gutenberg pages  
- **Admin:** Gin — modern backend UI  

```bash
CONTAINER=my-drupal ./scripts/configure-themes.sh
```

To compare with Olivero later: Appearance → set Default theme back to Olivero (admin can stay Gin).

## Navigation & URLs (user-friendly)

- **Automatic aliases:** saving a page titled “Staff Guide” creates `/staff-guide` (no manual path typing)
- **Public Main menu:** Home, About, News starters; everyone can see it
- **Department menus:** e.g. MIS menu — second nav bar for users with role `mis`
- On the page form: **Show this page in a menu** → pick Main or department menu + label
- Breadcrumbs via Easy Breadcrumb

## Private media (security)

- New image/document uploads use `private://` (not browsable `/sites/default/files/...` trees)
- Downloads go through Drupal (`/system/files/...`) and department ACL still applies

## Log Center

- UI: `/admin/reports/log-center` (Reports → Log Center)
- Settings: `/admin/config/development/log-center` — retention (default 90 days), access logging, skip path prefixes
- Filters: type, date range, username, IP, path, message, status; sortable columns; CSV export of current filters
- Access: **administrator** and **`security`** role only (`view log center` / `administer log center`)
- Demo security user after configure: `secuser` / `secuser`
- Custom API: `\Drupal\hkcec_log_center\LogCenter::log('custom', '…', ['context' => […]])`
- WAF category is filterable; use `hkcec_log_center.importer` for future JSON/CSV import (no appliance in this pass)

```bash
CONTAINER=my-drupal ./scripts/configure-log-center.sh
CONTAINER=my-drupal ./scripts/verify-log-center.sh
```

## Award-inspired Gutenberg blocks

Patterns drawn from high-performing / Awwwards-style landing pages:

| Block | Award-site pattern |
|-------|--------------------|
| **Hero** | Full-bleed above-the-fold + dual CTAs |
| **Marquee / Ticker** | Motion strip for announcements |
| **Logo Cloud** | Trust bar under the hero |
| **Stats Row** | Proof numbers |
| **Bento Grid** | Asymmetric feature mosaic |
| **Feature Card** | Promo / product cards |
| **Process Steps** | How-it-works journey |
| **Testimonials** | Rotating social proof |
| **Pricing Table** | Transparent tiers + highlight |
| **Tabs** | Dense content without long scroll |
| **CTA Banner** | Conversion section |
| **Accordion / FAQ** | Objection handling |
| **Countdown** | Event / campaign urgency |
| **Ad Slider** | Timed banner rotation |

```bash
CONTAINER=my-drupal ./scripts/configure-gutenberg-modern-blocks.sh
```

New Pages use a flat “landing masterpiece” template with these sections. Fill content in place; as admin, unlock to rearrange.

## F&B Daily Revenue Calendar

Calendar of daily F&B revenue PDFs with AD-gated access. PDFs stay on the **J-drive mount** (no second Drupal archive); Drupal only stores date metadata + a file URI that streams through `private://`.

| Item | Value |
|------|--------|
| URL | `/finance/fnb-revenue-calendar` |
| Content type | F&B Daily Revenue Report |
| Drop folder | `sites/default/files/private/fnb-revenue/` (bind-mount J-drive here in production) |
| Filename | `YYYY-MM-DD.pdf` (also accepts `YYYYMMDD` in the name) |
| Drupal roles | `fin_dev`, `fnb_dev` |
| LDAP maps | `FIN_dev` → `fin_dev`, `F&B_dev` → `fnb_dev` |
| Demo users | `finuser`/`finuser`, `fnbuser`/`fnbuser` |
| Settings / scan | `/admin/config/content/fnb-revenue-report` |

**IT mount:** bind the J-drive report share read-only onto the host path used as Drupal’s `private/fnb-revenue` directory (or Docker volume). Finance continues dropping daily PDFs onto J-drive; cron (or “Scan now”) registers new files without copying.

```bash
CONTAINER=my-drupal ./scripts/configure-fnb-revenue-calendar.sh
CONTAINER=my-drupal ./scripts/verify-fnb-revenue-calendar.sh
```

Unauthorized users cannot view the calendar or download PDFs (login / 403). Authorized roles can view, edit, and delete report nodes.

## Verify

```bash
CONTAINER=my-drupal ./scripts/verify-friendly-nav.sh
CONTAINER=my-drupal ./scripts/verify-department-media.sh
CONTAINER=my-drupal ./scripts/verify-gutenberg.sh
CONTAINER=my-drupal ./scripts/verify-log-center.sh
CONTAINER=my-drupal ./scripts/verify-fnb-revenue-calendar.sh
```

## Custom modules (HKCEC prefix)

All custom modules use the `hkcec_` machine-name prefix and display as **HKCEC …** in the admin UI:

```
modules/custom/hkcec_ldap_role_mapper/
modules/custom/hkcec_gutenberg_template_lock/
modules/custom/hkcec_department_access/
modules/custom/hkcec_friendly_navigation/
modules/custom/hkcec_log_center/
modules/custom/hkcec_gutenberg_modern_blocks/
modules/custom/hkcec_fnb_revenue_report/
```

Gutenberg block IDs use the `hkcec/` namespace (e.g. `hkcec/ad-slider`).

If an existing site still has the old module names, run:

```bash
CONTAINER=my-drupal ./scripts/migrate-hkcec-modules.sh
```

## LDAP department mapping example

| LDAP group | Drupal role |
|------------|-------------|
| MIS | mis |
| Sustainability | sustainability |

Admin UI: `/admin/config/people/department-access`, `/admin/config/people/ldap-role-mapper`
