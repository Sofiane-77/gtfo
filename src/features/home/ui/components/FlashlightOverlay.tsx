import { Component } from "inferno";

type Props = {
  nightStartHour: number;
  nightEndHour: number; 
};

export default class FlashlightOverlay extends Component<Props> {
  private el?: HTMLDivElement;

  private rafId = 0;
  private hourTimer: number | null = null;
  private listening = false;

  private x = 0;
  private y = 0;

  private isNightNow = () => {
    const start = this.props.nightStartHour
    const end = this.props.nightEndHour;
    const h = new Date().getHours();


    return start < end ? (h >= start && h < end) : (h >= start || h < end);
  };

  private apply = () => {
    this.rafId = 0;
    if (!this.el) return;
    this.el.style.setProperty("--cursorX", `${this.x}px`);
    this.el.style.setProperty("--cursorY", `${this.y}px`);
  };

  private onMove = (e: PointerEvent) => {
    this.x = e.clientX;
    this.y = e.clientY;
    if (!this.rafId) this.rafId = requestAnimationFrame(this.apply);
  };

  private startPointer = () => {
    if (this.listening) return;
    this.listening = true;
    document.addEventListener("pointermove", this.onMove, { passive: true });
  };

  private stopPointer = () => {
    if (!this.listening) return;
    this.listening = false;
    document.removeEventListener("pointermove", this.onMove);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  };

  private sync = () => {
    const night = this.isNightNow();


    if (this.el) this.el.style.display = night ? "block" : "none";


    document.body.style.cursor = night ? "none" : "";

    if (night) this.startPointer();
    else this.stopPointer();
  };

  private scheduleNextHourCheck = () => {
    if (this.hourTimer) window.clearTimeout(this.hourTimer);

    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(now.getHours() + 1);

    this.hourTimer = window.setTimeout(() => {
      this.sync();
      this.scheduleNextHourCheck();
    }, nextHour.getTime() - now.getTime());
  };

  componentDidMount() {
    this.sync();
    this.scheduleNextHourCheck();
  }

  componentWillUnmount() {
    this.stopPointer();
    if (this.hourTimer) window.clearTimeout(this.hourTimer);
    this.hourTimer = null;


    document.body.style.cursor = "";
  }

  render() {

    return (
      <div
        className="flashlight-overlay"
        style={{ display: "none" }}
        ref={(node) => (this.el = node as HTMLDivElement)}
      />
    );
  }
}
