# CareerFlow — Job Application Tracker

CareerFlow is a personal job application tracking platform built as a single-page web app. It helps you record job applications, monitor their status, track interviews, schedule follow-ups, and understand your progress through an interactive dashboard — all stored locally in your browser.

## Project Overview

CareerFlow is a portfolio-ready, fully functional job search tracker. There is no server, no account, and no external API — all your data lives in your browser's LocalStorage. It's built to be a strong foundation for learning front-end development and, later, version control with Git/GitHub.

## Features

- **Dashboard** — summary cards (total applications, interviews scheduled, offers received, follow-ups due), an application activity chart, a status overview, upcoming interviews, and recent applications, all computed live from your data.
- **All Applications** — searchable, filterable (status, work mode, date range), sortable table view, plus a drag-and-drop Kanban board (Wishlist → Applied → Interview → Offer → Rejected) with a keyboard-accessible status dropdown on every card.
- **Add/Edit Application** — a validated modal form covering every field (company, title, URL, location, work mode, employment type, salary, dates, status, recruiter info, interview details, follow-up date, notes), with unsaved-changes protection and inline error messages.
- **Interview Tracker** — upcoming and past interviews, mark interviews completed with an outcome note.
- **Follow-ups** — grouped into Overdue / Due Today / Upcoming, with complete and reschedule actions.
- **Analytics** — application-to-interview and interview-to-offer conversion rates, status distribution, applications by month, applications by work mode, and recent activity — all computed from real data, with safe handling of empty datasets.
- **Settings** — editable display name, light/dark theme, JSON/CSV export, validated JSON import, demo data loading/reset, and a full data-clear option (all with confirmation).
- **Toasts, empty states, and accessible modals** throughout the app.

## Technology Stack

- HTML5 (semantic structure)
- CSS3 (custom properties, Grid/Flexbox, responsive design, dark mode)
- Vanilla JavaScript (ES6+, no frameworks, no build step)
- Browser LocalStorage for persistence

No React, Angular, Vue, TypeScript, backend, or database is used.

## How to Run Locally

1. Download or copy the `careerflow` folder to your computer.
2. Open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari) — double-click it or right-click → "Open with" your browser.
3. That's it — no installation, server, or build step required.

> Tip: Because the app only uses LocalStorage, your data is tied to the specific browser (and profile) you use it in. It will not sync across devices or browsers.

## How to Use Each Feature

### Dashboard
Open the app to land on the Dashboard. All stats and charts update automatically as you add, edit, or delete applications.

### Adding an Application
Click **Add Application** (top right) to open the form. Fill in at least Company, Job Title, and Application Date (marked with `*`), then click **Save Application**.

### Editing / Deleting
From the **All Applications** table or Kanban view, click a row/card to view details, or use the edit/delete icons directly in the table. Deleting always asks for confirmation.

### Searching, Filtering, Sorting
Use the top search bar (global) or the search/filter controls on the Applications page. Click column headers in the table to sort; click again to reverse order.

### Kanban Board
Switch to **Kanban** view on the Applications page. Drag a card to another column to change its status, or use the status dropdown on each card for keyboard access.

### Interview Tracker
Any application with an interview date appears here. Mark an interview as completed to log an outcome and move it to the Past Interviews list.

### Follow-ups
Any application with a follow-up date appears here, grouped by urgency. Use **Complete** to mark it done or **Reschedule** to pick a new date.

### Analytics
Automatically calculated from your stored applications — no manual input needed.

### Settings
- Change your display name.
- Toggle light/dark theme.
- Export your data as JSON (full backup) or CSV (spreadsheet-friendly).
- Import a previously exported JSON file (validated before merging).
- Load or reset demo data, or clear all data entirely.

## Current Limitations

- Data is stored only in the current browser's LocalStorage — it does not sync across devices and can be lost if browser storage is cleared.
- No real notifications, emails, or calendar invites are sent — all reminders are in-app only.
- No multi-user support, authentication, or cloud backup.
- CSV export does not support re-import (JSON import/export is the supported round-trip).

## Future Enhancement Ideas

- Optional backend/database sync for cross-device access.
- Browser notifications for upcoming interviews/follow-ups.
- Resume/cover letter attachment storage.
- Calendar integration (e.g. .ics export).
- Tagging and custom pipeline stages.

## Manual Testing Checklist

- [ ] Add a new application; verify it appears in Dashboard, Applications table, and Kanban.
- [ ] Edit an application; verify changes persist after a page refresh.
- [ ] Delete an application; confirm the confirmation dialog appears and data is removed.
- [ ] Search by company and by job title; verify results filter correctly.
- [ ] Filter by status, work mode, and date range (individually and combined).
- [ ] Sort the table by company, date, and status (ascending and descending).
- [ ] Drag a Kanban card to a new column; verify status updates and persists.
- [ ] Change a card's status via the dropdown (keyboard-only) and verify it updates.
- [ ] Add/edit an interview date; verify it appears in the Interview Tracker and Dashboard.
- [ ] Mark an interview completed; verify it moves to Past Interviews.
- [ ] Add a follow-up date in the past, today, and future; verify correct grouping on the Follow-ups page.
- [ ] Complete and reschedule a follow-up.
- [ ] View Analytics with data, and with all data cleared (zero-division safe).
- [ ] Export JSON and CSV; open the files to confirm correct content.
- [ ] Import a valid JSON file; verify records are added after confirmation.
- [ ] Import an invalid/malformed JSON file; verify a clear error message appears and nothing breaks.
- [ ] Load demo data, then reset demo data, then clear all data (each with confirmation).
- [ ] Resize the browser to tablet and mobile widths; verify sidebar collapses into a drawer and layouts remain usable.
- [ ] Switch between light and dark themes.
- [ ] Open the browser console and confirm there are no errors during normal use.
