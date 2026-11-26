export interface Queryable {
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

export interface Client extends Queryable {
  release(discard?: boolean): void;
}

export interface Pool extends Queryable {
  connect(): Promise<Client>;
  end(): Promise<void>;
}

export class DatabaseNotConfiguredError extends Error {
  readonly code: "database_not_configured";
}

export function getPool(): Pool;
export function withDatabase<T>(work: (db: Pool) => Promise<T>): Promise<T>;
