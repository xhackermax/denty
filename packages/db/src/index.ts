export interface DatabaseConfig {
  provider: "sqlite" | "postgresql";
  url: string;
}

export const defaultDatabaseConfig: DatabaseConfig = {
  provider: "sqlite",
  url: "file:./denty.sqlite"
};
