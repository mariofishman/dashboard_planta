import { resolve } from "node:path";
import process from "node:process";
import type { DatabaseMode } from "@monitor/database";
import type { FeatureFlags } from "@monitor/contracts";

export interface MonitorConfig {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  webOrigin: string;
  cookieSecret: string;
  allowMockAuth: boolean;
  databaseMode: DatabaseMode;
  pgliteDataDir: string;
  databaseUrl?: string;
  redisUrl?: string;
  enableScenarioLab: boolean;
  features: FeatureFlags;
}

const booleanValue = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Expected true or false, received ${value}`);
};

export function loadConfig(overrides: Partial<MonitorConfig> = {}): MonitorConfig {
  const nodeEnv = (overrides.nodeEnv ?? process.env.MONITOR_NODE_ENV ?? "development") as MonitorConfig["nodeEnv"];
  if (!["development", "test", "production"].includes(nodeEnv)) throw new Error("Invalid MONITOR_NODE_ENV");
  const cookieSecret = overrides.cookieSecret ?? process.env.MONITOR_COOKIE_SECRET ?? "monitor-local-development-secret-change-me";
  if (nodeEnv === "production" && cookieSecret === "monitor-local-development-secret-change-me") {
    throw new Error("MONITOR_COOKIE_SECRET must be supplied in production");
  }

  const mode = (overrides.databaseMode ?? process.env.MONITOR_DATABASE_MODE ?? "pglite") as DatabaseMode;
  if (mode !== "pglite" && mode !== "postgres") throw new Error("Invalid MONITOR_DATABASE_MODE");
  const databaseUrl = overrides.databaseUrl ?? process.env.MONITOR_DATABASE_URL;
  const redisUrl = overrides.redisUrl ?? process.env.MONITOR_REDIS_URL;
  const allowMockAuth = overrides.allowMockAuth ?? booleanValue(process.env.MONITOR_ALLOW_MOCK_AUTH, nodeEnv !== "production");
  if (nodeEnv === "production" && allowMockAuth) throw new Error("Mock authentication cannot be enabled in production");
  const enableScenarioLab = overrides.enableScenarioLab ?? booleanValue(process.env.MONITOR_ENABLE_SCENARIO_LAB, nodeEnv === "development" || nodeEnv === "test");
  if (enableScenarioLab && !["development", "test"].includes(nodeEnv)) throw new Error("Scenario laboratory is local development and test only");
  const repositoryRoot = resolve(import.meta.dirname, "../../..");
  const configuredPgliteDir = process.env.MONITOR_PGLITE_DATA_DIR;

  return {
    nodeEnv,
    host: overrides.host ?? process.env.MONITOR_HOST ?? "127.0.0.1",
    port: overrides.port ?? Number(process.env.MONITOR_PORT ?? 3000),
    webOrigin: overrides.webOrigin ?? process.env.MONITOR_WEB_ORIGIN ?? "http://127.0.0.1:5173",
    cookieSecret,
    allowMockAuth,
    databaseMode: mode,
    pgliteDataDir: overrides.pgliteDataDir ?? (configuredPgliteDir ? resolve(repositoryRoot, configuredPgliteDir) : resolve(repositoryRoot, "local-data/monitor/pglite")),
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(redisUrl ? { redisUrl } : {}),
    enableScenarioLab,
    features: overrides.features ?? {
      dashboardShell: booleanValue(process.env.MONITOR_FEATURE_DASHBOARD_SHELL, true),
      chatShell: booleanValue(process.env.MONITOR_FEATURE_CHAT_SHELL, true),
      rosterShell: booleanValue(process.env.MONITOR_FEATURE_ROSTER_SHELL, false),
    },
  };
}
