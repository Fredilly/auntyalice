type StaffRole = "teacher" | "reviewer" | "admin";

interface StaffActor {
  id: string;
  subject: string;
  role: StaffRole;
  name: string;
}

interface StaffRecord extends StaffActor {
  active: boolean;
  passwordSalt: string;
  passwordHash: string;
}

interface StaffRepository {
  findStaffByEmail(email: string): Promise<StaffRecord | null>;
  touchLastLogin(id: string): Promise<void>;
}

export function resolveActor(request: Request): StaffActor | null;
export function requireRole(actor: StaffActor | null, allowedRoles: readonly StaffRole[]): boolean;
export function login(request: Request, repository?: StaffRepository): Promise<Response>;
export function logout(): Response;
export function me(request: Request): Response;
