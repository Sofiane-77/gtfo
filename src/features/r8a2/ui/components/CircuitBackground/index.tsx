// CircuitBackground.tsx
import { Component } from "inferno";

type Props = {
  className?: string;

  cellSize?: number;
  wireLength?: number;
  cutOffLength?: number;
  straightness?: number;

  bg?: string;

  circuitStroke?: string;
  circuitGlow?: string;

  signalStroke?: string;
  signalGlow?: string;

  signalCount?: number;        // max 1 par wire
  signalSpeed?: number;        // px/sec
  signalWidth?: number;        // px

  signalLength?: number;       // MIN (ta taille actuelle)
  signalLengthRatio?: number;  // proportion de la longueur du wire (ex 0.12)
  invertChance?: number;
};

const dirs: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [1, 0],
  [1, 1], [0, 1], [-1, 1],
  [-1, 0]
];

const rand = () => Math.random();
const floor = Math.floor;
const ceil = Math.ceil;
const pow = Math.pow;

class Cell {
  public available = true;
  constructor(public x: number, public y: number) {}
}

function noCrossOver(index: number, x: number, y: number, grid: Cell[][]): boolean {
  if (index === 0) return (grid[x + 1][y].available || grid[x][y + 1].available);
  if (index === 2) return (grid[x - 1][y].available || grid[x][y + 1].available);
  if (index === 4) return (grid[x - 1][y].available || grid[x][y - 1].available);
  if (index === 6) return (grid[x + 1][y].available || grid[x][y - 1].available);
  return true;
}

function findOpenDir(x: number, y: number, grid: Cell[][], gridWidth: number, gridHeight: number): number {
  const checks = [0, 1, 2, 3, 4, 5, 6, 7];
  while (checks.length > 0) {
    const index = checks.splice(floor(rand() * checks.length), 1)[0];
    const [dx, dy] = dirs[index];
    const x2 = x + dx;
    const y2 = y + dy;
    if (x2 >= 0 && x2 < gridWidth - 1 && y2 >= 0 && y2 < gridHeight - 1) {
      if (grid[x2][y2].available) return index;
    }
  }
  return 0;
}

type Runtime = {
  w: number;
  h: number;
  cellSize: number;
  wireLength: number;
  straightness: number;
  gridWidth: number;
  gridHeight: number;
  grid: Cell[][];
};

type Point = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

class Wire {
  public cells: Cell[] = [];
  private last: number;

  public points: Point[] = [];
  public segLen: number[] = [];
  public cumLen: number[] = [];
  public totalLen = 0;

  public direction: 1 | -1 = 1;

  // ✅ longueur de signal propre à ce wire (calculée)
  public signalLen = 0;

  constructor(start: Cell, private rt: Runtime) {
    this.cells.push(start);
    this.last = findOpenDir(start.x, start.y, rt.grid, rt.gridWidth, rt.gridHeight);
  }

  generate(): void {
    const { wireLength, straightness, gridWidth, gridHeight, grid } = this.rt;
    let hasSpace = true;

    while (this.cells.length < wireLength && hasSpace) {
      const prev = this.cells[this.cells.length - 1];

      let tries: number[] = [0, 1, -1];
      if (rand() > 0.5) tries = [0, -1, 1];

      let found = false;
      hasSpace = false;

      while (tries.length > 0 && !found) {
        const pickIndex = floor(pow(rand(), straightness) * tries.length);
        const mod = tries.splice(pickIndex, 1)[0];

        let index = this.last + 4 + mod;
        if (index < 0) index += 8;
        if (index > 7) index -= 8;

        const [dx, dy] = dirs[index];
        const x = prev.x + dx;
        const y = prev.y + dy;

        if (x >= 0 && x < gridWidth - 1 && y >= 0 && y < gridHeight - 1) {
          const cell = grid[x][y];
          if (cell.available && noCrossOver(index, x, y, grid)) {
            this.cells.push(cell);
            cell.available = false;

            hasSpace = true;
            found = true;

            this.last = this.last + mod;
            if (this.last < 0) this.last += 8;
            if (this.last > 7) this.last -= 8;
          }
        }
      }
    }
  }

