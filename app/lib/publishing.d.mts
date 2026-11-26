export function validateLessonContent(content: unknown): string[];
export const reviewChecklist: Readonly<Record<
  "accuracy" | "answerKeys" | "rights" | "safeguarding" | "accessibility", string
>>;
export function isReviewComplete(approval: unknown): boolean;
export function transition(input: {
  state: string;
  action: string;
  actor: { id: string; role: string; active: boolean };
  ownerId: string;
  authorId: string;
  approval?: Record<string, boolean>;
}): string;
