const generateTempId = () => Math.random().toString(36).substring(7);

const initialSets = [
  { id: generateTempId(), stance: null, variation: null },
  { id: generateTempId(), stance: null, variation: null }
];

let state = {
  exercises: [
    {
      id: "uuid-1234",
      exercise_id: 42,
      sets: initialSets
    }
  ]
};

function updateSet(exerciseId, setId, changes) {
  state = {
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, ...changes } : s)
        };
      }
      return ex;
    })
  };
}

const targetExerciseId = state.exercises[0].id;
const targetSetId = state.exercises[0].sets[0].id;

updateSet(targetExerciseId, targetSetId, { stance: 'wide', variation: 'wide' });

console.log(JSON.stringify(state, null, 2));
