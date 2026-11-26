type StaffRole = "teacher" | "reviewer" | "admin";

export interface StaffActor {
  id: string;
  subject: string;
  role: StaffRole;
  active: true;
}

interface StaffRecord {
  id: string;
  subject: string;
  role: string;
  active: boolean;
}

interface StaffRepository {
  findStaffBySubject(subject: string): Promise<StaffRecord | null>;
}

export function resolveActor(request: Pick<Request, "headers">, repository?: StaffRepository): Promise<StaffActor | null>;
export function readSessionActor(request: Pick<Request, "headers">): StaffActor | null;
export function requireRole(actor: StaffActor | null, allowedRoles: readonly StaffRole[]): boolean;
export function establishSession(request: Request, repository?: StaffRepository): Promise<Response>;
export function logout(): Response;
export function me(request: Request, repository?: StaffRepository): Promise<Response>;

export function readCurrentSessionActor(request: Pick<Request, "headers">, repository?: StaffRepository): Promise<StaffActor | null>;
