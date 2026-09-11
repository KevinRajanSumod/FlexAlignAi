/**
 * FlexAlign AI - Real-Time ROM Waveform Line Chart
 */

export class WaveformChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.history = new Array(80).fill(0);
  }

  push(angle) {
    this.history.shift();
    this.history.push(angle);
  }

  reset() {
    this.history.fill(0);
    this.render('gym', 90);
  }

  render(mode, targetDeg) {
    const ctx = this.ctx;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const w = this.canvas.width = parent.clientWidth;
    const h = this.canvas.height = parent.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Subtle Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Target Criterion Guideline
    const targetY = h - (targetDeg / 180) * h;
    const isGym = mode === 'gym';
    ctx.strokeStyle = isGym ? 'rgba(56, 189, 248, 0.35)' : 'rgba(16, 185, 129, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Guideline Label
    ctx.fillStyle = isGym ? 'rgba(56, 189, 248, 0.7)' : 'rgba(16, 185, 129, 0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Target: ${targetDeg}°`, 8, Math.max(12, targetY - 4));

    // Rolling Curve
    const pts = this.history;
    const step = w / (pts.length - 1);

    ctx.beginPath();
    pts.forEach((val, i) => {
      const x = i * step;
      const y = h - (val / 180) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const strokeCol = isGym ? '#00f0ff' : '#10b981';
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = strokeCol;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
