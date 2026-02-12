import createPasswordGenerator from "src/shared/lib/password-generator";
import CircuitBackground from "./components/CircuitBackground";
import { Component } from "inferno";
import { addDaysUTC, fmtUTCDate, isoWeekWindowUTC, parseAsUTCDate } from "src/shared/lib/date";
import { Helmet } from 'inferno-helmet';

type State = {
  date: string;
  status: Status;
};

type Props = Record<string, never>;

enum Status {
  IDLE = "STANDBY",
  RESET = "SYSTEM RESET",
  SYNC = "ROTATION SYNCED"
}

function todayUTC_YYYY_MM_DD() {
  return new Date().toISOString().slice(0, 10);
}

export default class R8A2 extends Component<Props, State> {

  private gen = createPasswordGenerator();
  
  private version = this.randomFooterVersion();

  private resetStatusTimer: number | null = null;

  private lastWeekStartKey: string;

  private passwordEl: HTMLInputElement | null = null;

  private pendingSelectAll = false;

  constructor(props: Props) {
    super(props);

    const today = todayUTC_YYYY_MM_DD();

    this.lastWeekStartKey = this.getWeekStartKeyFromDateString(today);

    this.state = {
      date: today,
      status: Status.IDLE
    };
  }

  // ----- Lifecycle -----
  componentDidMount() {
    this.attachPasswordSelectAll();
  }

  componentWillUnmount() {
    this.detachPasswordSelectAll();
    this.clearResetTimer();
  }

  // PasswordEL Handlers
  private onPwdMouseDown = () => {
    if (!this.passwordEl) return;
    this.pendingSelectAll = document.activeElement !== this.passwordEl;
  };

  private onPwdMouseUp = () => {
    const el = this.passwordEl;
    if (!el) return;

    if (!this.pendingSelectAll) return;
    this.pendingSelectAll = false;

    if (el.selectionStart === el.selectionEnd) el.select();
  };

  private onPwdDblClick = (e: MouseEvent) => {
    e.preventDefault();
    this.passwordEl?.select();
  };

  private attachPasswordSelectAll() {
    // robust: query once after mount
    this.passwordEl = document.querySelector("#password") as HTMLInputElement | null;
    if (!this.passwordEl) return;

    this.passwordEl.addEventListener("mousedown", this.onPwdMouseDown);
    this.passwordEl.addEventListener("mouseup", this.onPwdMouseUp);
    this.passwordEl.addEventListener("dblclick", this.onPwdDblClick);
  }

  private detachPasswordSelectAll() {
    if (!this.passwordEl) return;

    this.passwordEl.removeEventListener("mousedown", this.onPwdMouseDown);
    this.passwordEl.removeEventListener("mouseup", this.onPwdMouseUp);
    this.passwordEl.removeEventListener("dblclick", this.onPwdDblClick);

    this.passwordEl = null;
  }

  private clearResetTimer() {
    if (this.resetStatusTimer !== null) {
      window.clearTimeout(this.resetStatusTimer);
      this.resetStatusTimer = null;
    }
  }

  private randomFooterVersion(prefix = "v") {
    // 5% de chance d'être exactement 1.0.0
    const hitOne = Math.random() < 0.05;
  
    if (hitOne) {
      return `${prefix}1.0.0`;
    }
  
    const major = 0;
    const minor = Math.floor(Math.random() * 10); // 0–9
    const patch = Math.floor(Math.random() * 10); // 0–9
  
    return `${prefix}${major}.${minor}.${patch}`;
  }

  private getWeekStartKeyFromDateString(dateStr: string) {
    const utcDate = parseAsUTCDate(dateStr);
    const { start } = isoWeekWindowUTC(utcDate);
    return fmtUTCDate(start);
  }


  private setStatus(next: Status) {
    if (this.state?.status === next) return;
    this.setState({ status: next });
  }

  private setStatusTemporarily(next: Status, ms: number = 800) {
    this.clearResetTimer();
    this.setStatus(next);

    this.resetStatusTimer = window.setTimeout(() => {
      this.resetStatusTimer = null;
      this.setStatus(Status.IDLE);
    }, ms);
  }

  private setDateWithRotationCheck = (nextDate: string) => {
    if (!nextDate || nextDate === this.state?.date) return;
  
    const nextWeekKey = this.getWeekStartKeyFromDateString(nextDate);
  
    this.setState({ date: nextDate });
  
    // si un RESET flash est en cours, ne pas écraser
    if (this.resetStatusTimer !== null) return;
  
    if (nextWeekKey !== this.lastWeekStartKey) {
      this.lastWeekStartKey = nextWeekKey;
  
      this.setStatusTemporarily(Status.SYNC);
    } else {
      this.setStatus(Status.IDLE);
    }
  };
  

