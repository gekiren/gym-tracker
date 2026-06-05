const { DatabaseSync } = require('node:sqlite');

const dbPath = 'C:\\Users\\toshi\\.gemini\\antigravity\\scratch\\kintore\\teikyou\\trenote_backup.db';

try {
  const db = new DatabaseSync(dbPath);
  console.log('Opened database.');

  // Inject standard default settings keys
  const settingsToInject = [
    { key: 'weight_unit', value: 'kg' },
    { key: 'style_mode', value: 'advanced' },
    { key: 'display_rpe', value: '1' },
    { key: 'display_1rm', value: '1' },
    { key: 'display_volume', value: '1' },
    { key: 'display_stance', value: '1' },
    { key: 'crash_report_consent', value: 'unset' }
  ];

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  for (const s of settingsToInject) {
    stmt.run(s.key, s.value);
    console.log(`Injected setting: ${s.key} = ${s.value}`);
  }

  db.close();
  console.log('Done modifying database.');
} catch (err) {
  console.error('Error modifying database:', err);
}
