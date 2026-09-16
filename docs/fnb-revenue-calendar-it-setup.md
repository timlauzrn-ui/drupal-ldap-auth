# F&B Daily Revenue Calendar — IT setup guide

This document is for **IT / infrastructure / intranet administrators**. It covers production setup of the financial page: shared-folder mount, Active Directory access, Drupal configuration, cron, security, and go-live checks.

Staff-facing instructions (how Finance opens the calendar) are in [`fnb-revenue-calendar-user-guide.md`](fnb-revenue-calendar-user-guide.md).

---

## 1. What you are installing

A private intranet calendar at:

```
https://<intranet-host>/finance/fnb-revenue-calendar
```

Finance already drops one PDF per day onto a network share (J-drive). Drupal **does not copy** those PDFs. It registers each file as a calendar event and streams the download through Drupal’s **private files** gate so only authorised people can open them.

```
Finance PC  →  J-drive share (source of truth for PDFs)
                    ↓  read-only mount
Drupal host  →  private://fnb-revenue
                    ↓  cron / “Scan now”
Calendar page  →  authorised users download via Drupal
```

| Item | Value |
|------|--------|
| Drupal module | HKCEC F&B Revenue Report (`hkcec_fnb_revenue_report`) |
| Calendar URL | `/finance/fnb-revenue-calendar` |
| Settings URL | `/admin/config/content/fnb-revenue-report` |
| LDAP mapper URL | `/admin/config/people/ldap-role-mapper` |
| LDAP servers URL | `/admin/config/people/ldap/server` |
| Drop folder (inside Drupal) | `sites/default/files/private/fnb-revenue/` |
| Drupal URI | `private://fnb-revenue` |
| Preferred file name | `YYYY-MM-DD.pdf` (example `2026-09-16.pdf`) |
| Drupal roles | `fin_dev` (FIN Dev), `fnb_dev` (F&B Dev) |
| Default AD groups | `FIN_dev`, `F&B_dev` (also `FB_dev`) |

---

## 2. Prerequisites

Before you start, confirm:

| Requirement | Why |
|-------------|-----|
| Drupal 10.3+ or 11 site running | This project is Drupal 11 |
| PHP LDAP extension enabled | AD login |
| Drupal LDAP modules | `ldap_servers`, `ldap_authentication`, `ldap_user`, `externalauth` |
| Custom modules on the site | `hkcec_fnb_revenue_report`, `hkcec_ldap_role_mapper` |
| Contrib module | FullCalendar View (`fullcalendar_view`) |
| Network: Drupal server → AD | TCP **389** (LDAP) or **636** (LDAPS) |
| Network: Drupal server → J-drive file server | SMB/CIFS (usually TCP **445**) |
| A domain account that can **read** the report share | Used only for the mount; prefer a dedicated service account |
| AD groups for Finance and F&B (see §3) | Access control |
| HTTPS on the intranet | Private PDF downloads must not go over plain HTTP in production |

Also needed: a Drupal **administrator** account to finish the UI steps.

---

## 3. Active Directory (do this first)

Create (or confirm) these security groups. Names can differ; if they do, you must type the real names into LDAP Role Mapper later.

| AD group (default) | Who belongs | Drupal role applied at login |
|--------------------|-------------|------------------------------|
| `FIN_dev` | Finance staff who may see revenue PDFs | FIN Dev (`fin_dev`) |
| `F&B_dev` | F&B staff who may see revenue PDFs | F&B Dev (`fnb_dev`) |

Optional extra mapping already in the project: `FB_dev` → F&B Dev (same access, different spelling).

**Rules:**

- Add people to the group in AD. Do not rely on ticking the Drupal role by hand if they log in with LDAP — login **overwrites** mapped roles from current group membership.
- After a group change, the user must **log out and log in again**.
- Group CN or full DN both work. Matching is case-insensitive. Example accepted values: `FIN_dev` or `CN=FIN_dev,OU=Groups,DC=hkcec,DC=com`.
- `administrator` is a protected role and is not removed by the mapper.

