import type { Log } from "../domain/log";
import logsRaw from "./logs.json";

type RawLog = Omit<Log, "level"> & {
  level: string | string[];
};

export const LOGS: Log[] = (logsRaw as RawLog[]).map((raw) => ({
  ...raw,
  level: Array.isArray(raw.level) ? raw.level : [raw.level],
}));
