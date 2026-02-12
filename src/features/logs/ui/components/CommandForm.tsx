/** diff: micro-optimisations */
import { Component, createRef } from "inferno";

interface CommandFormState {
  value: string;
  focused: boolean;
  caretPos: number;
  hasSelection: boolean;
  historyCursor: number | null;
  historyDraft: string | null;
}

const localStyles = `
.caret-hidden{ caret-color: transparent; }
.caret-underscore{
  position:absolute; pointer-events:none;
  animation:blink 1s steps(1,end) infinite;
}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
`;

export interface CommandFormProps {
  onSubmit?: (cmd: string) => void;
  placeholder?: string;
  inputClass?: string;
  buttonClass?: string;
  autoFocus?: boolean;
  execLabel?: string;
  /** Prompt affiché avant l'input (ex: "\\Root>") */
  prompt?: string;
  /** Valeur initiale */
  defaultValue?: string;
  history?: readonly string[];
  commandVocabulary?: readonly string[];
}


export default class CommandForm extends Component<CommandFormProps, CommandFormState> {
  private wrapRef = createRef<HTMLDivElement>();
  private inputRef = createRef<HTMLInputElement>();
  private mirrorRef = createRef<HTMLSpanElement>();
  private caretRef = createRef<HTMLSpanElement>();

  // cache métriques “statiques” (maj si resize)
  private metrics = { padL: 0, borL: 0 };
  private ro?: ResizeObserver;
  private composing = false; // IME

  state: CommandFormState = {
    value: this.props.defaultValue ?? "",
    focused: !!this.props.autoFocus,
    caretPos: 0,
    hasSelection: false,
    historyCursor: null,
    historyDraft: null,
  };

  componentDidMount(): void {
    this.readStaticMetrics();
    // recalc metrics on resize
    if ("ResizeObserver" in window) {
      this.ro = new ResizeObserver(() => this.readStaticMetrics());
      if (this.inputRef.current) this.ro.observe(this.inputRef.current);
    }
    // fonts may load late
    document.fonts?.ready?.then?.(() => this.measureCaretLeft());
    if (this.props.autoFocus && this.inputRef.current) {
      this.inputRef.current.focus();
      this.updateCaret();
    }
  }
  componentWillUnmount(): void {
    this.ro?.disconnect();
  }
  componentDidUpdate(prevProps: CommandFormProps): void {
    if ((prevProps.history?.length ?? 0) !== (this.props.history?.length ?? 0)) {
      this.resetHistoryNavigation();
    }
  }

  private readStaticMetrics() {
    const el = this.inputRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    this.metrics.padL = parseFloat(cs.paddingLeft) || 0;
    this.metrics.borL = parseFloat(cs.borderLeftWidth) || 0;
    this.measureCaretLeft(); // re-align after metric change
  }

  private resetHistoryNavigation() {
    if (this.state.historyCursor !== null || this.state.historyDraft !== null) {
      this.setState({ historyCursor: null, historyDraft: null });
    }
  }