  buildGeometry(w: number, h: number, cellSize: number, gridWidth: number, gridHeight: number): void {
    const sx = (1 + w / cellSize) / gridWidth;
    const sy = (1 + h / cellSize) / gridHeight;

    const n = this.cells.length;
    this.points = new Array(n);
    for (let i = 0; i < n; i++) {
      const c = this.cells[i];
      this.points[i] = {
        x: (c.x + 0.5) * cellSize * sx,
        y: (c.y + 0.5) * cellSize * sy
      };
    }

    this.segLen = [];
    this.cumLen = [];
    this.totalLen = 0;

    for (let i = 0; i < this.points.length - 1; i++) {
      this.cumLen.push(this.totalLen);
      const a = this.points[i];
      const b = this.points[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      this.segLen.push(len);
      this.totalLen += len;
    }

    if (this.points.length < 2) {
      this.segLen = [];
      this.cumLen = [];
      this.totalLen = 0;
    }
  }

  renderStatic(ctx: CanvasRenderingContext2D): void {
    const pts = this.points;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    const r = Math.max(1.5, ctx.lineWidth * 0.95);
    const a = pts[0];
    const b = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBetween(ctx: CanvasRenderingContext2D, d0: number, d1: number): void {
    if (this.totalLen <= 0 || this.points.length < 2) return;

    if (d1 <= 0 || d0 >= this.totalLen) return;
    d0 = Math.max(0, Math.min(this.totalLen, d0));
    d1 = Math.max(0, Math.min(this.totalLen, d1));
    if (d1 <= d0) return;

    const pts = this.points;
    const segLen = this.segLen;
    const cum = this.cumLen;

    ctx.beginPath();
    let started = false;

    for (let i = 0; i < segLen.length; i++) {
      const segStart = cum[i];
      const segEnd = segStart + segLen[i];

      if (segEnd <= d0) continue;
      if (segStart >= d1) break;

      const a = pts[i];
      const b = pts[i + 1];
      const len = segLen[i] || 1;

      const local0 = Math.max(d0, segStart) - segStart;
      const local1 = Math.min(d1, segEnd) - segStart;

      const t0 = local0 / len;
      const t1 = local1 / len;

      const x0 = lerp(a.x, b.x, t0);
      const y0 = lerp(a.y, b.y, t0);
      const x1 = lerp(a.x, b.x, t1);
      const y1 = lerp(a.y, b.y, t1);

      if (!started) {
        ctx.moveTo(x0, y0);
        started = true;
      } else {
        ctx.lineTo(x0, y0);
      }
      ctx.lineTo(x1, y1);
    }

    ctx.stroke();
  }
}

type Signal = {
  wireIndex: number;
  head: number;
  dir: 1 | -1;
};

function shuffleInPlace(arr: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

export default class CircuitBackground extends Component<Props> {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private baseCanvas: HTMLCanvasElement | null = null;
  private baseCtx: CanvasRenderingContext2D | null = null;

  private w = 0;
  private h = 0;

  private gridWidth = 0;
  private gridHeight = 0;
  private grid: Cell[][] = [];
  private available: Cell[] = [];
  private wires: Wire[] = [];

  // defaults
  private cellSize = 30;
  private wireLength = 25;
  private cutOffLength = 2;
  private straightness = 5;

  private bg = "black";

  private circuitStroke = "#0b3d1e";
  private circuitGlow = "rgba(34,197,94,.06)";

  private signalStroke = "#22c55e";
  private signalGlow = "rgba(34,197,94,.35)";

  private signalCount = 999999;   // 1 par wire (clamp)
  private signalSpeed = 150;
  private signalWidth = 3;

  // ✅ min + ratio
  private signalLengthMin = 48;   // ta taille actuelle (minimum)
  private signalLengthRatio = 0.12;

  private invertChance = 0.5;

  private staticLineWidth = 0;

  private raf: number | null = null;
  private lastT = 0;
  private signals: Signal[] = [];

  private resizeTimer: number | null = null;

  componentDidMount(): void {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d", { alpha: true });

    this.baseCanvas = document.createElement("canvas");
    this.baseCtx = this.baseCanvas.getContext("2d", { alpha: false });

    this.applyProps();
    this.resizeCanvas();
    this.recreate();

    window.addEventListener("resize", this.onResize, { passive: true });

    this.lastT = performance.now();
    this.loop(this.lastT);
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.onResize);
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    if (this.raf !== null) cancelAnimationFrame(this.raf);
  }

  private applyProps(): void {
    const p = this.props;

    this.cellSize = p.cellSize ?? this.cellSize;
    this.wireLength = p.wireLength ?? this.wireLength;
    this.cutOffLength = p.cutOffLength ?? this.cutOffLength;
    this.straightness = p.straightness ?? this.straightness;

    this.bg = p.bg ?? this.bg;

    this.circuitStroke = p.circuitStroke ?? this.circuitStroke;
    this.circuitGlow = p.circuitGlow ?? this.circuitGlow;

    this.signalStroke = p.signalStroke ?? this.signalStroke;
    this.signalGlow = p.signalGlow ?? this.signalGlow;

    this.signalCount = p.signalCount ?? this.signalCount;
    this.signalSpeed = p.signalSpeed ?? this.signalSpeed;
    this.signalWidth = p.signalWidth ?? this.signalWidth;

    this.signalLengthMin = p.signalLength ?? this.signalLengthMin;
    this.signalLengthRatio = p.signalLengthRatio ?? this.signalLengthRatio;

    this.invertChance = p.invertChance ?? this.invertChance;
  }

  private onResize = (): void => {
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resizeCanvas();
      this.recreate();
    }, 80);
  };

