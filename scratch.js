const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:\\Users\\toshi\\AppData\\Local\\TreNote\\SQLite\\trenote.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  }
});

db.all(`
  SELECT re.routine_id, re.id as routine_exercise_id, e.id as exercise_id, e.name as exercise_name,
         e.is_unilateral, e.equipment, e.muscle_group, e.default_variation, e.default_stance, e.weight_step
  FROM routine_exercises re
  JOIN exercises e ON re.exercise_id = e.id
`, [], (err, rows) => {
  if (err) {
    throw err;
  }
  console.log(JSON.stringify(rows, null, 2));
});
