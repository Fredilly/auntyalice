export interface MockQuestion { id: string; prompt: string; options: string[]; answer: number; explanation: string; lesson: string; slug: string; }
export declare function listPublishedQuestions(): Promise<MockQuestion[]>;
export interface DashLesson { slug: string; title: string; questions: number; exam: string; }
export declare function listPublishedLessons(): Promise<DashLesson[]>;
export declare function databaseReachable(): Promise<boolean>;
