import { create } from 'zustand';

export type ReviewStep = 'main' | 'positive' | 'negative' | null;

interface ReviewState {
  isVisible: boolean;
  currentWorkoutCount: number;
  step: ReviewStep;
  showPrompt: (workoutCount: number) => void;
  hidePrompt: () => void;
  setStep: (step: ReviewStep) => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  isVisible: false,
  currentWorkoutCount: 0,
  step: null,
  showPrompt: (workoutCount) => set({ isVisible: true, currentWorkoutCount: workoutCount, step: 'main' }),
  hidePrompt: () => set({ isVisible: false, step: null }),
  setStep: (step) => set({ step }),
}));