Ask AD team for:

1. LDAP host (DC FQDN)
2. LDAPS vs LDAP
3. Bind DN + password (service account that can look up users and groups)
4. Base DN (user search)
5. Exact CNs of `FIN_dev` / `F&B_dev`

---

## 4. Install the Drupal pieces

If this site was built from this repository, the module is already installed when you run:

```bash
# Existing Docker container named my-drupal (this laptop’s pattern)
CONTAINER=my-drupal ./scripts/install-into-my-drupal.sh

# Or Docker Compose stack
./scripts/setup-compose.sh
```

Both call `scripts/configure-fnb-revenue-calendar.sh`, which:

- Copies `hkcec_fnb_revenue_report`
- Sets `$settings['file_private_path']`
- Creates `private/fnb-revenue/`
- Enables FullCalendar View + the F&B module
- Creates roles `fin_dev` / `fnb_dev` and permissions
- Adds LDAP Role Mapper rows for `FIN_dev` / `F&B_dev` / `FB_dev`
- Creates the calendar view and Main menu link
- Drops a **stub** PDF for today (demo only — remove on production)

On an already-running site, you can run only:

```bash
CONTAINER=my-drupal ./scripts/configure-fnb-revenue-calendar.sh
CONTAINER=my-drupal ./scripts/verify-fnb-revenue-calendar.sh
```

Replace `my-drupal` with `drupal-ldap-auth` if you use Compose.

### Manual enable (if you do not use the scripts)

1. Copy `modules/custom/hkcec_fnb_revenue_report` into `web/modules/custom/`.
2. `composer require drupal/fullcalendar_view:^5.2`
3. Extend → enable **HKCEC F&B Revenue Report**, **FullCalendar View**, **LDAP Role Mapper**.
4. Then complete §§5–9 below.

---

## 5. Private files path (required)

PDFs must **not** live under the public files directory (`sites/default/files/…` without private). Public files are downloadable without login.

In `sites/default/settings.php` (inside the Drupal web root):

```php
$settings['file_private_path'] = 'sites/default/files/private';
```

Create the folders and lock Apache/Nginx out of listing them:

```bash
# Inside the Drupal container / web root
mkdir -p sites/default/files/private/fnb-revenue
chown -R www-data:www-data sites/default/files/private
printf "Require all denied\n" > sites/default/files/private/.htaccess
```

The configure script does this for Docker.

**Drupal setting (admin):** Configuration → Content authoring → F&B revenue reports

| Field | Production value |
|-------|------------------|
| Drop folder URI | `private://fnb-revenue` |
| Filename date pattern | `Y-m-d` |
| Create report nodes as unpublished | Off (unless Finance wants approval first) |

Save, then you will mount J-drive **onto that folder**.

---

## 6. Mount the J-drive (the important IT step)

Goal: the same files Finance saves on J: appear at Drupal’s drop folder, **read-only**, with **no copy**.

### 6.1 Agree the share with Finance

| | Example — replace with the real path |
|--|--------------------------------------|
| UNC share | `\\fileserver\Finance\FNB-Daily-Revenue` |
| Drive letter Finance uses | `J:\FNB-Daily-Revenue` |
| File name they will use | `2026-09-16.pdf` |

Service account: **read-only** on that folder is enough. Drupal never writes the PDF (except the one-time demo stub, which you should delete on production).

### 6.2 Production Linux host (Apache/Nginx, no Docker)

Mount CIFS on the Drupal server. Example `/etc/fstab` (Debian/Ubuntu, Drupal web user `www-data`):

```
//fileserver/Finance/FNB-Daily-Revenue  /var/www/drupal/web/sites/default/files/private/fnb-revenue  cifs  credentials=/root/.smb-fnb-revenue,ro,uid=www-data,gid=www-data,file_mode=0440,dir_mode=0550,iocharset=utf8,_netdev,vers=3.0  0  0
```

`/root/.smb-fnb-revenue` (mode `600`):