  private resizeCanvas(): void {
    if (!this.canvas || !this.ctx || !this.baseCanvas || !this.baseCtx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;

    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.baseCanvas.width = Math.floor(this.w * dpr);
    this.baseCanvas.height = Math.floor(this.h * dpr);
    this.baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private computeSignalLenForWire(L: number): number {
    // ratio-based but never below min, never above 0.9*L, and at least 6px
    const scaled = L * this.signalLengthRatio;
    const desired = Math.max(this.signalLengthMin, scaled);
    const capped = Math.min(desired, Math.max(6, L * 0.9));
    return Math.max(6, capped);
  }

  private recreate(): void {
    if (!this.ctx || !this.baseCtx) return;

    this.gridWidth = ceil(this.w / this.cellSize) + 1;
    this.gridHeight = ceil(this.h / this.cellSize) + 1;

    this.grid = new Array(this.gridWidth);
    this.available = [];
    this.wires = [];

    for (let i = 0; i < this.gridWidth; i++) {
      const col: Cell[] = new Array(this.gridHeight);
      for (let j = 0; j < this.gridHeight; j++) {
        const cell = new Cell(i, j);
        col[j] = cell;
        this.available.push(cell);
      }
      this.grid[i] = col;
    }

    const rt: Runtime = {
      w: this.w,
      h: this.h,
      cellSize: this.cellSize,
      wireLength: this.wireLength,
      straightness: this.straightness,
      gridWidth: this.gridWidth,
      gridHeight: this.gridHeight,
      grid: this.grid
    };

    while (this.available.length > 0) {
      const cell = this.available[floor(rand() * this.available.length)];
      cell.available = false;

      const wire = new Wire(cell, rt);
      wire.generate();

      for (let i = 0; i < wire.cells.length; i++) {
        const used = wire.cells[i];
        const idx = this.available.indexOf(used);
        if (idx !== -1) this.available.splice(idx, 1);
      }

      if (wire.cells.length > this.cutOffLength) {
        wire.direction = rand() < this.invertChance ? -1 : 1;
        this.wires.push(wire);
      }
    }

    for (const w of this.wires) {
      w.buildGeometry(this.w, this.h, this.cellSize, this.gridWidth, this.gridHeight);
      w.signalLen = this.computeSignalLenForWire(w.totalLen); // ✅ per wire
    }

    this.renderBase();
    this.seedSignals();
  }

  private renderBase(): void {
    if (!this.baseCtx) return;
    const b = this.baseCtx;

    b.fillStyle = this.bg;
    b.fillRect(0, 0, this.w, this.h);

    this.staticLineWidth = Math.max(1, this.cellSize * 0.18);

    b.save();
    b.strokeStyle = this.circuitGlow;
    b.fillStyle = this.circuitGlow;
    b.lineWidth = this.staticLineWidth * 2.0;
    b.lineJoin = "round";
    b.lineCap = "round";
    for (const w of this.wires) w.renderStatic(b);
    b.restore();

    b.save();
    b.strokeStyle = this.circuitStroke;
    b.fillStyle = this.circuitStroke;
    b.lineWidth = this.staticLineWidth;
    b.lineJoin = "round";
    b.lineCap = "round";
    for (const w of this.wires) w.renderStatic(b);
    b.restore();
  }

  private seedSignals(): void {
    this.signals = [];
    const nW = this.wires.length;
    if (nW === 0) return;

    const target = Math.min(this.signalCount, nW);

    const ids = Array.from({ length: nW }, (_, i) => i);
    shuffleInPlace(ids);

    for (let k = 0; k < target; k++) {
      const wi = ids[k];
      const w = this.wires[wi];
      const L = w.totalLen;
      const len = w.signalLen || this.computeSignalLenForWire(L);
      const dir = w.direction;

      // start outside then enter
      const head = dir === 1 ? -rand() * len : (L + rand() * len);
      this.signals.push({ wireIndex: wi, head, dir });
    }
  }

  private loop = (t: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    this.drawFrame(dt);
  };

  private drawFrame(dt: number): void {
    if (!this.ctx || !this.baseCanvas) return;

    this.ctx.drawImage(this.baseCanvas, 0, 0);

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (const s of this.signals) {
      const w = this.wires[s.wireIndex];
      if (!w || w.totalLen <= 0) continue;

      const L = w.totalLen;
      const len = w.signalLen || this.computeSignalLenForWire(L);

      s.head += this.signalSpeed * dt * s.dir;

      const head = s.head;
      const tail = head - len * s.dir;

      const a = Math.max(0, Math.min(L, Math.min(head, tail)));
      const b = Math.max(0, Math.min(L, Math.max(head, tail)));

      if (b > a) {
        ctx.strokeStyle = this.signalGlow;
        ctx.lineWidth = this.signalWidth * 2.2;
        ctx.globalAlpha = 0.9;
        w.drawBetween(ctx, a, b);

        ctx.strokeStyle = this.signalStroke;
        ctx.lineWidth = this.signalWidth;
        ctx.globalAlpha = 1;
        w.drawBetween(ctx, a, b);
      }

      // respawn when fully out (continuous, no wrap => no "double")
      if (s.dir === 1) {
        if (tail > L) s.head = -rand() * len;
      } else {
        if (tail < 0) s.head = L + rand() * len;
      }
    }

    ctx.restore();
  }

  render() {
    const className =
      this.props.className ?? "fixed inset-0 -z-10 h-full w-full pointer-events-none";
    return (
      <canvas
        ref={(el) => (this.canvas = el)}
        className={className}
        aria-hidden="true"
      />
    );
  }
}
