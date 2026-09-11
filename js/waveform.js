/**
 * FlexAlign AI — Real-Time ROM Waveform Chart
 * Clean, minimal line chart with soft styling
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
    const pw = parent.clientWidth || 300;
    const ph = parent.clientHeight || 110;
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Subtle horizontal grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Target criterion dashed line
    const targetY = h - (targetDeg / 180) * h;
    const isGym = mode === 'gym';
    const accentColor = isGym ? 'rgba(96, 165, 250, 0.3)' : 'rgba(52, 211, 153, 0.3)';
    ctx.strokeStyle = accentColor;
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target label
    const labelColor = isGym ? 'rgba(96, 165, 250, 0.6)' : 'rgba(52, 211, 153, 0.6)';
    ctx.fillStyle = labelColor;
    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillText(`${targetDeg}°`, 8, Math.max(14, targetY - 5));

    // Waveform curve
    const pts = this.history;
    const step = w / (pts.length - 1);

    // Glow pass
    const strokeCol = isGym ? '#5b9cf6' : '#34d399';
    ctx.beginPath();
    pts.forEach((val, i) => {
      const x = i * step;
      const y = h - (val / 180) * (h - 12) - 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2;
    ctx.shadowColor = strokeCol;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under curve
    const lastX = (pts.length - 1) * step;
    const lastY = h - (pts[pts.length - 1] / 180) * (h - 12) - 6;
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    const fillBase = isGym ? '91, 156, 246' : '52, 211, 153';
    gradient.addColorStop(0, `rgba(${fillBase}, 0.12)`);
    gradient.addColorStop(1, `rgba(${fillBase}, 0.01)`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}