```
username=svc-drupal-fnb
password=<secret>
domain=HKCEC
```

Then:

```bash
mkdir -p /var/www/drupal/web/sites/default/files/private/fnb-revenue
mount -a
ls -l /var/www/drupal/web/sites/default/files/private/fnb-revenue
# You should see Finance’s PDFs. Touch/create should fail (read-only).
```

Adjust the Drupal path if your docroot is not `/var/www/drupal/web`.

**SELinux** (RHEL/CentOS), if enforcing:

```bash
chcon -R -t httpd_sys_rw_content_t /var/www/drupal/web/sites/default/files/private
setsebool -P httpd_use_cifs 1
```

(Read-only mount can use `httpd_sys_content_t` if downloads still work.)

### 6.3 Docker Compose (this repository)

Host: mount the share first, e.g. `/mnt/fnb-revenue`, then bind it into the container **on top of** the files volume.

In `docker-compose.yml`, under `drupal.volumes`, add:

```yaml
    volumes:
      - ./modules/custom:/opt/drupal/web/modules/custom
      - ./patches:/opt/drupal/patches:ro
      - drupal-files:/opt/drupal/web/sites/default/files
      - /mnt/fnb-revenue:/opt/drupal/web/sites/default/files/private/fnb-revenue:ro
```

The nested bind must be listed **after** the `drupal-files` volume so it overlays `private/fnb-revenue`.

```bash
docker compose up -d
docker exec -u www-data drupal-ldap-auth ls -l /opt/drupal/web/sites/default/files/private/fnb-revenue
```

### 6.4 Existing `my-drupal` container

A running container does not pick up a new bind mount. Recreate it (keep the same image/name/port) **or** mount on the host and copy — recreate is correct for production-like Docker:

```bash
# Example only — copy your real docker run flags from: docker inspect my-drupal
docker stop my-drupal
docker rename my-drupal my-drupal-old
docker run -d --name my-drupal -p 8080:80 \
  -v /mnt/fnb-revenue:/opt/drupal/web/sites/default/files/private/fnb-revenue:ro \
  <your-existing-image-and-other-flags>
```

If the Drupal database/files live **inside** the old container, you must keep those volumes when recreating. Inspect first:

```bash
docker inspect my-drupal --format '{{json .Mounts}}'
```

### 6.5 Confirm Drupal sees the files

Inside the Drupal PHP/web user:

```bash
docker exec -u www-data -w /opt/drupal my-drupal vendor/bin/drush php:eval '
$fs = \Drupal::service("file_system");
$uri = "private://fnb-revenue";
echo "realpath=" . $fs->realpath($uri) . "\n";
echo "readable=" . (is_dir($fs->realpath($uri)) && is_readable($fs->realpath($uri)) ? "yes" : "no") . "\n";
print_r(glob($fs->realpath($uri) . "/*.pdf"));
'
```

You should see the J-drive PDFs, not an empty list.

---

## 7. Configure LDAP login (Drupal)

1. Log in as Drupal **admin**.
2. Open **Configuration → People → LDAP** (`/admin/config/people/ldap/server`).
3. Add / enable the company directory:
   - Server address, port **636** (LDAPS) preferred
   - Bind DN and password from §3
   - Base DN for users
   - Account name attribute (usually `sAMAccountName` for AD)
   - Group settings so LDAP can list the user’s groups
4. Enable **LDAP authentication** so intranet users log in with AD, not a local Drupal password (keep a local `admin` emergency account).
5. Test with a Finance test user before go-live.

PHP must have the LDAP extension (`php -m | grep ldap`). The install script installs it inside Docker if missing.

---

## 8. Map AD groups to Drupal roles

**Configuration → People → LDAP Role Mapper**  
`/admin/config/people/ldap-role-mapper`

Required rows:

| LDAP group (CN or DN) | Drupal role |
|-----------------------|-------------|
| `FIN_dev` | FIN Dev |
| `F&B_dev` | F&B Dev |
| `FB_dev` | F&B Dev (optional) |

Save.

