# Studio 49 Calendar: Spec

What the app does today, how it's built, and where its limits are. Covers everything up to "Add 1-on-1 meetings and editable meeting locations" (2026-10-16).

## Purpose

Studio 49 is a team of about 14 people split across several teams. Finding a meeting time used to mean asking everyone. With this app, each teammate marks the times they're usually free each week. The app then shows the best times for everyone or for one team, and meetings booked from those times appear on a shared calendar.

**Users:** Studio 49 members on their phones or laptops. There are no accounts. Anyone with the link can view and edit.

**Live:** https://alichaaraoui.github.io/studio49-calendar/

## Architecture

| Piece | What it is |
|---|---|
| `index.html` | The whole app: markup, CSS and plain JavaScript in one file. No build step, no framework. |
| `config.js` | Firebase web settings (`window.FIREBASE_CONFIG`). These are public by design; access is controlled by the rules. |
| Firebase Firestore | Database, project `studio49-calendar`. The page loads the Firebase v10 compat SDK from gstatic. |
| `firestore.rules` | Checks the shape of every write. It doesn't check who made the write. |
| `scripts/seed.mjs` | One-time roster import (`npm run seed`). Reads `seed/team.json` and `seed/groups/*.json`. |
| `seed/` | Real team names. Git-ignored and kept out of the public repo. |
| GitHub Pages | Deploys from `main` at the repo root. A push rebuilds the site in about a minute. |

The page subscribes to all three collections with `onSnapshot`, so changes made by one person show up for everyone else immediately. A re-render triggered by a live update waits until the focused input or select loses focus, so it never interrupts someone typing.

## Time model

- The week runs **Monday to Sunday** (day index 0–6).
- Each day runs **8:00 AM to 10:00 PM** in **30-minute slots** (28 slots, index 0–27).
- A slot key is `"<day>-<slot>"`, for example `"2-4"` means Wednesday 10:00 AM.
- Availability is a **recurring weekly pattern**, not a set of specific dates.
- All times use the browser's local time zone.

## Data model (Firestore)

### `people/{id}`
| Field | Type | Rule |
|---|---|---|
| `name` | string | 1–60 chars |
| `slots` | string[] | slot keys, max 196 (7 × 28) |
| `updatedAt` | number | ms timestamp |

### `groups/{id}` (shown in the app as "Teams")
| Field | Type | Rule |
|---|---|---|
| `name` | string | 1–60 chars |
| `members` | string[] | person ids, max 100 |

The five core teams have fixed ids that set their display order and colors: `g-leadership`, `g-design`, `g-engineering`, `g-clients-comms`, `g-operations`. Other teams sort after these by name, and their color comes from a hash of the id.

### `meetings/{id}`
| Field | Type | Rule |
|---|---|---|
| `title` | string | 1–80 chars |
| `group` | string | `"all"`, a group id, or `"1on1:<personA>,<personB>"` |
| `date` | string | `YYYY-MM-DD` |
| `start` | int | slot index 0–27 |
| `len` | int | 1–4 slots (30 min to 2 hr) |
| `location` | string | optional, free text |
| `createdBy` | string | person id of whoever booked it |
| `createdAt` | number | ms timestamp |

Every other path is closed. In every collection, any document can be read or deleted by anyone.

## Features

### Tab 1: My times
- **Pick yourself:** tap your name from the roster, or type a new name to add yourself. If the typed name matches someone already on the list (ignoring case), the app selects that person instead of adding a duplicate. The choice is stored in `localStorage` (`s49.me`). "Not you?" switches to someone else.
- **Header:** a ring showing free hours per week (fills at 20h), a status line, and your team tags.
- **Desktop:** a 7 × 28 grid. Click or drag to paint slots on or off; the first cell you touch decides whether the drag paints or erases. "Clear all" empties the week.
- **Phone (under 760px):** a day strip with a fill bar for each day, Morning (8–12), Afternoon (12–5) and Evening (5–10) presets, one tappable button per 30-minute slot with merged "Free · start – end" labels, and "Clear" for the day.
- **Copy a day:** pick a source day (on desktop), pick target days or use the Weekdays / Weekend / All shortcuts, then copy. Copying an empty day clears the target days.
- **Autosave:** changes are saved 500 ms after the last edit, and saves run one at a time in order. The status shows Saving…, Saved, or an error.

