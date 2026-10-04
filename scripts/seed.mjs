// One-time import of the team roster and teams into Firestore.
// Usage: npm install && npm run seed
// Reads config.js for the Firebase settings and seed/ (git-ignored) for the data.
import { readFileSync, readdirSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';

const cfgText = readFileSync(new URL('../config.js', import.meta.url), 'utf8');
const config = new Function('return ' + cfgText.slice(cfgText.indexOf('{'), cfgText.lastIndexOf('}') + 1))();
if (String(config.apiKey).startsWith('PASTE')) {
  console.error('Fill in config.js with your Firebase settings first.');
  process.exit(1);
}

const db = getFirestore(initializeApp(config));
const team = JSON.parse(readFileSync(new URL('../seed/team.json', import.meta.url), 'utf8'));
const groupsDir = new URL('../seed/groups/', import.meta.url);

const batch = writeBatch(db);
for (const [id, name] of Object.entries(team.people)) {
  batch.set(doc(db, 'people', id), { name, slots: [], updatedAt: 0 });
}
for (const file of readdirSync(groupsDir).filter(f => f.endsWith('.json'))) {
  const g = JSON.parse(readFileSync(new URL(file, groupsDir), 'utf8'));
  batch.set(doc(db, 'groups', file.replace(/\.json$/, '')), { name: g.name, members: g.members });
}
await batch.commit();
console.log(`Imported ${Object.keys(team.people).length} people and their teams.`);
process.exit(0);
