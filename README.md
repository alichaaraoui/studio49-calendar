# Studio 49 Calendar

A phone-friendly team calendar for Studio 49. Teammates mark when they're usually free each week, and the app finds the best meeting times for everyone or for one team (Design, Engineering, and so on). Meetings booked from those times show up on a shared calendar.

It's a single static page (`index.html`) hosted on GitHub Pages, with team data stored in Firebase Cloud Firestore.

## Setup

1. **Create the database.** In the [Firebase console](https://console.firebase.google.com), create a project, then go to Build → Firestore Database → Create database (production mode, any nearby region).
2. **Add the access rules.** In Firestore → Rules, paste the contents of `firestore.rules` and publish.
3. **Connect the page.** In Project settings → Your apps, add a Web app and copy its `firebaseConfig` values into `config.js`.
4. **Load the team** (optional, local only): put the roster in `seed/` and run `npm install && npm run seed`.
5. **Publish.** Push to GitHub, then in the repo go to Settings → Pages → Deploy from branch → `main` / root.

## Who can edit

Anyone with the link can view and edit availability, teams and meetings. The Firestore rules check the shape of what's written but don't check who wrote it, so share the link only with the team.