**Behaviour:** on every LDAP login, Drupal roles are replaced with whatever the mappings produce. Manually assigned FIN/F&B roles will be wiped if the user is not in the AD group. The `authenticated` role is always kept; `administrator` is not removed.

---

## 9. Roles and permissions (verify)

**People → Roles**

| Permission | `fin_dev` | `fnb_dev` | `administrator` | Other roles |
|------------|-----------|-----------|-----------------|-------------|
| Access content | Yes | Yes | Yes | As today |
| View F&B revenue reports | Yes | Yes | Yes | **No** |
| Manage F&B revenue reports | Yes | Yes | Yes | **No** |
| Create/edit/delete F&B Daily Revenue Report content | Yes | Yes | Yes | **No** |
| Administer F&B revenue report settings | No | No | Yes | **No** |

The calendar view is locked to **View F&B revenue reports**. Direct PDF URLs under `private://` also require that permission (`hook_file_download`). Anonymous users get login / 403.

Do **not** grant view permission to Editors, department roles, or authenticated-only.

The configure script sets this for `fin_dev`, `fnb_dev`, and `administrator`.

---

## 10. Cron (so new PDFs appear without clicking Scan)

The module scans the drop folder on **Drupal cron**.

| Environment | What to configure |
|-------------|-------------------|
| Demo / this laptop | Automated cron on page views is usually enough |
| Production | Real crontab, every 5–15 minutes |

Example (Linux, Drupal in `/var/www/drupal`):

```
*/10 * * * * www-data /var/www/drupal/vendor/bin/drush -r /var/www/drupal/web cron >/dev/null 2>&1
```

Docker:

```
*/10 * * * * docker exec -u www-data -w /opt/drupal my-drupal vendor/bin/drush cron >/dev/null 2>&1
```

Manual tests:

- UI: Configuration → System → Cron → **Run cron**
- F&B only: Configuration → Content authoring → F&B revenue reports → **Scan drop folder now**

Scan results: **Created / skipped / errors**. Skipped is normal for files already on the calendar or names with no date. Errors mean the folder is missing or unreadable — check the mount.

Logs: **Reports → Recent log messages**, type `hkcec_fnb_revenue_report`.

**Idempotent:** one PDF per calendar date. A second file for the same date is skipped.

---

## 11. File name contract (give this to Finance)

Preferred:

```
2026-09-16.pdf
```

Also ingested if the date appears in the name:

```
FNB_20260916.pdf
Revenue-2026-09-16-final.pdf
```

Not ingested: `.xlsx` / `.docx`, names with no date, non-PDF extensions.

Drupal setting **Filename date pattern** `Y-m-d` is PHP `date()` syntax. Leave it unless Finance’s naming standard is different (then change the pattern **and** tell Finance).

---

## 12. Security checklist

- [ ] Drop folder is under **private** files, not public `files/`
- [ ] J-drive mount is **read-only** in production
- [ ] `.htaccess` (Apache) or equivalent Nginx rule denies direct HTTP to `/sites/default/files/private/`
- [ ] HTTPS in production
- [ ] Only `fin_dev` / `fnb_dev` / `administrator` have view permission
- [ ] LDAP bind password is not committed to git (settings live on the server)
- [ ] Demo users `finuser` / `fnbuser` **disabled or deleted** on production
- [ ] Demo stub PDF for “today” removed from the drop folder on production
- [ ] Service account for CIFS has least privilege (read the one folder)
- [ ] Backups: J-drive PDFs are backed up with the file server; Drupal DB backup is **metadata only** (date + URI). Restoring Drupal without the mount will show calendar days whose downloads 404.

---

## 13. Menu and calendar page

Confirm:

1. **Structure → Menus → Main navigation** has **F&B Revenue Calendar** → `/finance/fnb-revenue-calendar`  
   The link may be visible to everyone; the **page** still blocks unauthorised users.
2. **Structure → Views → F&B Revenue Calendar**
   - Path: `finance/fnb-revenue-calendar`
   - Access: permission **View F&B revenue reports**
   - Filters: published + content type **F&B Daily Revenue Report**
   - Start date field: **Report date**

