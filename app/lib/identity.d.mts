export const staffDevIdentityEnabled: boolean;

export function resolveIdentity(request: Pick<Request, "headers">):
  Promise<{ subject: string; email: string | null } | null>;
