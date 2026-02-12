import { Component, createRef } from "inferno";
import { Corners } from "../Corners";
import CommandForm from "../CommandForm";
import runCommand, { getTerminalInfoLines, listCommandKeywords } from "./command";
import { TerminalAudioPlayer } from "./components/AudioPlayer";

type TerminalLine = string | { __html: string } | { audioSrc: string; label?: string };

interface TerminalProps {
  onProgressionReset?: () => void;
  onPlayerLogImport?: (file: File) => Promise<Set<number>> | Set<number>;
  onExitTerminal?: () => void;
}

interface TerminalState {
  lines: TerminalLine[];
  history: string[];
}

export class Terminal extends Component<TerminalProps, TerminalState> {

  private logWrapRef = createRef<HTMLDivElement>();
  private readonly commandVocabulary = listCommandKeywords();

  constructor(props: TerminalProps) {
    super(props);
    this.state = {
      lines: getTerminalInfoLines(),
      history: [],
    };
  }

  componentDidUpdate(_prevProps: Record<string, never>, prevState: TerminalState) {
    if (prevState.lines !== this.state?.lines) this.scrollToBottom();
  }

  private appendLines = (extra: TerminalLine[]) => {
    if (!extra?.length) return;
    this.setState((prev) => ({
      lines: [...prev.lines, ...extra],
    }));
  };

  private handleSubmit = async (cmd: string) => {
    const normalized = cmd.trim();
    if (!normalized) return;
    const result = await runCommand(normalized, {
      onProgressionReset: this.props.onProgressionReset,
      appendLines: this.appendLines,
      onPlayerLogImport: this.props.onPlayerLogImport,
      onExitTerminal: this.props.onExitTerminal,
    });
    this.setState((prev) => ({
      history: [...prev.history, normalized],
      lines: result.clear ? [...result.lines] : [...prev.lines, ...result.lines],
    }));
  };

  public handleSubmitWithFile = async (cmd: string, file: File) => {
    const normalized = cmd.trim();
    if (!normalized) return;
    const result = await runCommand(normalized, {
      onProgressionReset: this.props.onProgressionReset,
      appendLines: this.appendLines,
      playerLogFile: file,
      onPlayerLogImport: this.props.onPlayerLogImport,
      onExitTerminal: this.props.onExitTerminal,
    });
    this.setState((prev) => ({
      history: [...prev.history, normalized],
      lines: result.clear ? [...result.lines] : [...prev.lines, ...result.lines],
    }));
  };

  private scrollToBottom() {
    const el = this.logWrapRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    // or el.scrollTop = el.scrollHeight; if you prefer to avoid smooth scrolling
  }

  private handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  private setDropActive(target: HTMLElement, active: boolean) {
    if (active) {
      target.classList.add("drop-active");
    } else {
      target.classList.remove("drop-active");
    }
  }

  private handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    this.setDropActive(target, true);
  };

  private handleDragLeave = (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as Node | null;
    if (related && target.contains(related)) {
      return;
    }
    this.setDropActive(target, false);
  };

  private handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    this.setDropActive(target, false);
    const file = e.dataTransfer?.files?.item(0);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".log")) return;
    this.handleSubmitWithFile("scan", file);
  };

  render() {
    return (
      <div
        className="drop-target py-[40px] px-[20px] bg-black/60 relative"
        onDragOver={this.handleDragOver}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDrop={this.handleDrop}
      >
        <Corners />
        <div ref={this.logWrapRef} className="text-xs sm:text-sm h-[40vh] md:h-[42vh] overflow-y-auto pr-1" aria-live="polite">
          {(this.state?.lines ?? []).map((line, i) =>
            typeof line === "string" ?
            ( <pre key={i} className="whitespace-pre-wrap leading-relaxed select-text font-[inherit]">{line}</pre> ) :
            ("audioSrc" in line) ?
            ( <div key={i} className="my-2">
                <TerminalAudioPlayer src={line.audioSrc} label={line.label} />
              </div> ) :
            ( <pre key={i} className="whitespace-pre-wrap leading-relaxed select-text font-[inherit]"
              dangerouslySetInnerHTML={{ __html: line.__html }} /> )
          )}
        </div>

        <CommandForm
          onSubmit={this.handleSubmit}
          autoFocus
          history={this.state?.history}
          commandVocabulary={this.commandVocabulary}
        />
      </div>
    );
  }
}