---

## 14. Acceptance tests (go-live)

Run the project verifier when using Docker:

```bash
CONTAINER=my-drupal ./scripts/verify-fnb-revenue-calendar.sh
```

Then test as a human:

| # | Test | Expected |
|---|------|----------|
| 1 | Log out. Open `/finance/fnb-revenue-calendar` | Login or access denied |
| 2 | Log in as a normal editor (no FIN/F&B group) | Access denied |
| 3 | Log in as a user in AD `FIN_dev` | Calendar loads |
| 4 | Drop `YYYY-MM-DD.pdf` on J-drive. Wait for cron or Scan now | That date appears once |
| 5 | Click the event → Download PDF | Correct file opens |
| 6 | Scan again | Created = 0, skipped ≥ 1 (no duplicate) |
| 7 | Log out. Guess a private file URL | Denied |
| 8 | Remove user from AD group, log out/in | Calendar denied |
| 9 | Log in as Drupal admin | Settings page and Scan work |

---

## 15. Operations after go-live

| Task | How |
|------|-----|
| Grant access | Add user to AD `FIN_dev` or `F&B_dev`; they log in again |
| Revoke access | Remove from the AD group; they log in again |
| PDF not showing | Check file name, mount `ls`, Scan now, logs |
| Change share path | Update fstab/compose bind; keep Drupal URI `private://fnb-revenue` if the mount target is unchanged |
| Disaster recovery | Restore J-drive files **and** Drupal DB. Mount must resolve the same `private://fnb-revenue/<filename>.pdf` URIs |

Hand Finance the user guide: [`fnb-revenue-calendar-user-guide.md`](fnb-revenue-calendar-user-guide.md).

---

## 16. Troubleshooting (IT)

| Symptom | Check |
|---------|--------|
| Scan errors / empty calendar | Mount not visible to `www-data`; `realpath` of `private://fnb-revenue`; folder empty; cron not running |
| Permission denied on calendar after AD login | Mapper row missing; group CN mismatch; user did not re-login; LDAP server not returning groups |
| Roles wrong after login | Mapper overwrites local roles; confirm AD membership and mapper rows |
| Download 403 | Missing **View F&B revenue reports**; URI not under `fnb-revenue`; user anonymous |
| Download 404 | File renamed/deleted on J-drive; mount down |
| Duplicate days | One from scan + one added by hand — delete extra node under Content |
| LDAP extension missing | `php -m \| grep ldap`; Docker install script installs `libldap2-dev` + `docker-php-ext-install ldap` |
| Cannot write settings.php | Expected if it is read-only; use the Drupal UI for F&B settings, not the file, after first install |

---

## 17. Go-live checklist

1. AD groups exist; test users in `FIN_dev` / `F&B_dev`.
2. Drupal LDAP server enabled (LDAPS).
3. LDAP Role Mapper rows saved.
4. Private path set; `private/fnb-revenue` exists.
5. J-drive mounted **read-only** and Drupal lists PDFs.
6. Cron every 10 minutes (production).
7. Permissions verified; editors cannot open the calendar.
8. Demo accounts and stub PDF removed.
9. Acceptance tests §14 passed.
10. Finance told the file-name standard and calendar URL.

---

## 18. Reference — Drupal objects created

| Object | Machine name |
|--------|----------------|
| Module | `hkcec_fnb_revenue_report` |
| Content type | `fnb_daily_revenue_report` |
| Fields | `field_report_date`, `field_report_file`, `field_source_filename` |
| View | `fnb_revenue_calendar` |
| Config | `hkcec_fnb_revenue_report.settings` |
| Permissions | `view fnb revenue reports`, `manage fnb revenue reports`, `administer fnb revenue report` |
| Roles | `fin_dev`, `fnb_dev` |

Code lives in `modules/custom/hkcec_fnb_revenue_report/`. Cron calls `DropFolderScanner::scan()`.
