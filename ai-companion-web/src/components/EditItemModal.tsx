import React, { useState } from 'react';
import { X, Check, Dumbbell, Droplets, Utensils, BookOpen } from 'lucide-react';
import type { WorkoutRecord, WaterRecord, MealRecord, DailyNoteRecord, ExtractedData } from '../types';

export interface ThemeColors {
  background: string;
  card: string;
  cardSubtle: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  inputBg: string;
  badgeBg: string;
  accent: string;
  primary: string;
  success: string;
  danger: string;
}

export type EditTarget =
  | { category: 'workouts'; item: WorkoutRecord }
  | { category: 'waters'; item: WaterRecord }
  | { category: 'meals'; item: MealRecord }
  | { category: 'dailyNotes'; item: DailyNoteRecord };

interface EditItemModalProps {
  target: EditTarget;
  themeTokens: ThemeColors;
  onSave: (category: keyof ExtractedData, updatedItem: any) => void;
  onClose: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  target,
  themeTokens,
  onSave,
  onClose,
}) => {
  const { category, item } = target;

  // Form states based on category
  const [exerciseName, setExerciseName] = useState((item as WorkoutRecord).exercise_name || '');
  const [weightKg, setWeightKg] = useState((item as WorkoutRecord).weight_kg !== undefined ? String((item as WorkoutRecord).weight_kg) : '');
  const [reps, setReps] = useState((item as WorkoutRecord).reps !== undefined ? String((item as WorkoutRecord).reps) : '');
  const [sets, setSets] = useState((item as WorkoutRecord).sets !== undefined ? String((item as WorkoutRecord).sets) : '');
  const [workoutNotes, setWorkoutNotes] = useState((item as WorkoutRecord).notes || '');

  const [amountMl, setAmountMl] = useState((item as WaterRecord).amount_ml !== undefined ? String((item as WaterRecord).amount_ml) : '');
  const [hasCaffeine, setHasCaffeine] = useState(Boolean((item as WaterRecord).has_caffeine));

  const [mealName, setMealName] = useState((item as MealRecord).meal_name || '');
  const [calories, setCalories] = useState((item as MealRecord).calories !== undefined ? String((item as MealRecord).calories) : '');
  const [protein, setProtein] = useState((item as MealRecord).protein !== undefined ? String((item as MealRecord).protein) : '');

  const [condition, setCondition] = useState((item as DailyNoteRecord).condition || '');
  const [summary, setSummary] = useState((item as DailyNoteRecord).summary || '');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (category === 'workouts') {
      const updated: WorkoutRecord = {
        ...item,
        exercise_name: exerciseName.trim() || 'トレーニング',
        weight_kg: weightKg !== '' && !isNaN(Number(weightKg)) ? Number(weightKg) : undefined,
        reps: reps !== '' && !isNaN(Number(reps)) ? Math.round(Number(reps)) : undefined,
        sets: sets !== '' && !isNaN(Number(sets)) ? Math.round(Number(sets)) : undefined,
        notes: workoutNotes.trim() || undefined,
      };
      onSave('workouts', updated);
    } else if (category === 'waters') {
      const updated: WaterRecord = {
        ...item,
        amount_ml: amountMl !== '' && !isNaN(Number(amountMl)) ? Number(amountMl) : 0,
        has_caffeine: hasCaffeine,
      };
      onSave('waters', updated);
    } else if (category === 'meals') {
      const updated: MealRecord = {
        ...item,
        meal_name: mealName.trim() || '食事',
        calories: calories !== '' && !isNaN(Number(calories)) ? Number(calories) : undefined,
        protein: protein !== '' && !isNaN(Number(protein)) ? Number(protein) : undefined,
      };
      onSave('meals', updated);
    } else if (category === 'dailyNotes') {
      const updated: DailyNoteRecord = {
        ...item,
        condition: condition.trim() || undefined,
        summary: summary.trim() || 'メモなし',
      };
      onSave('dailyNotes', updated);
    }
  };

  const getHeaderInfo = () => {
    switch (category) {
      case 'workouts':
        return { title: '筋トレ記録の編集', icon: <Dumbbell size={18} color="#ff6b00" /> };
      case 'waters':
        return { title: '水分記録の編集', icon: <Droplets size={18} color="#4facfe" /> };
      case 'meals':
        return { title: '食事記録の編集', icon: <Utensils size={18} color="#4cd964" /> };
      case 'dailyNotes':
        return { title: 'デイリーノートの編集', icon: <BookOpen size={18} color="#a78bfa" /> };
    }
  };

  const headerInfo = getHeaderInfo();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: themeTokens.inputBg,
    border: `1px solid ${themeTokens.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: themeTokens.text,
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: themeTokens.textMuted,
    marginBottom: 6,
  };

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: 14,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: themeTokens.card,
          border: `1px solid ${themeTokens.border}`,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: `1px solid ${themeTokens.borderSubtle}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, color: themeTokens.text }}>
            {headerInfo.icon}
            <span>{headerInfo.title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: themeTokens.textMuted,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleFormSubmit} style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
          {category === 'workouts' && (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>種目名</label>
                <input
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  style={inputStyle}
                  placeholder="例: ベンチプレス"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, ...fieldGroupStyle }}>
                <div>
                  <label style={labelStyle}>重量 (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    style={inputStyle}
                    placeholder="60"
                  />
                </div>
                <div>
                  <label style={labelStyle}>回数 (reps)</label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    style={inputStyle}
                    placeholder="10"
                  />
                </div>
                <div>
                  <label style={labelStyle}>セット数</label>
                  <input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    style={inputStyle}
                    placeholder="3"
                  />
                </div>
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>メモ / 特記事項</label>
                <input
                  type="text"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  style={inputStyle}
                  placeholder="例: RPE 8、フォーム良好"
                />
              </div>
            </>
          )}

          {category === 'waters' && (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>水分摂取量 (ml)</label>
                <input
                  type="number"
                  step="10"
                  value={amountMl}
                  onChange={(e) => setAmountMl(e.target.value)}
                  style={inputStyle}
                  placeholder="300"
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, ...fieldGroupStyle }}>
                <input
                  type="checkbox"
                  id="hasCaffeineCheck"
                  checked={hasCaffeine}
                  onChange={(e) => setHasCaffeine(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: themeTokens.primary, cursor: 'pointer' }}
                />
                <label htmlFor="hasCaffeineCheck" style={{ fontSize: 14, color: themeTokens.text, cursor: 'pointer' }}>
                  カフェイン含有（コーヒー・緑茶・エナジードリンク等）
                </label>
              </div>
            </>
          )}

          {category === 'meals' && (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>食事・メニュー名</label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  style={inputStyle}
                  placeholder="例: プロテインシェイク、鶏胸肉と白米"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, ...fieldGroupStyle }}>
                <div>
                  <label style={labelStyle}>カロリー (kcal)</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    style={inputStyle}
                    placeholder="450"
                  />
                </div>
                <div>
                  <label style={labelStyle}>タンパク質 (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    style={inputStyle}
                    placeholder="30"
                  />
                </div>
              </div>
            </>
          )}

          {category === 'dailyNotes' && (
            <>
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>体調・コンディション</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  style={inputStyle}
                  placeholder="例: 良好、少し肩に張りあり"
                />
              </div>

              <div style={fieldGroupStyle}>
                <label style={labelStyle}>雑記・メモ・気づき</label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="例: 今日は睡眠が7時間取れて集中力が高かった。"
                  required
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: themeTokens.cardSubtle,
                border: `1px solid ${themeTokens.border}`,
                color: themeTokens.textMuted,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: themeTokens.accent,
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Check size={16} />
              <span>保存する</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
