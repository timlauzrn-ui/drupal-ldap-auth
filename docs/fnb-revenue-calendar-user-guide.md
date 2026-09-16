# F&B Daily Revenue Calendar — user guide

This is the **financial page** on the intranet. It shows each day’s F&B revenue PDF on a calendar.

You do **not** need to know Drupal, Docker, or code to use it. Follow the section that matches your job.

| If you are… | Read |
|-------------|------|
| Finance or F&B staff who open reports | [Daily use](#1-daily-use-finance--fb-staff) |
| Intranet administrator who sets the page up | [Site setup](#2-site-setup-intranet-administrator) |
| IT who handles the shared drive and AD logins | Full procedure: [`fnb-revenue-calendar-it-setup.md`](fnb-revenue-calendar-it-setup.md) |
| Stuck | [Troubleshooting](#5-troubleshooting) |

---

## What this page does

Every day, Finance (or F&B) saves a PDF named with that date onto a shared folder (the J-drive in production).

The intranet then:

1. Notices the new PDF (automatically overnight, or when an admin clicks **Scan drop folder now**).
2. Puts a **dot / event** on that date on the calendar.
3. Lets authorised people click the date and **download the PDF**.

The PDF stays in the shared folder. The intranet does **not** make a second copy. It only remembers the date and the link.

**Calendar address:** http://localhost:8080/finance/fnb-revenue-calendar  
On the live intranet the same path is `/finance/fnb-revenue-calendar`.  
The top menu also has **F&B Revenue Calendar**.

---

## Who can see it

The calendar and the PDFs are **private**.

| Person | What they can do |
|--------|------------------|
| Not logged in | Cannot open the calendar or download PDFs |
| Ordinary intranet user (no Finance / F&B role) | Cannot open the calendar or PDFs |
| **FIN Dev** or **F&B Dev** role | Open the calendar, download PDFs, add / edit / delete reports |
| Site administrator | Everything above, plus change the folder settings |

On this demo site you can try it with:

| Username | Password | Role |
|----------|----------|------|
| `finuser` | `finuser` | FIN Dev |
| `fnbuser` | `fnbuser` | F&B Dev |
| `admin` | `admin` | Administrator |

On the real intranet, people get these roles from their **Active Directory / LDAP group** when they log in (see [IT setup](#3-it-setup-shared-folder-and-logins)).

---

## 1. Daily use (Finance / F&B staff)

### Open the calendar

1. Log in to the intranet.
2. Click **F&B Revenue Calendar** in the top menu  
   **or** go to `/finance/fnb-revenue-calendar`.
3. You should see a month calendar titled **F&B Daily Revenue Reports**.

If you are sent to a login page or “Access denied”, your account does not have the Finance / F&B role. Ask IT to add you to the AD group `FIN_dev` or `F&B_dev`.

### Open a day’s PDF

1. Find the date (use the month arrows if needed).
2. Click the event on that day (title looks like **F&B Revenue 2026-09-16**).
3. On the report page, click **Download PDF**.

### Get a new day onto the calendar (normal way)

This is the intended daily workflow. You do **not** upload the file in Drupal.

1. Save the PDF into the agreed shared folder (J-drive in production).
2. Name it with the report date, for example:
   - `2026-09-16.pdf` (preferred)
   - or a name that includes `20260916` or `2026-09-16`
3. Wait for the overnight automatic scan, **or** ask an administrator to click **Scan drop folder now**.
4. Refresh the calendar. That date should now have an event.

If a file for that date is already on the calendar, the scan will **skip** it (no duplicates).

### Add a report by hand (if the folder scan is not used)

Only people with the Finance / F&B / Administrator role can do this.

1. In the black admin bar, click **Content** (or **Create** → **F&B Daily Revenue Report**).
2. Fill in:
   - **Title** — e.g. `F&B Revenue 2026-09-16`
   - **Report date** — the day this PDF belongs to
   - **Report PDF** — choose the PDF from your computer
   - **Source filename** — optional; the original file name
3. Click **Save**.

Hand-uploaded files still go into the private F&B folder. They are not visible to people without permission.

---

## 2. Site setup (intranet administrator)

Do this once. After that, staff only drop PDFs and open the calendar.

### Checklist

1. The module **HKCEC F&B Revenue Report** is enabled  
   (Extend → search “F&B Revenue”).
2. The calendar page exists at `/finance/fnb-revenue-calendar`.
3. The top menu has **F&B Revenue Calendar**.
4. Roles **FIN Dev** (`fin_dev`) and **F&B Dev** (`fnb_dev`) exist and have the permissions below.
5. LDAP mappings point AD groups to those roles.
6. A private drop folder exists and (in production) points at the J-drive share.
7. Cron is running so new PDFs appear without anyone clicking Scan.

On this project, one command does all of that:

```bash
CONTAINER=my-drupal ./scripts/configure-fnb-revenue-calendar.sh
```

### Open the settings screen

**Configuration → Content authoring → F&B revenue reports**

Direct address: `/admin/config/content/fnb-revenue-report`

You need the permission **Administer F&B revenue report settings** (administrators have this).

### What each setting means

| Setting | What to enter | Leave as (unless IT says otherwise) |
|---------|----------------|-------------------------------------|
| **Drop folder URI** | Where Drupal looks for new PDFs | `private://fnb-revenue` |
| **Filename date pattern** | How the date is written in the file name | `Y-m-d` (means `2026-09-16.pdf`) |
| **Create report nodes as unpublished** | Tick only if someone must approve reports before they appear on the calendar | Unticked (reports appear immediately) |

Then click **Save configuration**.

**Scan drop folder now** looks in the folder **right now** and adds any new correctly named PDFs. Use this after Finance drops a file and you do not want to wait for overnight cron.

A successful scan shows: `Scan finished. Created: X, skipped: Y, errors: Z`.

- **Created** = new calendar days added
- **Skipped** = already on the calendar, or the file name is not a date
- **Errors** = folder missing, or a file could not be read — check Reports → Recent log messages

### Permissions (People → Roles)

Give **FIN Dev** and **F&B Dev**:

| Permission | Why |
|------------|-----|
| View F&B revenue reports | Open the calendar and download PDFs |
| Manage F&B revenue reports | Add, edit, delete report pages |
| Create / edit / delete F&B Daily Revenue Report content | Same as manage, for the content type |
| Access content | Needed to use the site at all |

Give **Administrator** those plus **Administer F&B revenue report settings**.

Do **not** give these to general editors. Other roles cannot see or download the PDFs even if they guess the link.

### Menu link

**Structure → Menus → Main navigation**

There should be an item **F&B Revenue Calendar** pointing to `/finance/fnb-revenue-calendar`.

The link can show in the menu for everyone; the **page itself** still blocks unauthorised people.

### Calendar page (if it is missing)

The setup script creates a view named **F&B Revenue Calendar**.

To check it: **Structure → Views → F&B Revenue Calendar**.

- Path: `finance/fnb-revenue-calendar`
- Access: permission **View F&B revenue reports**
- Shows only published **F&B Daily Revenue Report** items
- Date field used on the calendar: **Report date**

### Automatic scanning (cron)

Drupal cron runs the folder scan. On a normal server this is already scheduled.

To run it by hand as admin: **Configuration → System → Cron → Run cron**.

That is the same idea as **Scan drop folder now**, plus other site maintenance.

---

## 3. IT setup (shared folder and logins)

**IT: use the full setup guide** → [`fnb-revenue-calendar-it-setup.md`](fnb-revenue-calendar-it-setup.md)  
(AD groups, J-drive mount, LDAP, cron, security, go-live tests.)

### Shared folder (J-drive)

Finance already saves daily PDFs on a network share. Point that share at Drupal’s private F&B folder so the intranet can see the files **without copying them**.

| Environment | Folder the intranet reads |
|-------------|---------------------------|
| This demo computer | `sites/default/files/private/fnb-revenue/` inside the Drupal container |
| Production | Bind-mount (or equivalent) the J-drive report share onto that private folder, preferably **read-only** |

Recommended file names:

```
2026-09-16.pdf
2026-09-17.pdf
```

Also accepted if the date appears in the name:

```
FNB_20260916.pdf
Revenue-2026-09-16-final.pdf
```

Files that are not PDFs, or have no date in the name, are skipped.

### Active Directory groups → intranet roles

On each LDAP login, the **LDAP Role Mapper** sets Drupal roles from AD groups.

**Configuration → People → LDAP Role Mapper**  
Address: `/admin/config/people/ldap-role-mapper`

Required rows:

| LDAP / AD group | Intranet role |
|-----------------|---------------|
| `FIN_dev` | FIN Dev (`fin_dev`) |
| `F&B_dev` | F&B Dev (`fnb_dev`) |
| `FB_dev` | F&B Dev (`fnb_dev`) (alternate spelling) |

After you change a person’s AD group, they must **log out and log in again** for the role to update.

LDAP login **replaces** mapped roles. Do not rely on manually ticking FIN Dev on the user account if they log in via AD.

### Private files

PDFs must stay under the **private** files path so they cannot be downloaded with a public `/sites/default/files/…` URL. Unauthorised users get a denied download even if they have the file address.

---

## 4. What exists behind the scenes (for reference)

You can skip this section unless you are checking that setup is complete.

| Piece | Name / place |
|-------|----------------|
| Drupal module | HKCEC F&B Revenue Report (`hkcec_fnb_revenue_report`) |
| Content type | **F&B Daily Revenue Report** |
| Fields | Report date, Report PDF, Source filename |
| Calendar | View **F&B Revenue Calendar** at `/finance/fnb-revenue-calendar` |
| Settings | `/admin/config/content/fnb-revenue-report` |
| Help in Drupal | **Help → HKCEC F&B Revenue Report** |

One day = one report. A second PDF for the same date is skipped by the scan.

---

## 5. Troubleshooting

| What you see | Likely cause | What to do |
|--------------|--------------|------------|
| Access denied / login wall on the calendar | Account has no FIN / F&B / admin role | IT: add AD group, then log out and in. Demo: log in as `finuser` |
| Calendar is empty | No reports yet, or they are unpublished | Drop a correctly named PDF and Scan; or unpublish checkbox is on |
| PDF dropped but date never appears | Wrong file name, or scan has not run | Use `YYYY-MM-DD.pdf`; click **Scan drop folder now** |
| Scan says skipped | File already used, or name has no date | That is normal for duplicates. Rename if the date is missing |
| Scan says errors | Folder missing or not readable | IT: check the J-drive mount and private folder |
| “Download PDF” fails | No view permission, or file missing on the share | Check the role; confirm the PDF is still in the drop folder |
| Two events on one day | One came from scan and one was added by hand | Delete the extra **F&B Daily Revenue Report** under Content |
| Editor can see other pages but not this | By design | Do not grant F&B permissions to general editors |

Logs: **Reports → Recent log messages**, filter by type **hkcec_fnb_revenue_report**.

---

## 6. Quick start on this computer

1. Open http://localhost:8080 and log in as `finuser` / `finuser`.
2. Click **F&B Revenue Calendar** in the top menu.
3. Open today’s event (a sample PDF is created when the site is configured).
4. To add another day: save a file named like `2026-09-20.pdf` into the drop folder, then as **admin** go to **Configuration → Content authoring → F&B revenue reports** and click **Scan drop folder now**.
