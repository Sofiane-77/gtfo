import type { Log } from "../../domain/log";
import type { LogFilters } from "../../domain/filters";
import { filterLogs, getLogFilterOptions } from "../../domain/filters";
import { Corners } from "./Corners";

interface LogsTableProps {
  logs: Log[];
  filters: LogFilters;
  onFiltersChange: (next: Partial<LogFilters>) => void;
  onSelect?: (log: Log) => void;
  isChecked?: (log: Log) => boolean;
  onToggleChecked?: (log: Log) => void;
}

export function LogsTable({
  logs,
  filters,
  onFiltersChange,
  onSelect,
  isChecked,
  onToggleChecked,
}: LogsTableProps) {
  const { search, rundown, level, sector, media } = filters;
  const filteredLogs = filterLogs(logs, filters);
  const { rundownOptions, levelOptions, sectorOptions, mediaOptions } = getLogFilterOptions(logs);

  return (
    <div className="crt-border rounded-2xl p-4 sm:p-6 bg-black/60 relative">
      <Corners />
      <div className="mb-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
        <input
          className="bg-black/50 border border-green-400/40 rounded px-2 py-2"
          placeholder="Search (name, rundown, level, zone, media...)"
          value={search}
          onInput={(event) =>
            onFiltersChange({ search: (event.target as HTMLInputElement).value })
          }
        />
        <select
          className="bg-black/50 border border-green-400/40 rounded px-2 py-2"
          value={rundown}
          onChange={(event) => onFiltersChange({ rundown: event.target.value })}
        >
          <option value="">Rundown (all)</option>
          {rundownOptions.map((option) => (
            <option key={option} value={option}>
              R{option}
            </option>
          ))}
        </select>
        <select
          className="bg-black/50 border border-green-400/40 rounded px-2 py-2"
          value={level}
          onChange={(event) => onFiltersChange({ level: event.target.value })}
        >
          <option value="">Level (all)</option>
          {levelOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="bg-black/50 border border-green-400/40 rounded px-2 py-2"
          value={sector}
          onChange={(event) => onFiltersChange({ sector: event.target.value })}
        >
          <option value="">Sector (all)</option>
          {sectorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="bg-black/50 border border-green-400/40 rounded px-2 py-2"
          value={media}
          onChange={(event) => onFiltersChange({ media: event.target.value })}
        >
          <option value="">Media (all)</option>
          {mediaOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto max-h-[60svh] min-h-[470px]">
        <table className="w-full text-xs">
          <thead className="text-green-300/80">
            <tr className="border-b border-green-400/20">
              <th className="text-left py-2 pr-2 w-[36px]">✔</th>
              <th className="text-left py-2 pr-2">Name</th>
              <th className="text-left py-2 pr-2">Rundown</th>
              <th className="text-left py-2 pr-2">Level</th>
              <th className="text-left py-2 pr-2">Zone</th>
              <th className="text-left py-2 pr-2">Sector</th>
              <th className="text-left py-2 pr-2">Media</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-green-400/10 hover:bg-green-400/5"
                onClick={() => onSelect?.(log)}
              >
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={isChecked?.(log) ?? false}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      event.stopPropagation();
                      onToggleChecked?.(log);
                    }}
                  />
                </td>
                <td className="py-2 pr-2 whitespace-nowrap">{log.name}</td>
                <td className="py-2 pr-2">R{log.rundown}</td>
                <td className="py-2 pr-2">{log.level.join(", ")}</td>
                <td className="py-2 pr-2">{log.zone ?? "-"}</td>
                <td className="py-2 pr-2">{log.sector ?? "-"}</td>
                <td className="py-2 pr-2">{log.media}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-green-300/60 text-center">
                  No log matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
