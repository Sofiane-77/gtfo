import type { Log } from "../../domain/log";
import { Corners } from "./Corners";

interface RightPanelProps {
  logs: Log[];
  handlePlayerImport: (file: File) => void | Promise<Set<number>>;
  handlePlayerDropToTerminal?: (file: File) => void;
  selectedIds?: ReadonlySet<number>;
}

const GRID_COLUMNS = 12;

const buildCells = (logs: Log[], selectedIds: ReadonlySet<number>) => {
  const totalCells = Math.ceil(logs.length / GRID_COLUMNS) * GRID_COLUMNS;

  return Array.from({ length: totalCells }, (_, index) => {
    if (index < logs.length) {
      const log = logs[index];
      return {
        key: log.id,
        title: log.name,
        isSelected: selectedIds.has(log.id),
      };
    }

    return {
      key: `empty-${index}`,
      title: "",
      isSelected: false,
      style: "background-color: transparent;"
    };
  });
};

const computeCoverage = (logs: Log[], selectedIds: ReadonlySet<number>) => {
  const coverageMap = new Map<number, { total: number; selected: number }>();

  logs.forEach((log) => {
    const entry = coverageMap.get(log.rundown) ?? { total: 0, selected: 0 };
    entry.total += 1;
    if (selectedIds.has(log.id)) {
      entry.selected += 1;
    }
    coverageMap.set(log.rundown, entry);
  });

  return Array.from(coverageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([rundown, { total, selected }]) => ({
      rundown,
      total,
      selected,
      ratio: total === 0 ? 0 : selected / total,
    }));
};

const copyToClipboard = (e: MouseEvent) => {
  const codeEl = e.target as HTMLElement;
  navigator.clipboard.writeText(codeEl.innerText);
  codeEl.style.setProperty('--px', `${e.offsetX}px`);
  codeEl.style.setProperty('--py', `${e.offsetY}px`);
  codeEl.classList.add("after:opacity-100");

  setTimeout(() => codeEl.classList.remove("after:opacity-100"), 1000);
}


export function RightPanel({ logs, handlePlayerImport, handlePlayerDropToTerminal, selectedIds }: RightPanelProps) {
  const effectiveSelectedIds = selectedIds ?? new Set<number>();
  const cells = buildCells(logs, effectiveSelectedIds);
  const coverage = computeCoverage(logs, effectiveSelectedIds);
  const officialTotal = logs.length;
  const uniqueFound = effectiveSelectedIds.size;
  const uniquePctRaw = officialTotal === 0 ? 0 : (uniqueFound / officialTotal) * 100;
  const uniquePct = Math.min(100, Math.round(uniquePctRaw * 10) / 10);

  const parsePlayerLog = (e: Event) => {
    const target = e.target as HTMLInputElement | null;
    const file = target?.files?.item(0) ?? null;
    if (!file) return;
    if (handlePlayerDropToTerminal) {
      handlePlayerDropToTerminal(file);
      return;
    }
    handlePlayerImport(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const setDropActive = (target: HTMLElement, active: boolean) => {
    if (active) {
      target.classList.add("drop-active");
    } else {
      target.classList.remove("drop-active");
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    setDropActive(target, true);
  };

  const handleDragLeave = (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    if (related && target.contains(related)) {
      return;
    }
    setDropActive(target, false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    setDropActive(target, false);
    const file = e.dataTransfer?.files?.item(0);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".log")) return;
    if (handlePlayerDropToTerminal) {
      handlePlayerDropToTerminal(file);
      return;
    }
    handlePlayerImport(file);
  };

  return (
    <div className="space-y-4">
      <div className="crt-border rounded-2xl p-4 sm:p-6 bg-black/60 relative">
        <Corners />
        <h3 className="flex items-center pt-1.25 pl-1.5 mb-3 h-[35px] text-xs font-[Oxanium] font-bold tracking-wider opacity-90 text-cyan-200 bg-(--bg-terminal-full)">
          INFORMATIONS
        </h3>
        <div className="text-xs mb-2 text-[#f10000]">
          Your data stays on your device. Everything runs locally in your browser (nothing is sent to any server).
        </div>
        <div className="text-xs mb-2 text-cyan-100/90">
          Open your <code className="text-amber-300/90 bg-cyan-500/10">Player.log</code>. On Windows, you&apos;ll find it at <code onclick={copyToClipboard} className="relative cursor-pointer text-white/95 bg-cyan-500/25 after:content-['COPIED'] after:absolute after:left-(--px) after:top-(--py) after:translate-x-2 after:-translate-y-3 after:transform after:text-emerald-300 after:bg-black/80 after:border after:border-emerald-400/50 after:rounded after:px-2 after:py-0.5 after:shadow after:pointer-events-none after:opacity-0 after:transition-opacity" title="Copy to Clipboard">%USERPROFILE%\AppData\LocalLow\10 Chambers Collective\GTFO</code>.
        </div>
        <div className="text-xs mb-2 text-cyan-100 ">
          <label
            for="player_file"
            className="drop-target inline-block uppercase py-3.5 px-2 font-['Fira Mono'] font-bold cursor-pointer bg-cyan-500/10 border border-cyan-300/30 rounded "
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            Import Player.log
          </label>
          <input className="hidden" type="file" id="player_file" accept=".log" onChange={parsePlayerLog} />
        </div>
      </div>
      <div className="crt-border rounded-2xl p-4 sm:p-6 bg-black/60 relative">
        <Corners />
        <h3 className="flex items-center pt-1.25 pl-1.5 mb-3 h-[35px] text-xs font-[Oxanium] font-bold tracking-wider opacity-90 text-cyan-200 bg-(--bg-terminal-full)">
          DECODING / PROGRESSION
        </h3>
        <div className="text-[10px] mb-2 text-cyan-200/70">

        </div>
        <div
          className="grid gap-0.5"
          style={{ "grid-template-columns": `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
        >
          {cells.map((cell) => (
            <div
              key={cell.key}
              title={cell.title}
              style={cell.style}
              className={`h-4 rounded-sm ${cell.isSelected ? "bg-green-400/70" : "bg-green-400/10"}`}
            />
          ))}
        </div>
        <div className="mt-3 h-1.5 bg-green-400/10 rounded overflow-hidden">
          <div className="h-full bg-green-400/70" style={{ width: `${uniquePct}%` }} />
        </div>
        <div className="mt-2 text-xs text-green-300/80">
          LOGS FOUND: {uniqueFound} / {officialTotal} - {uniquePct}%
        </div>
      </div>

      <div className="crt-border rounded-2xl p-4 bg-black/60 relative">
        <Corners />
        <h3 className="flex items-center pt-1.25 pl-1.5 mb-3 h-[35px] text-xs font-[Oxanium] font-bold tracking-wider opacity-90 text-cyan-200 bg-(--bg-terminal-full)">
          COVERAGE / RUNDOWNS
        </h3>
        <div className="flex items-end items-start gap-1">
          {coverage.map(({ rundown, ratio, selected, total }) => (
            <div key={rundown} className="flex-1" title={`R${rundown} : ${selected}/${total}`}>
              <div className="relative h-24 bg-green-400/10 rounded-sm overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-green-400/70"
                  style={{ height: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-center text-[10px] text-cyan-200">R{rundown}</div>
              <div className="text-center text-[10px] text-green-300/70">
                {selected}/{total} ({Math.round(ratio * 100)}%)
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-green-300/70">

        </div>
      </div>
    </div>
  );
}
