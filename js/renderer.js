/**
 * FlexAlign AI - HTML5 Canvas Skeletal & HUD Telemetry Renderer
 * Fix: angle arc always draws the shorter arc (no backward-wrap for obtuse angles).
 */

export class HUDRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(isSimulation) {
    if (!isSimulation) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Dark cyber backdrop
    ctx.fillStyle = '#060b17';
    ctx.fillRect(0, 0, width, height);

    // Matrix grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Floor platform line
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.92);
    ctx.lineTo(width * 0.75, height * 0.92);
    ctx.stroke();

    // Mode watermark
    ctx.fillStyle = 'rgba(139, 92, 246, 0.85)';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText('⚡ SYNTHETIC BIOMECHANICAL SIMULATION ACTIVE', 24, height - 20);
  }

  renderSkeleton(landmarks, side, exercise, currentAngle, isOptimal, isMirrored = false) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const isLeft = side === 'left';

    // Coordinate mapping helper: flip X if video is horizontally mirrored (webcam mode)
    const getX = (lm) => (isMirrored ? (1 - lm.x) : lm.x) * width;
    const getY = (lm) => lm.y * height;

    const joints = {
      shoulder: isLeft ? landmarks[11] : landmarks[12],
      elbow: isLeft ? landmarks[13] : landmarks[14],
      wrist: isLeft ? landmarks[15] : landmarks[16],
      hip: isLeft ? landmarks[23] : landmarks[24],
      knee: isLeft ? landmarks[25] : landmarks[26],
      ankle: isLeft ? landmarks[27] : landmarks[28]
    };

    let pointA, pointB, pointC, activeJointLabel;
    if (exercise === 'squat') {
      pointA = joints.hip;
      pointB = joints.knee;
      pointC = joints.ankle;
      activeJointLabel = 'KNEE';
    } else if (exercise === 'curl') {
      pointA = joints.shoulder;
      pointB = joints.elbow;
      pointC = joints.wrist;
      activeJointLabel = 'ELBOW';
    } else {
      pointA = joints.hip;
      pointB = joints.shoulder;
      pointC = joints.elbow;
      activeJointLabel = 'SHOULDER';
    }

    const activeLineColor = isOptimal ? '#00FF88' : '#FF3366';
    const activeGlowColor = isOptimal ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 51, 102, 0.5)';

    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Draw General Body Wireframe (Neutral Cyan)
    const connections = [
      [11, 12],
      [11, 23], [12, 24], [23, 24],
      [11, 13], [13, 15],
      [12, 14], [14, 16],
      [23, 25], [25, 27],
      [24, 26], [26, 28]
    ];

    connections.forEach(([i, j]) => {
      const l1 = landmarks[i];
      const l2 = landmarks[j];
      if (l1 && l2 && (l1.visibility || 1) > 0.4 && (l2.visibility || 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(getX(l1), getY(l1));
        ctx.lineTo(getX(l2), getY(l2));
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.stroke();
      }
    });

    // 2. Glowing Active Kinematic Chain
    if (pointA && pointB && pointC) {
      const pxA = getX(pointA);
      const pyA = getY(pointA);
      const pxB = getX(pointB);
      const pyB = getY(pointB);
      const pxC = getX(pointC);
      const pyC = getY(pointC);

      ctx.shadowColor = activeLineColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = activeLineColor;
      ctx.lineWidth = 6;

      ctx.beginPath();
      ctx.moveTo(pxA, pyA);
      ctx.lineTo(pxB, pyB);
      ctx.lineTo(pxC, pyC);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Dynamic Angle Arc — always draw the SHORTER arc
      const radius = 46;
      let angleBA = Math.atan2(pyA - pyB, pxA - pxB);
      let angleBC = Math.atan2(pyC - pyB, pxC - pxB);

      // Normalize angles to [0, 2π)
      if (angleBA < 0) angleBA += 2 * Math.PI;
      if (angleBC < 0) angleBC += 2 * Math.PI;

      // Compute angular difference both ways and pick the shorter arc
      let diff = angleBC - angleBA;
      if (diff < 0) diff += 2 * Math.PI;
      const counterClockwise = diff > Math.PI;

      ctx.beginPath();
      ctx.arc(pxB, pyB, radius, angleBA, angleBC, counterClockwise);
      ctx.strokeStyle = activeGlowColor;
      ctx.lineWidth = 8;
      ctx.stroke();

      // 4. End Nodes
      [{ x: pxA, y: pyA }, { x: pxC, y: pyC }].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = activeLineColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // 5. Active Vertex Joint (B) Pulsing Halo
      ctx.beginPath();
      ctx.arc(pxB, pyB, 10, 0, 2 * Math.PI);
      ctx.fillStyle = activeLineColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 6. Real-Time Angle Badge Adjacent to Vertex Joint
      const badgeW = 75;
      const badgeH = 28;
      let badgeX = isMirrored
        ? (isLeft ? pxB + 20 : pxB - badgeW - 20)
        : (isLeft ? pxB - badgeW - 20 : pxB + 20);
      badgeX = Math.max(10, Math.min(width - badgeW - 10, badgeX));
      const badgeY = Math.max(10, Math.min(height - badgeH - 10, pyB - 18));

      ctx.fillStyle = 'rgba(7, 10, 18, 0.88)';
      ctx.strokeStyle = activeLineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`${Math.round(currentAngle)}°`, badgeX + 8, badgeY + 19);

      ctx.fillStyle = activeLineColor;
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.fillText(activeJointLabel, badgeX + badgeW - 28, badgeY + 18);
    }

    ctx.restore();
  }
}
