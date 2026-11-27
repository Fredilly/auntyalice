export interface MockQuestion { id: string; prompt: string; options: string[]; answer: number; explanation: string; lesson: string; slug: string; }
export declare function listPublishedQuestions(): Promise<MockQuestion[]>;
