import type { Log } from "./log";

export type LogFilters = {
  search: string;
  rundown: string;
  level: string;
  sector: string;
  media: string;
};

type LogFilterOptions = {
  rundownOptions: string[];
  levelOptions: string[];
  sectorOptions: string[];
  mediaOptions: string[];
};

const toLower = (value: string) => value.toLowerCase();
const uniqueSorted = (values: string[]) => Array.from(new Set(values)).sort();

function buildSearchSegmentsForTable(log: Log): string[] {
  return [
    log.name,
    String(log.rundown),
    ...log.level,
    log.zone ?? "",
    log.sector ?? "",
    log.media,
  ]
    .filter(Boolean)
    .map((value) => toLower(String(value)));
}

export function filterLogs(logs: readonly Log[], filters: LogFilters): Log[] {
  const { search, rundown, level, sector, media } = filters;
  const normalizedSearch = toLower(search);

  return logs.filter((log) => {
    const searchableSegments = buildSearchSegmentsForTable(log);

    if (search && !searchableSegments.some((value) => value.includes(normalizedSearch))) {
      return false;
    }
    if (rundown && String(log.rundown) !== rundown) {
      return false;
    }
    if (level && !log.level.includes(level)) {
      return false;
    }
    if (sector && (log.sector ?? "") !== sector) {
      return false;
    }
    if (media && log.media !== media) {
      return false;
    }
    return true;
  });
}

export function getLogFilterOptions(logs: readonly Log[]): LogFilterOptions {
  return {
    rundownOptions: uniqueSorted(logs.map((log) => String(log.rundown))),
    levelOptions: uniqueSorted(logs.flatMap((log) => log.level)),
    sectorOptions: uniqueSorted(logs.map((log) => log.sector ?? "").filter(Boolean)),
    mediaOptions: uniqueSorted(logs.map((log) => log.media)),
  };
}
