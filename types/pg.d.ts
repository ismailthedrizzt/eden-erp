declare module 'pg' {
  export class Client {
    constructor(options?: Record<string, unknown>)
    connect(): Promise<void>
    end(): Promise<void>
    query(sql: string, values?: unknown[]): Promise<{ rows: Array<Record<string, any>>; rowCount: number | null }>
  }
}
