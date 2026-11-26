import type { Client, Pool, Queryable } from "./db.mjs";
import type { LessonSummary, StaffActor } from "./staff-lesson-repo";
import type { ExamTrack, LessonDraft, SyllabusMapping } from "./staff-workspace.mjs";

type RevisionContent = Partial<Omit<LessonDraft, "slug" | "notes">> & { notes?: string | string[] };
type DraftInput = {
  lessonId?: string;
  expectedRevisionId?: string;
  slug: string;
  ownerId: string;
  content: LessonDraft & { syllabusMappings?: SyllabusMapping[] };
};

export class LessonWriteError extends Error {
  constructor(status: 400 | 403 | 404 | 409, message: string);
  readonly status: 400 | 403 | 404 | 409;
}

export function listLessonsForStaff(staffId: string, role: StaffActor["role"], db?: Queryable): Promise<LessonSummary[]>;
export function getLesson(id: string, actor?: StaffActor | null, db?: Queryable): Promise<{
  id: string;
  slug: string;
  owner_id: string;
  published_revision_id: string | null;
  created_at: Date;
  revision_id: string;
  revision_created_at: Date;
  version: number;
  author_id: string;
  state: LessonSummary["state"];
  content: RevisionContent;
  mappings: SyllabusMapping[];
} | null>;
export function listReviewQueue(staffId: string, role: StaffActor["role"], db?: Queryable): Promise<{
  id: string;
  title: string;
  state: "submitted" | "approved";
  notes: string | string[] | null;
  exam_tracks: ExamTrack[] | null;
  submitted_at: Date;
  mapped_exams: ExamTrack[];
}[]>;
export function withTransaction<T>(db: Pool, work: (client: Client) => Promise<T>): Promise<T>;
export function renameLesson(id: string, slug: string, db?: Queryable): Promise<boolean>;
export function requireActiveTeacher(db: Queryable, actor: StaffActor): Promise<void>;
export function insertDraft(client: Queryable, draft: DraftInput): Promise<{ lessonId: string; revisionId: string }>;
export function saveDraft(draft: DraftInput, db?: Pool): Promise<{ lessonId: string; revisionId: string }>;
export function transitionLesson<Action extends Exclude<LessonSummary["state"], "draft">>(input: {
  revisionId: string;
  actorId: string;
  action: Action;
  reason?: string;
  checklist?: Record<string, boolean> | null;
}, db?: Queryable): Promise<Action>;
export function getPublishedRevision(slug: string, db?: Queryable): Promise<{
  slug: string;
  version: number;
  content: RevisionContent;
} | null>;
