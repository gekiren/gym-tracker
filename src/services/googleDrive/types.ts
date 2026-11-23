export type DriveApplyMode = 'confirm' | 'auto';

export interface GoogleDriveSyncSettings {
  enabled: boolean;
  folderName: string;
  folderId?: string;
  folderPath?: string;
  autoUpload: boolean;
  autoDownload: boolean;
  applyMode: DriveApplyMode;
  includeMarkdownSummary: boolean;
  connectedEmail?: string;
  lastUploadAt?: string;
  lastDownloadAt?: string;
  lastAppliedProposalId?: string;
  lastAppliedUpdatedAt?: string;
  lastError?: string;
}

export const DEFAULT_GOOGLE_DRIVE_SYNC_SETTINGS: GoogleDriveSyncSettings = {
  enabled: false,
  folderName: 'TreNote_AI_Sync',
  autoUpload: true,
  autoDownload: true,
  applyMode: 'confirm',
  includeMarkdownSummary: true,
};

export interface RestorePauseState {
  paused: boolean;
  restoredAt: string;
  sourceName?: string;
}

export interface TrainerAdviceEntry {
  id: string;
  date?: string;
  title?: string;
  summary?: string;
  message: string;
  focusAreas?: string[];
  proposalId?: string;
  receivedAt: string;
}

export interface ProposedWorkoutSet {
  set_number?: number;
  reps?: number | null;
  weight?: number | null;
  rpe?: number | null;
  speed?: number | null;
  incline?: number | null;
  side?: string | null;
  variation?: string | null;
  stance?: string | null;
}

export interface ProposedWorkoutExercise {
  name: string;
  muscle_group?: string;
  equipment?: string;
  is_unilateral?: boolean;
  default_variation?: string | null;
  default_stance?: string | null;
  weight_step?: number;
  rest_seconds?: number | null;
  sets?: ProposedWorkoutSet[];
}

export interface ProposedWorkoutMenu {
  action?: 'upsert' | 'create' | 'replace';
  title: string;
  description?: string;
  exercises: ProposedWorkoutExercise[];
}

export interface ProposedDailyRoutineTask {
  id?: string;
  name: string;
  estimated_seconds: number;
}

export interface ProposedDailyRoutine {
  id?: string;
  action?: 'upsert' | 'create' | 'replace';
  name: string;
  tasks: ProposedDailyRoutineTask[];
  auto_update_estimates?: boolean;
  auto_advance?: boolean;
  enable_vibration?: boolean;
  hidden?: boolean;
}

export interface ProposedTimePlanItem {
  name: string;
  percent?: number;
  weight?: number;
}

export interface ProposedTimePlan {
  id?: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  category?: 'invest' | 'maintain' | 'drift' | string;
  activity_name?: string;
  items?: ProposedTimePlanItem[];
  memo?: string;
  replaceDatePlans?: boolean;
}

export interface ProposedDefaultScheduleSlot {
  start: string; // HH:mm
  end: string; // HH:mm
  category?: 'invest' | 'maintain' | 'drift' | string;
  activity_name?: string;
  items?: ProposedTimePlanItem[];
  memo?: string;
}

export interface ProposedDefaultSchedule {
  id?: number | string;
  name: string;
  days: number[]; // 0=Sun .. 6=Sat
  data: ProposedDefaultScheduleSlot[];
}

export interface ProposedTimeTemplate {
  id?: string | number;
  name: string;
  items: ProposedDefaultScheduleSlot[];
}

export interface ProposedActivityPiece {
  name: string;
  icon?: string;
  type?: 'large' | 'medium' | 'small';
  category?: 'invest' | 'maintain' | 'drift';
  duration?: number;
  snap?: number;
  color?: 'amber' | 'blue' | 'purple' | 'green' | string;
}

export interface ProposedTimeManagement {
  replaceDates?: string[];
  plans?: ProposedTimePlan[];
  defaultSchedules?: ProposedDefaultSchedule[];
  templates?: ProposedTimeTemplate[];
  pieces?: ProposedActivityPiece[];
}

export interface ProposedBodyCompositionLog {
  date: string; // YYYY-MM-DD (or YYYY/MM/DD normalized to YYYY-MM-DD)
  action?: 'upsert' | 'replace';
  weight?: number | null;
  body_fat_rate?: number | null;
  muscle_mass?: number | null;
  lbm?: number | null;
  height?: number | null;
  neck?: number | null;
  waist?: number | null;
  hip?: number | null;
  wrist?: number | null;
  ankle?: number | null;
  gender?: 'male' | 'female';
  memo?: string | null;
}

export interface AiAgentProposalsPayload {
  schemaVersion?: number;
  proposalId: string;
  updatedAt: string;
  agentName?: string;
  status?: 'pending' | 'applied' | 'ignored';
  appliedAt?: string;
  trainerAdvice?:
    | string
    | {
        title?: string;
        date?: string;
        summary?: string;
        message: string;
        focusAreas?: string[];
      }
    | Array<{
        id?: string;
        title?: string;
        date?: string;
        summary?: string;
        message: string;
        focusAreas?: string[];
      }>;
  workoutMenus?: ProposedWorkoutMenu[];
  dailyRoutines?: ProposedDailyRoutine[];
  timeManagement?: ProposedTimeManagement;
  bodyComposition?: ProposedBodyCompositionLog[];
  memoryUpdates?: string[];
}

export interface ProposalSummaryCounts {
  adviceCount: number;
  workoutMenusCount: number;
  dailyRoutinesCount: number;
  timePlansCount: number;
  defaultSchedulesCount: number;
  templatesCount: number;
  piecesCount: number;
  bodyCompositionCount: number;
  memoryUpdatesCount: number;
}

export interface PendingDriveProposal {
  fileId?: string;
  fileName: string;
  detectedAt: string;
  payload: AiAgentProposalsPayload;
  counts: ProposalSummaryCounts;
  previewSummary: string;
}

export interface AppliedProposalHistoryEntry {
  proposalId: string;
  updatedAt: string;
  appliedAt: string;
  agentName?: string;
  summary: string;
  counts: ProposalSummaryCounts;
}