  private handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const value = target?.value ?? "";
    this.setState({ value, historyCursor: null, historyDraft: null }, this.updateCaret);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.composing) return;
    if (event.key === "Tab") {
      const handled = this.tryAutocomplete();
      if (handled) {
        event.preventDefault();
        return;
      }
    } else if (event.key === "ArrowUp") {
      const handled = this.navigateHistory("prev");
      if (handled) {
        event.preventDefault();
        return;
      }
    } else if (event.key === "ArrowDown") {
      const handled = this.navigateHistory("next");
      if (handled) {
        event.preventDefault();
        return;
      }
    }
    requestAnimationFrame(this.updateCaret);
  };

  private handleSubmit = (event: Event) => {
    event.preventDefault();
    const cmd = this.state.value.trim();
    if (!cmd) return;
    this.props.onSubmit?.(cmd);
    this.setState({ value: "", caretPos: 0, hasSelection: false, historyCursor: null, historyDraft: null }, () => {
      const el = this.inputRef.current;
      if (el) {
        el.value = "";
        el.selectionStart = el.selectionEnd = 0;
        this.measureCaretLeft();
      }
    });
  };

  private navigateHistory(direction: "prev" | "next"): boolean {
    const history = this.props.history ?? [];
    if (!history.length) return false;

    const { historyCursor, historyDraft, value } = this.state;

    if (direction === "prev") {
      const nextCursor = historyCursor === null ? history.length - 1 : Math.max(0, historyCursor - 1);
      const nextValue = history[nextCursor] ?? "";
      const draft = historyCursor === null ? value : historyDraft;
      this.applyHistoryNavigation(nextValue, nextCursor, draft ?? null);
      return true;
    }

    if (historyCursor === null) {
      return false;
    }

    if (historyCursor >= history.length - 1) {
      const restoredValue = historyDraft ?? "";
      this.applyHistoryNavigation(restoredValue, null, null);
      return true;
    }

    const nextCursor = Math.min(history.length - 1, historyCursor + 1);
    const nextValue = history[nextCursor] ?? "";
    this.applyHistoryNavigation(nextValue, nextCursor, historyDraft);
    return true;
  }

  private applyHistoryNavigation(value: string, cursor: number | null, draft: string | null) {
    const el = this.inputRef.current;
    if (el) {
      const pos = value.length;
      el.value = value;
      el.selectionStart = el.selectionEnd = pos;
    }
    this.setState(
      {
        value,
        caretPos: value.length,
        hasSelection: false,
        historyCursor: cursor,
        historyDraft: draft,
      },
      this.measureCaretLeft,
    );
  }

  private tryAutocomplete(): boolean {
    const vocabulary = this.props.commandVocabulary ?? [];
    if (!vocabulary.length) return false;

    const el = this.inputRef.current;
    if (!el) return false;

    const selStart = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? selStart;
    if (selStart !== selEnd) return false;

    const beforeCaret = this.state.value.slice(0, selStart);
    if (!beforeCaret || beforeCaret.includes(" ")) {
      return false;
    }

    const afterCaret = this.state.value.slice(selStart);
    const normalizedFragment = beforeCaret.toLowerCase();

    const matches = vocabulary.filter((keyword) =>
      keyword.toLowerCase().startsWith(normalizedFragment),
    );
    if (!matches.length) return false;

    const uppercaseMatches = matches.map((keyword) => keyword.toUpperCase());
    const fragmentUpper = beforeCaret.toUpperCase();
    const commonPrefix = this.longestCommonPrefix(uppercaseMatches);

    let nextToken = uppercaseMatches[0];
    if (commonPrefix && commonPrefix.length > fragmentUpper.length) {
      nextToken = commonPrefix;
    } else if (uppercaseMatches.length === 1) {
      nextToken = uppercaseMatches[0];
    } else if (fragmentUpper === uppercaseMatches[0]) {
      return false;
    }

    const updatedValue = `${nextToken}${afterCaret}`;
    const caretPosition = nextToken.length;

    el.value = updatedValue;
    el.selectionStart = el.selectionEnd = caretPosition;

    this.setState(
      {
        value: updatedValue,
        caretPos: caretPosition,
        hasSelection: false,
        historyCursor: null,
        historyDraft: null,
      },
      this.measureCaretLeft,
    );

    return true;
  }

  private longestCommonPrefix(values: readonly string[]): string {
    if (!values.length) return "";
    let prefix = values[0];
    for (let i = 1; i < values.length; i += 1) {
      const value = values[i];
      let index = 0;
      const limit = Math.min(prefix.length, value.length);
      while (index < limit && prefix[index] === value[index]) {
        index += 1;
      }
      prefix = prefix.slice(0, index);
      if (!prefix) break;
    }
    return prefix;
  }

  private handleCaretUpdate = () => {
    if (this.composing) return;
    requestAnimationFrame(this.updateCaret);
  };

  private handleFocus = () => this.setState({ focused: true }, this.updateCaret);
  private handleBlur = () => this.setState({ focused: false });

  // IME / composition
  private handleCompositionStart = () => { this.composing = true; };
  private handleCompositionEnd = () => { this.composing = false; this.handleCaretUpdate(); };

  private updateCaret = () => {
    const el = this.inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const hasSel = (el.selectionEnd ?? pos) !== pos;
    if (this.state.caretPos !== pos || this.state.hasSelection !== hasSel) {
      this.setState({ caretPos: pos, hasSelection: hasSel }, this.measureCaretLeft);
    } else {
      this.measureCaretLeft();
    }
  };

  /** calcule X du caret via miroir */
  private prevBefore = ""; // évite set text identique
  private measureCaretLeft = () => {
    const el = this.inputRef.current;
    const mirror = this.mirrorRef.current;
    const caret = this.caretRef.current;
    if (!el || !mirror || !caret) return;

    const before = this.state.value.slice(0, this.state.caretPos).replace(/ /g, "\u00A0");
    if (before !== this.prevBefore) { // limite reflow
      this.prevBefore = before;
      mirror.textContent = before;
    }

    const left = this.metrics.padL + this.metrics.borL + mirror.offsetWidth - (el.scrollLeft || 0);
    caret.style.left = `${left}px`;
  };

  render() {
    const {
      placeholder = "Enter COMMAND…",
      inputClass = "flex-1 bg-black/50 border border-green-400/40 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400/60 placeholder-green-300/30 uppercase",
      buttonClass = "px-3 py-2 border border-green-400/40 rounded-lg hover:bg-green-400/10 active:scale-[.98] hidden sm:block",
      autoFocus = true,
      execLabel = "EXEC",
      prompt = "\\\\Root>",
    } = this.props;

    const { value, focused, hasSelection } = this.state;

    return (
      <form className="mt-4" onSubmit={this.handleSubmit}>
        <style dangerouslySetInnerHTML={{ __html: localStyles }} />
        <div className="flex items-center gap-2">
          <div className="text-green-400/90">{prompt}</div>

          <div ref={this.wrapRef} className="relative flex-1">
            <span
              ref={this.mirrorRef}
              className="invisible absolute top-0 left-0 whitespace-pre"
              aria-hidden="true"
            />
            <input
              ref={this.inputRef}
              aria-label="Champ de commande"
              className={`${inputClass} caret-hidden w-full`}
              placeholder={placeholder}
              autoFocus={autoFocus}
              value={value}
              onInput={this.handleInput}
              onKeyDown={this.handleKeyDown}
              onKeyUp={this.handleCaretUpdate}
              onSelect={this.handleCaretUpdate}
              onClick={this.handleCaretUpdate}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              onCompositionStart={this.handleCompositionStart}
              onCompositionEnd={this.handleCompositionEnd}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {/* underscore caret : caché si blur ou sélection active */}
            {focused && !hasSelection && (
              <span
                ref={this.caretRef}
                data-caret
                className="caret-underscore text-green-300/90"
                style={{ top: "50%", transform: "translateY(calc(-50% + 0.15em))" }}
                aria-hidden="true"
              >
                _
              </span>
            )}
          </div>

          <button type="submit" className={buttonClass}>
            {execLabel}
          </button>
        </div>
      </form>
    );
  }
}
