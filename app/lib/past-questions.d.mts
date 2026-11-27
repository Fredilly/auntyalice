export interface PastPaper { id: string; body: string; subject: string; year: number; paper: string; title: string | null; questions: number; }
export interface Catalogue { available: boolean; bodies: string[]; papers: PastPaper[]; }
export interface PastQuestion { id: string; prompt: string; options: string[]; answer: number; explanation: string; lesson: string; diagram: string | null; }
export declare function pastQuestionCatalogue(): Promise<Catalogue>;
export declare function paperQuestions(paperId: string): Promise<PastQuestion[]>;
