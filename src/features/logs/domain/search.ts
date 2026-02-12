import type { Log } from "./log";

export interface SearchOptions {
  rundown?: number;
  level?: string;
  sector?: string;
  media?: string;
}

export interface ParsedSearchArgs {
  terms: string[];
  options: SearchOptions;
  warnings: string[];
}

const SEARCH_FLAG_ALIASES: Record<string, keyof SearchOptions> = {
  rundown: "rundown",
  r: "rundown",
  level: "level",
  l: "level",
  sector: "sector",
  s: "sector",
  media: "media",
  m: "media",
};

export function parseSearchArgs(args: string[]): ParsedSearchArgs {
  const terms: string[] = [];
  const options: SearchOptions = {};
  const warnings: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const isLongFlag = token.startsWith("--");
    const isShortFlag = !isLongFlag && token.startsWith("-") && token.length > 1;

    if (!isLongFlag && !isShortFlag) {
      terms.push(token);
      continue;
    }

    const stripped = token.slice(isLongFlag ? 2 : 1);
    if (!stripped) {
      warnings.push(`Ignoring empty flag "${isLongFlag ? "--" : "-"}".`);
      continue;
    }

    let flag = stripped;
    let explicitValue: string | undefined;

    const equalsIndex = stripped.indexOf("=");
    if (equalsIndex >= 0) {
      flag = stripped.slice(0, equalsIndex);
      explicitValue = stripped.slice(equalsIndex + 1);
    }

    const flagPrefix = isLongFlag ? "--" : "-";
    const displayFlag = `${flagPrefix}${flag}`;

    if (!flag) {
      warnings.push(`Ignoring empty flag "${displayFlag}".`);
      continue;
    }

    const normalizedFlag = flag.toLowerCase();
    const canonicalFlag = SEARCH_FLAG_ALIASES[normalizedFlag];
    if (!canonicalFlag) {
      warnings.push(`Unknown flag "${displayFlag}", ignoring.`);
      continue;
    }

    let value = explicitValue;

    if (value === undefined) {
      const peek = args[index + 1];
      if (peek && !peek.startsWith("-")) {
        value = peek;
        index += 1;
      }
    }

    if (value === undefined) {
      warnings.push(`Missing value for ${displayFlag}, flag ignored.`);
      continue;
    }

    const trimmedValue = value.trim();
    if (!trimmedValue.length) {
      warnings.push(`Missing value for ${displayFlag}, flag ignored.`);
      continue;
    }

    switch (canonicalFlag) {
      case "rundown": {
        const parsed = Number.parseInt(trimmedValue, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          warnings.push(`Invalid rundown "${trimmedValue}", ignoring filter.`);
        } else {
          options.rundown = parsed;
        }
        break;
      }
      case "level":
        options.level = trimmedValue.toUpperCase();
        break;
      case "sector":
        options.sector = trimmedValue.toLowerCase();
        break;
      case "media":
        options.media = trimmedValue.toLowerCase();
        break;
    }
  }

  return { terms, options, warnings };
}

export function matchesLog(log: Log, terms: readonly string[], options: SearchOptions): boolean {
  if (options.rundown !== undefined && log.rundown !== options.rundown) {
    return false;
  }
  if (options.level && !log.level.some((entry) => entry.toLowerCase() === options.level!.toLowerCase())) {
    return false;
  }
  if (options.sector) {
    const sector = (log.sector ?? "").toLowerCase();
    if (sector !== options.sector) {
      return false;
    }
  }
  if (options.media) {
    const media = log.media.toLowerCase();
    if (!media.includes(options.media)) {
      return false;
    }
  }

  const haystack = [
    log.name,
    String(log.id),
    `r${log.rundown}`,
    String(log.rundown),
    ...log.level,
    log.zone ?? "",
    log.sector ?? "",
    log.media,
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return terms.every((term) => haystack.some((entry) => entry.includes(term)));
}

export function describeFilters(options: SearchOptions): string {
  const filters: string[] = [];
  if (options.rundown !== undefined) {
    filters.push(`rundown R${options.rundown}`);
  }
  if (options.level) {
    filters.push(`level ${options.level}`);
  }
  if (options.sector) {
    filters.push(`sector ${options.sector}`);
  }
  if (options.media) {
    filters.push(`media ${options.media}`);
  }

  if (!filters.length) {
    return "";
  }
  return ` with filters (${filters.join(", ")})`;
}

export function findLogByQuery(logs: readonly Log[], query: string): Log | undefined {
  const normalized = query.toLowerCase();
  return logs.find((log) => {
    if (String(log.id) === query) return true;
    if (log.name.toLowerCase() === normalized) return true;
    return false;
  });
}
