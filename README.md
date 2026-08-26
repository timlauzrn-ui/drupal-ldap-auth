# Drupal LDAP Auth + Gutenberg + Department Media + Friendly Nav + Log Center

Forkable Drupal 11 project with:

1. **AD/LDAP login** + **`ldap_role_mapper`**
2. **Gutenberg** with template lock for non-admins
3. **Department media folders** (`Root > MIS`, …) with ACL
4. **Friendly navigation** — public Main menu + department menus; auto URL aliases (Pathauto); private media files
5. **Log Center** — Access / Error / Security / Custom / WAF (import stub); search, sort, CSV export, retention
6. **Modern Gutenberg blocks** — Ad Slider (timed rotating banners) plus expanded core blocks (gallery, cover, buttons, video, …)
7. **F&B Daily Revenue Calendar** — mount/drop-folder PDFs (no Drupal copy), FullCalendar view, LDAP roles `FIN_dev` / `F&B_dev`

## Quick start

```bash
git clone https://github.com/timlauzrn-ui/drupal-ldap-auth.git
cd drupal-ldap-auth
chmod +x scripts/*.sh
./scripts/setup-compose.sh
# or: ./scripts/install-into-my-drupal.sh
```

Open http://localhost:8080 — `admin` / `admin`.

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
- Custom API: `\Drupal\log_center\LogCenter::log('custom', '…', ['context' => […]])`
- WAF category is filterable; use `log_center.importer` for future JSON/CSV import (no appliance in this pass)

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

## Custom modules

```
modules/custom/ldap_role_mapper/
modules/custom/gutenberg_template_lock/
modules/custom/department_access/
modules/custom/friendly_navigation/
modules/custom/log_center/
modules/custom/gutenberg_modern_blocks/
modules/custom/fnb_revenue_report/
```

## LDAP department mapping example

| LDAP group | Drupal role |
|------------|-------------|
| MIS | mis |
| Sustainability | sustainability |

Admin UI: `/admin/config/people/department-access`, `/admin/config/people/ldap-role-mapper`
