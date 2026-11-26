export const examTracks: readonly ["jamb", "waec", "neco", "bece", "common-entrance"];
export const workspaceUnavailable: string;
export type ExamTrack = typeof examTracks[number];

export interface PracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface LessonDraft {
  title: string;
  slug: string;
  examTracks: ExamTrack[];
  videoId: string | null;
  notes: string;
  questions: PracticeQuestion[];
}

export function extractYouTubeId(value: unknown): string | null;
export function validateDraft(input: unknown):
  | { ok: true; draft: LessonDraft }
  | { ok: false; errors: Record<string, string> };

export interface SyllabusMapping {
  exam: ExamTrack;
  syllabusEdition: string;
  objectiveReference: string;
  sourceUrl: string;
}

export function validateSyllabusMappings(input: unknown, tracks: ExamTrack[]): SyllabusMapping[] | null;
