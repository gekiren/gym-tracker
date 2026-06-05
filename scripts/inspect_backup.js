const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = 'C:\\Users\\toshi\\.gemini\\antigravity\\scratch\\kintore\\teikyou\\trenote_backup.db';

try {
  const db = new DatabaseSync(dbPath);
  console.log('Opened database successfully.');
  
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables);
  
  // Count rows in each table
  for (const table of tables) {
    const tableName = table.name;
    const countRow = db.prepare(`SELECT count(*) as count FROM ${tableName}`).get();
    console.log(`Table ${tableName}: ${countRow.count} rows`);
  }

  // Get workouts
  const workouts = db.prepare("SELECT id, title, start_time FROM workouts ORDER BY start_time DESC").all();
  console.log(`Total workouts: ${workouts.length}`);
  console.log('Latest 5 workouts:');
  workouts.slice(0, 5).forEach(w => console.log(` - ID ${w.id}: ${w.title} (${w.start_time})`));

} catch (err) {
  console.error('Error opening/inspecting database:', err);
}