### Tab 2: Find a time
- **Target:** Everyone or one team (chips show member counts). **Length:** 30 min, 1 hr, 1.5 hr or 2 hr.
- **Ranking** (`rank()`): only people who have marked at least one slot are counted. Every possible start time on every day is scored by how many of those people are free for the whole length. Results are sorted by most free people, then earliest day, then earliest time. Up to 8 options are kept, and no two options on the same day overlap.
- **Best time:** a large card for the top option ("Everyone can make it" when all counted people are free), with avatars, a free/counted ratio, and who's missing. Options 2–8 are listed below it.
- **Still need times from:** the people in the target who haven't marked any slots yet.
- **Week heatmap:** each cell is shaded by the share of counted people free in that slot, and is marked when everyone is free. Tap a cell to open the detail card for a meeting of the chosen length starting there.
- **Detail card:** who's free and who's busy for the selected time, and **Book this time**. Booking opens a meeting draft on the Calendar tab, filled in with the team, the time and the next date that falls on that weekday.

### Tab 3: Calendar
- **Month grid:** Monday-first, with previous and next month buttons. Today is highlighted and past days are dimmed. Each day shows up to 3 colored dots, one per meeting. Tap a day to filter the list to that day; tap it again or press "Show all upcoming" to clear the filter.
- **Agenda:** upcoming meetings (or the selected day's meetings), grouped by date. Each meeting shows its title, time range, location, a team / Everyone / 1-on-1 tag, attendee avatars, and how many attendees are usually free at that time.
- **Mine** filter: shows only meetings you're part of (team membership or one of the two people in a 1-on-1).
- **New meeting / 1-on-1 form:**
  - Title (filled in automatically until you edit it), type (Team meeting or 1-on-1), team picker or two person pickers, and length.
  - **Suggested times:** the top 5 from `rank()` for those attendees, each placed on its next real date. A time later today counts only if it hasn't started yet. Each suggestion shows the free count and who's missing, and the form lists people who haven't marked any times.
  - Manual date (with next-4-date chips when the form was opened from Find a time), start time, and location.
  - A live line showing how many people are usually free for the chosen date and time.
  - Checks before saving: a date is required; a 1-on-1 needs two different people; the meeting can't run past 10 PM.
- **On existing meetings:** add or change the location in place (Enter saves, Esc cancels), or cancel the meeting with a confirmation step.

### Tab 4: Teams
- **Add a teammate:** full name plus optional teams. Duplicate names (ignoring case) are rejected.
- **Team cards:** every person appears as a toggle chip, so tapping a name adds or removes them. Each card shows how many people are on the team and how many have filled in their times, plus "Find a time", which jumps to that team on Find a time, and Delete with a confirmation step.
- **New team:** create a team by name.
- **Everyone:** the full roster with free hours per week, team tags, and Remove with a confirmation step.

### Cross-cutting
- The last open tab is remembered (`s49.tab`), and the scroll position is kept across re-renders.
- The layout switches live between the phone and desktop versions when the window crosses 760px.
- All user text is HTML-escaped before rendering.
- Errors appear in a banner that hides itself after 4 seconds. Permission errors point people to Ali to check the rules.
- If `config.js` isn't filled in, a banner says the database isn't connected.

## Limits and known gaps

- **No authentication.** Anyone with the link can change or delete anything, including other people's availability. The rules only check data shape.
- **Weekly pattern only.** People can't mark exceptions for one specific date (for example, "busy this Thursday").
- **Meetings can't be edited** after booking, apart from the location. To change anything else, cancel and rebook.
- **No recurring meetings**, reminders, notifications or calendar export (.ics or Google Calendar).
- **Deleting a person or team** doesn't clean up references to it. Group `members` lists and 1-on-1 meeting `group` strings keep the old id; the UI skips it, and a meeting whose team was deleted shows "Team removed".
- **Single time zone:** everyone is assumed to be in the same local time zone.
- **Fixed hours:** nothing can be scheduled before 8 AM or after 10 PM.

## Ops

- **Deploy:** push to `main`.
- **Rules change:** edit `firestore.rules`, then paste it into Firebase console → Firestore → Rules and publish. Pushing the repo doesn't deploy the rules.
- **Roster import:** put the data in `seed/`, then run `npm install && npm run seed`. The import overwrites people's `slots`, so only run it on a fresh database.
- **Commits** are made as Ali, with no AI attribution lines.
