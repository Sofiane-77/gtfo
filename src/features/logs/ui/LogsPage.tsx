import { Component, createRef } from "inferno";
import { Helmet } from 'inferno-helmet';
import { RightPanel } from "./components/RightPanel";
import { Terminal } from "./components/Terminal";
import { LogsTable } from "./components/LogsTable";
import type { LogFilters } from "../domain/filters";
import type { Log } from "../domain/log";
import { LOGS } from "../services/logData";
import { getIdsFromLocalStorage, STORAGE_KEY } from "../services/storage";
import getIdsFromPlayerLog from "../services/getIdsFromPlayerLog";
import { withBase } from "src/shared/base";

interface LogsPageState {
  filters: LogFilters;
  checked: Set<number>;
}

export default class LogsPage extends Component<unknown, LogsPageState> {
  private readonly logs: Log[] = LOGS;
  private readonly terminalRef = createRef<Terminal>();
  private readonly handleWindowDragOver = (e: DragEvent) => {
    e.preventDefault();
  };
  private readonly handleWindowDrop = (e: DragEvent) => {
    e.preventDefault();
  };
  private readonly handleWindowKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    this.exitTerminal();
  };

  state: LogsPageState = {
    filters: {
      search: "",
      rundown: "",
      level: "",
      sector: "",
      media: "",
    },
    checked: getIdsFromLocalStorage(),
  };

  componentDidMount() {
    window.addEventListener("dragover", this.handleWindowDragOver);
    window.addEventListener("drop", this.handleWindowDrop);
    window.addEventListener("keydown", this.handleWindowKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener("dragover", this.handleWindowDragOver);
    window.removeEventListener("drop", this.handleWindowDrop);
    window.removeEventListener("keydown", this.handleWindowKeyDown);
  }

  private handleFiltersChange = (next: Partial<LogFilters>) => {
    this.setState((prev) => ({
      filters: { ...prev.filters, ...next },
    }));
  };

  private handleToggleChecked = (log: Log) => {
    this.setState((prev) => {
      const next = new Set(prev.checked);
      if (next.has(log.id)) {
        next.delete(log.id);
      } else {
        next.add(log.id);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return { checked: next };
    });
  };

  private handleProgressionReset = () => {
    this.setState(prev => ({ ...prev, checked: new Set<number>() }));
    localStorage.removeItem(STORAGE_KEY);
  };

  private handlePlayerLogImport = async (file: File) => {
    const ids = await getIdsFromPlayerLog(file, true);
    this.setState(prev => ({ ...prev, checked: ids }));
    return ids;
  }

  private handlePlayerLogDropToTerminal = (file: File) => {
    if (this.terminalRef.current) {
      this.terminalRef.current.handleSubmitWithFile("scan", file);
      return;
    }
    this.handlePlayerLogImport(file);
  };

  private isChecked = (log: Log) => this.state.checked.has(log.id);

  private exitTerminal = () => {
    window.location.assign(withBase("/"));
  };

  render() {
    const { filters, checked } = this.state;

    return (
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 px-4 sm:px-11 pb-24">
        <Helmet>
            <title>GTFO Progress — Log Tracker</title>
            <meta
                name="description"
                content="Track your GTFO log progression and read all logs in one place. Mark collected logs, monitor completion and keep your progress organized."
            />
            <meta name="keywords" content="gtfo progress, gtfo log tracker, gtfo logs, gtfo log progression, gtfo player.log parser, gtfo log viewer, gtfo read all logs, achievement_readalllogs, D-Lock Block Decipherer, D-Lock Block Decipherer achievement, gtfo tools, track gtfo logs, gtfo log checklist" />
            <link rel="canonical" href="https://sofiane-77.github.io/gtfo/logs/" />
            <meta property="og:url" content="https://sofiane-77.github.io/gtfo/logs/" />
            <meta
                property="og:title"
                content="GTFO Progress — Log Tracker"
            />
            <meta
                property="og:description"
                content="Track your GTFO log progression and read all logs in one place. Mark collected logs, monitor completion and keep your progress organized."
            />
            <meta
                property="og:image"
                content="https://sofiane-77.github.io/gtfo/images/og/logs.jpg"
            />

            <meta
                name="twitter:title"
                content="GTFO Progress — Log Tracker"
            />
            <meta
                name="twitter:description"
                content="Track your GTFO log progression and read all logs in one place. Mark collected logs, monitor completion and keep your progress organized."
            />
            <meta property="twitter:url" content="https://sofiane-77.github.io/gtfo/logs/" />
            <meta
                name="twitter:image"
                content="https://sofiane-77.github.io/gtfo/images/og/logs.jpg"
            />
        </Helmet>
        <div className="xl:col-span-4 space-y-4">
          <Terminal
            ref={this.terminalRef}
            onProgressionReset={this.handleProgressionReset}
            onPlayerLogImport={this.handlePlayerLogImport}
            onExitTerminal={this.exitTerminal}
          />
          <LogsTable
            logs={this.logs}
            filters={filters}
            onFiltersChange={this.handleFiltersChange}
            isChecked={this.isChecked}
            onToggleChecked={this.handleToggleChecked}
          />
        </div>
        <aside className="xl:col-span-1 space-y-4">
          <RightPanel
            logs={this.logs}
            handlePlayerImport={this.handlePlayerLogImport}
            handlePlayerDropToTerminal={this.handlePlayerLogDropToTerminal}
            selectedIds={checked}
          />
        </aside>
      </div>
    );
  }
}