  // ---------- Handlers ----------
  private onReset = () => {
    this.setDateWithRotationCheck( todayUTC_YYYY_MM_DD() );   
    this.setStatusTemporarily(Status.RESET);
  }

  private onDateInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    if (!value) return;
    this.setDateWithRotationCheck(value);
  }

  private onPrevWeek = () => {
    const current = parseAsUTCDate(this.state.date);
    const prev = addDaysUTC(current, -7);
    this.setDateWithRotationCheck(fmtUTCDate(prev));
  }

  private onNextWeek = () => {
    const current = parseAsUTCDate(this.state.date);
    const next = addDaysUTC(current, +7);
    this.setDateWithRotationCheck(fmtUTCDate(next));
  }


  render() {

    const { date, status } = this.state;

    const UTCDate = parseAsUTCDate(date);

    const password = this.gen( UTCDate );

    const week = isoWeekWindowUTC(UTCDate);


    return (
      <div id="r8a2" className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <Helmet>
          <title>GTFO Progress — R8A2 Secondary Password</title>
          <meta
              name="description"
              content="Current GTFO R8A2 secondary password, updated weekly after the rundown reset. Unlock the R8A2 secondary objective instantly."
          />
          <meta name="keywords" content="gtfo progress, r8a2 password, r8a2 secondary, r8a2 secondary password, weekly r8a2 password, gtfo r8a2 password, gtfo tools, gtfo secondary password" />
          <link rel="canonical" href="https://sofiane-77.github.io/gtfo/r8a2/" />
          <meta property="og:url" content="https://sofiane-77.github.io/gtfo/r8a2/" />
          <meta
              property="og:title"
              content="GTFO Progress — R8A2 Secondary Password"
          />
          <meta
              property="og:description"
              content="Current GTFO R8A2 secondary password, updated weekly after the rundown reset. Unlock the R8A2 secondary objective instantly."
          />
          <meta
              property="og:image"
              content="https://sofiane-77.github.io/gtfo/images/og/r8a2.jpg"
          />

          <meta
              name="twitter:title"
              content="GTFO Progress — R8A2 Secondary Password"
          />
          <meta
              name="twitter:description"
              content="Current GTFO R8A2 secondary password, updated weekly after the rundown reset. Unlock the R8A2 secondary objective instantly."
          />
          <meta property="twitter:url" content="https://sofiane-77.github.io/gtfo/r8a2/" />
          <meta
              name="twitter:image"
              content="https://sofiane-77.github.io/gtfo/images/og/r8a2.jpg"
          />
        </Helmet>
        <main
          className="
          r8a2-crt relative
          h-auto w-full max-w-[560px]
          rounded-lg border-2
          bg-(--r8a2-terminal) border-(--r8a2-border)
          shadow-(--r8a2-windowShadow)
        "
        >
          {/* Scan beam */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <div className="absolute left-0 right-0 top-0 h-24 opacity-30 blur-[1px] bg-(--r8a2-scan) r8a2-scan" />
          </div>
  
          <header
            className="
              relative flex items-center justify-between px-3 py-2 border-b rounded-t-lg
              bg-(--r8a2-header) border-(--r8a2-border)
            "
          >
            <div className="text-white tracking-[0.2em] text-[22px] leading-none r8a2-flicker">
              <span className="inline-block r8a2-glow [text-shadow:var(--r8a2-ts-header)]">
                SECURITY TABLET
              </span>
              <span className="text-white/70"> :: ACCESS NODE</span>
            </div>
          </header>
  
          <section className="relative p-6 pt-8">
            <div className="text-center mb-7">
              <div className="text-[30px] text-white tracking-wide [text-shadow:var(--r8a2-ts-title)]">
                {"// SYSTEM OVERRIDE //"}
              </div>
              <div className="text-[20px] mt-1 text-(--r8a2-neonSoft) [text-shadow:var(--r8a2-ts-soft)]">
                Password rotate every week at 00:00 UTC.
              </div>
            </div>
  
            <form className="space-y-5" autoComplete="on">

                            {/* Date */}
                            <div className="space-y-1">
                <label
                  htmlFor="date"
                  className="block text-[22px] text-(--r8a2-neon) [text-shadow:var(--r8a2-ts-soft)] uppercase"
                >
                  Expedition date:
                </label>
  
                <div className="relative">
                  <input
                    id="date"
                    name="date"
                    type="date"
                    required
                    value={this.state?.date}
                    onInput={this.onDateInput}
                    className="
                      w-full px-4 py-3 text-[24px] rounded-md
                      bg-black/60 border outline-none transition
                      text-(--r8a2-neon) border-(--r8a2-border)
                      focus:ring-2 focus:ring-(--r8a2-ring)
                      focus:border-(--r8a2-borderStrong)
                    "
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-md shadow-(--r8a2-insetTopLine)" />
                </div>
  
                <div className="text-[18px] text-(--r8a2-neonSoft)/70">Navigate using the buttons or the right-side picker.</div>
              </div>

              {/* Passkey */}
              <div className="space-y-2">
                <div className="text-[22px] text-(--r8a2-neon) [text-shadow:var(--r8a2-ts-soft)] uppercase">
                  PASSWORD:
                </div>
  
                <div className="relative">
                  <input
                    id="password"
                    className="
                      w-full px-4 py-4 text-[28px] tracking-widest rounded-md
                      bg-black/70 border text-center select-text
                      text-(--r8a2-neon) border-(--r8a2-border)
                      shadow-(--r8a2-keyShadow)
                      outline-hidden
                    "
                    type="text"
                    value={password}
                    readOnly
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-md shadow-(--r8a2-insetTopLine)" />
                </div>
  
                <div className="text-[18px] text-(--r8a2-neonSoft)/70 text-center">
                  Valid from <span className="text-(--r8a2-neonSoft) [text-shadow:var(--r8a2-ts-soft)]">{week.start.toLocaleString()}</span> to <span className="text-(--r8a2-neonSoft) [text-shadow:var(--r8a2-ts-soft)]">{week.end.toLocaleString()}</span>
                </div>
              </div>
  
  
              {/* Action */}
              <div className="flex items-center justify-between gap-3 h-[63px]">
                <button
                  type="button"
                  onClick={this.onPrevWeek}
                  className="
                    w-[15%] py-3 h-full rounded-md text-[34px] font-bold
                    flex items-center justify-center leading-none
                    bg-(--r8a2-neon) text-black transition active:scale-[0.99]
                    shadow-(--r8a2-btnShadow) hover:shadow-(--r8a2-btnShadowHover)
                    cursor-pointer
                  "
                  aria-label="Previous week"
                >
                  <span className="inline-flex items-center justify-center h-full w-full leading-none mt-[-15px] text-[45px]">
                    &#171;
                  </span>
                </button>

                <button
                  type="button"
                  onClick={this.onReset}
                  className="
                    group relative w-[60%] h-full py-3 text-[26px] font-bold uppercase tracking-wider rounded-md
                    bg-(--r8a2-neon) text-black transition active:scale-[0.99] overflow-hidden
                    shadow-(--r8a2-btnShadow) hover:shadow-(--r8a2-btnShadowHover)
                    cursor-pointer
                  "
                >
                  <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="absolute -left-1/2 top-0 h-full w-1/2 bg-white/20 blur-[1px] rotate-12 animate-[r8a2-shimmer_2.8s_linear_infinite]" />
                  </span>
                  <span className="relative">Reset</span>
                </button>

                <button
                  type="button"
                  onClick={this.onNextWeek}
                  className="
                    w-[15%] py-3 h-full rounded-md text-[34px] font-bold
                    flex items-center justify-center leading-none
                    bg-(--r8a2-neon) text-black transition active:scale-[0.99]
                    shadow-(--r8a2-btnShadow) hover:shadow-(--r8a2-btnShadowHover)
                    cursor-pointer
                  "
                  aria-label="Next week"
                >
                  <span className="inline-flex items-center justify-center h-full w-full leading-none mt-[-15px] text-[45px]">
                    &#187;
                  </span>
                </button>
              </div>
  
              <p className="text-center text-[20px] text-yellow-300 [text-shadow:var(--r8a2-ts-status)]">
                STATUS: {status}
              </p>
            </form>
  
            <div className="mt-7 pt-4 border-t border-(--r8a2-borderSoft)">
              <div className="flex items-center justify-between gap-3 text-[18px] text-(--r8a2-neonSoft)">
                <div>
                  <span className="text-(--r8a2-neonSoft)">&gt;</span> Encrypted channel • Data verified
                </div>
                <div className="px-2 py-[2px] rounded border border-(--r8a2-borderSoft) bg-black/50 text-(--r8a2-neonSoft)/70 tracking-wider">
                  {this.version}
                </div>
              </div>
            </div>
  
            {/* Corner brackets */}
            <div className="pointer-events-none absolute -inset-[2px] rounded-lg">
              <div className="absolute left-2 top-2 h-5 w-5 border-l-2 border-t-2 border-(--r8a2-border)" />
              <div className="absolute right-2 top-2 h-5 w-5 border-r-2 border-t-2 border-(--r8a2-border)" />
              <div className="absolute left-2 bottom-2 h-5 w-5 border-l-2 border-b-2 border-(--r8a2-border)" />
              <div className="absolute right-2 bottom-2 h-5 w-5 border-r-2 border-b-2 border-(--r8a2-border)" />
            </div>
          </section>
        </main>
        <CircuitBackground className="fixed opacity-[0.6] blur-[1px] z-[-1]" />
      </div>
    );
  }
}
