/**
 * FDE-BANKOPS: 60fps Canvas 2D Real-Time Payment Rails & SHAP Explainability Visualizer
 * Exclusive Architect: أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer
 */

import type { BankingRail, BankingTransaction, ScenarioMode, ShapFeature } from '../engine/fdeEngine';

interface StreamPacket {
  railIndex: number;
  progress: number; // 0 -> 1
  speed: number;
  color: string;
  label: string;
  isAnomaly: boolean;
}

const RAILS: BankingRail[] = [
  'SARIE Instant Wire',
  'Corporate Treasury',
  'Mada POS',
  'Murabaha Credit',
];

export class BankingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private width = 640;
  private height = 400;
  private dpr = 1;

  private activeTx: BankingTransaction | null = null;
  private mode: ScenarioMode = 'NORMAL';
  private circuitOpen = false;

  // Smoothly interpolated SHAP values for 60fps transition
  private displayShap: number[] = [-0.19, -0.24, -0.15, 0.04];
  private targetShap: number[] = [-0.19, -0.24, -0.15, 0.04];
  private displayRisk = 12;
  private targetRisk = 12;

  private packets: StreamPacket[] = [];
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }
    this.ctx = context;

    this.seedPackets();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.start();
  }

  private seedPackets(): void {
    const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];
    this.packets = [];
    for (let i = 0; i < 12; i += 1) {
      const railIndex = i % 4;
      this.packets.push({
        railIndex,
        progress: (i * 0.083) % 1,
        speed: 0.0042 + (i % 3) * 0.0012,
        color: colors[railIndex],
        label: RAILS[railIndex].split(' ')[0],
        isAnomaly: false,
      });
    }
  }

  public updateState(tx: BankingTransaction, mode: ScenarioMode, circuitOpen: boolean): void {
    this.activeTx = tx;
    this.mode = mode;
    this.circuitOpen = circuitOpen;
    this.targetRisk = tx.riskScore;
    this.targetShap = tx.shapFeatures.map((f) => f.shapContribution);

    // Highlight anomaly packets on ATO/SMURFING
    const isFraud = mode === 'ATO' || mode === 'SMURFING';
    this.packets.forEach((p, idx) => {
      if (isFraud && idx % 3 === 0) {
        p.isAnomaly = true;
        p.color = '#f43f5e';
        p.speed = 0.0068;
      } else {
        p.isAnomaly = false;
        const colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];
        p.color = circuitOpen ? '#f59e0b' : colors[p.railIndex];
        p.speed = 0.0044 + (idx % 3) * 0.001;
      }
    });
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.width = Math.max(320, Math.floor(rect.width));
    this.height = Math.max(330, Math.floor(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public start(): void {
    if (this.rafId !== null) return;
    const loop = () => {
      this.time += 0.016;
      this.step();
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private step(): void {
    for (let i = 0; i < 4; i += 1) {
      const target = this.targetShap[i] ?? 0;
      this.displayShap[i] += (target - this.displayShap[i]) * 0.12;
    }
    this.displayRisk += (this.targetRisk - this.displayRisk) * 0.1;

    for (const p of this.packets) {
      p.progress += p.speed;
      if (p.progress > 1) {
        p.progress = 0;
      }
    }
  }

  private drawRoundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Subtle cyber grid background
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)';
    ctx.lineWidth = 1;
    const gridGap = 28;
    for (let x = 0; x < w; x += gridGap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridGap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const splitY = Math.floor(h * 0.52);
    this.drawPipelineSection(w, splitY);
    this.drawShapSection(w, splitY, h - splitY);
  }

  private drawPipelineSection(w: number, secH: number): void {
    const ctx = this.ctx;
    const padX = 16;
    const railBoxW = Math.min(138, Math.max(98, w * 0.2));
    const railStartY = 26;
    const railStepY = (secH - 36) / 4;

    // Header label inside top canvas
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px "Fira Code", monospace';
    ctx.fillText('LIVE BANKING RAILS -> FDE ZERO-PII ROUTER -> XGBOOST + SAMA AML (<18ms)', padX, 16);

    const hubX = w * 0.46;
    const hubY = secH * 0.54;
    const engineX = w * 0.69;
    const engineY = secH * 0.54;
    const gateX = w - Math.min(126, w * 0.19) - padX;
    const gateW = Math.min(120, w * 0.18);

    // Draw rail nodes + bezier paths to Hub
    const railColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'];
    const railAnchors: Array<{ x: number; y: number }> = [];

    RAILS.forEach((railName, idx) => {
      const y = railStartY + idx * railStepY;
      const boxH = Math.max(22, railStepY - 7);
      const cy = y + boxH / 2;
      railAnchors.push({ x: padX + railBoxW, y: cy });

      const isSelectedRail = this.activeTx?.rail === railName;
      ctx.fillStyle = isSelectedRail ? 'rgba(6, 182, 212, 0.16)' : 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isSelectedRail ? railColors[idx] : 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = isSelectedRail ? 1.5 : 1;
      this.drawRoundRect(padX, y, railBoxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      // Status dot
      ctx.beginPath();
      ctx.arc(padX + 10, cy, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = railColors[idx];
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 10px "Outfit", sans-serif';
      const shortName = w < 520 ? railName.split(' ')[0] : railName;
      ctx.fillText(shortName, padX + 19, cy + 3.5);

      // Path from rail to Context Router Hub
      ctx.beginPath();
      ctx.moveTo(padX + railBoxW, cy);
      ctx.bezierCurveTo(
        padX + railBoxW + (hubX - padX - railBoxW) * 0.45,
        cy,
        hubX - 48,
        hubY,
        hubX - 38,
        hubY
      );
      ctx.strokeStyle = isSelectedRail ? `${railColors[idx]}88` : 'rgba(100, 116, 139, 0.26)';
      ctx.lineWidth = isSelectedRail ? 1.8 : 1;
      ctx.stroke();
    });

    // Connector Hub -> Engine -> Decision Gate
    ctx.beginPath();
    ctx.moveTo(hubX + 38, hubY);
    ctx.lineTo(engineX - 42, engineY);
    ctx.strokeStyle = this.circuitOpen ? '#f59e0b' : 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(engineX + 42, engineY);
    ctx.lineTo(gateX, engineY);
    const isBlocked = this.activeTx?.verdict === 'BLOCKED';
    ctx.strokeStyle = isBlocked ? 'rgba(244, 63, 94, 0.7)' : 'rgba(16, 185, 129, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Animate 60fps packets along segments
    for (const p of this.packets) {
      const anchor = railAnchors[p.railIndex];
      let px = 0;
      let py = 0;

      if (p.progress < 0.48) {
        const t = p.progress / 0.48;
        const x0 = anchor.x;
        const y0 = anchor.y;
        const x1 = hubX - 38;
        const y1 = hubY;
        const cx1 = x0 + (x1 - x0) * 0.45;
        const cx2 = hubX - 48;
        const mt = 1 - t;
        px = mt * mt * mt * x0 + 3 * mt * mt * t * cx1 + 3 * mt * t * t * cx2 + t * t * t * x1;
        py = mt * mt * mt * y0 + 3 * mt * mt * t * y0 + 3 * mt * t * t * y1 + t * t * t * y1;
      } else if (p.progress < 0.74) {
        const t = (p.progress - 0.48) / 0.26;
        px = hubX + 38 + (engineX - 42 - (hubX + 38)) * t;
        py = hubY;
      } else {
        const t = (p.progress - 0.74) / 0.26;
        px = engineX + 42 + (gateX - (engineX + 42)) * t;
        py = engineY;
      }

      ctx.beginPath();
      ctx.arc(px, py, p.isAnomaly ? 4.2 : 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.isAnomaly ? 12 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Center Hub Node: Zero-PII & Context Router
    const pulse = 1 + Math.sin(this.time * 4) * 0.04;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = this.circuitOpen ? '#f59e0b' : '#06b6d4';
    ctx.lineWidth = 1.8;
    this.drawRoundRect(hubX - 38 * pulse, hubY - 26 * pulse, 76 * pulse, 52 * pulse, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.circuitOpen ? '#fbbf24' : '#38bdf8';
    ctx.font = '700 9.5px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.circuitOpen ? 'SEMANTIC' : 'ZERO-PII', hubX, hubY - 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(this.circuitOpen ? 'CACHE 3x' : 'CONTEXT', hubX, hubY + 10);

    // Engine Node: XGBoost + SAMA AML
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = isBlocked ? '#f43f5e' : '#8b5cf6';
    ctx.lineWidth = 1.8;
    this.drawRoundRect(engineX - 42, engineY - 26, 84, 52, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBlocked ? '#fb7185' : '#c084fc';
    ctx.font = '700 9.5px "Fira Code", monospace';
    ctx.fillText('XGB + SHAP', engineX, engineY - 4);
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${this.activeTx?.inferenceMs ?? 13.4} ms`, engineX, engineY + 10);

    // Right Gate: Verdict Box
    const gateY = engineY - 28;
    ctx.fillStyle = isBlocked ? 'rgba(244, 63, 94, 0.16)' : 'rgba(16, 185, 129, 0.14)';
    ctx.strokeStyle = isBlocked ? '#f43f5e' : '#10b981';
    ctx.lineWidth = 1.8;
    this.drawRoundRect(gateX, gateY, gateW, 56, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBlocked ? '#fda4af' : '#6ee7b7';
    ctx.font = '700 10px "Fira Code", monospace';
    ctx.fillText(isBlocked ? 'BLOCKED + STR' : 'APPROVED', gateX + gateW / 2, engineY - 4);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 12px "Outfit", sans-serif';
    ctx.fillText(`Risk: ${Math.round(this.displayRisk)}/100`, gateX + gateW / 2, engineY + 14);
    ctx.textAlign = 'left';
  }

  private drawShapSection(w: number, startY: number, secH: number): void {
    const ctx = this.ctx;
    const padX = 16;

    // Divider line
    ctx.beginPath();
    ctx.moveTo(padX, startY);
    ctx.lineTo(w - padX, startY);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title
    const tx = this.activeTx;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 11px "Outfit", sans-serif';
    const txSummary = tx
      ? `SHAP Feature Attribution • ${tx.id} (SAR ${tx.amountSar.toLocaleString()} • ${tx.verdict})`
      : 'SHAP Feature Attribution';
    ctx.fillText(txSummary, padX, startY + 18);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 9.5px "Fira Code", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('← Safe (Negative φ) | Fraud Push (Positive φ) →', w - padX, startY + 18);
    ctx.textAlign = 'left';

    const features: ShapFeature[] = tx?.shapFeatures ?? [
      { name: 'Velocity Z-Score', rawValue: '0.32σ', shapContribution: -0.19 },
      { name: 'Geo/Device Drift', rawValue: 'Trusted', shapContribution: -0.24 },
      { name: 'Beneficiary Graph Risk', rawValue: '0.08', shapContribution: -0.15 },
      { name: 'Amount vs 90d Baseline', rawValue: '1.08x', shapContribution: 0.04 },
    ];

    const labelColW = Math.min(185, w * 0.34);
    const valColW = 74;
    const chartLeft = padX + labelColW;
    const chartRight = w - padX - valColW;
    const chartW = Math.max(100, chartRight - chartLeft);
    const zeroX = chartLeft + chartW * 0.45; // centerline

    // Zero baseline vertical dashed line
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(zeroX, startY + 26);
    ctx.lineTo(zeroX, startY + secH - 8);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.stroke();
    ctx.restore();

    const rowAreaH = secH - 34;
    const rowStep = rowAreaH / 4;

    features.forEach((feat, idx) => {
      const y = startY + 28 + idx * rowStep;
      const barH = Math.min(16, Math.max(11, rowStep - 10));
      const val = this.displayShap[idx] ?? feat.shapContribution;

      // Feature Name & Raw Value
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 10.5px "Outfit", sans-serif';
      ctx.fillText(feat.name, padX, y + barH * 0.55);

      ctx.fillStyle = '#64748b';
      ctx.font = '400 9px "Fira Code", monospace';
      ctx.fillText(feat.rawValue, padX, y + barH * 0.55 + 11);

      // Bar Track
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      this.drawRoundRect(chartLeft, y + 2, chartW, barH, 4);
      ctx.fill();

      // SHAP Bar
      const maxSpan = chartW * 0.52;
      const clamped = Math.max(-0.55, Math.min(0.55, val));
      const barLen = Math.abs(clamped / 0.55) * maxSpan;
      const isPositive = val >= 0;

      ctx.fillStyle = isPositive ? '#f43f5e' : '#10b981';
      if (isPositive) {
        this.drawRoundRect(zeroX, y + 2, Math.max(3, barLen), barH, 3);
      } else {
        this.drawRoundRect(zeroX - Math.max(3, barLen), y + 2, Math.max(3, barLen), barH, 3);
      }
      ctx.fill();

      // Numeric SHAP delta on right
      ctx.fillStyle = isPositive ? '#fb7185' : '#34d399';
      ctx.font = '700 10px "Fira Code", monospace';
      ctx.textAlign = 'right';
      const sign = val >= 0 ? '+' : '';
      ctx.fillText(`${sign}${val.toFixed(2)}`, w - padX, y + barH * 0.72);
      ctx.textAlign = 'left';
    });
  }
}
