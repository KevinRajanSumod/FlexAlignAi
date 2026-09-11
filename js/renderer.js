/**
 * FlexAlign AI - HTML5 Canvas Skeletal & HUD Telemetry Renderer
 * High-visibility laser kinematic tracking with ultra-clear error/fault visualization.
 */

export class HUDRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(width, height) {
    const validW = (width && width > 0) ? width : (this.canvas.clientWidth || 1280);
    const validH = (height && height > 0) ? height : (this.canvas.clientHeight || 720);
    if (this.canvas.width !== validW || this.canvas.height !== validH) {
      this.canvas.width = validW;
      this.canvas.height = validH;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(isSimulation, is3DActive = false) {
    if (!isSimulation) return;
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (is3DActive) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    // Clean dark backdrop for 2D mode
    ctx.fillStyle = '#080b14';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(91, 156, 246, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Floor line
    ctx.strokeStyle = 'rgba(91, 156, 246, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.15, height * 0.93);
    ctx.lineTo(width * 0.85, height * 0.93);
    ctx.stroke();

    ctx.fillStyle = 'rgba(161, 161, 181, 0.6)';
    ctx.font = '600 11px "Inter", sans-serif';
    ctx.fillText('SIMULATION ACTIVE', 24, height - 18);
  }

  renderSkeleton(landmarks, side, exercise, currentAngle, isOptimal, isMirrored = false, overlayOnly = false) {
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
    if (exercise === 'gym_squat' || exercise === 'pt_knee_ext' || exercise === 'squat') {
      pointA = joints.hip;
      pointB = joints.knee;
      pointC = joints.ankle;
      activeJointLabel = 'KNEE';
    } else if (exercise === 'gym_curl' || exercise === 'pt_elbow_flex' || exercise === 'curl' || exercise === 'gym_extension' || exercise === 'pt_elbow_ext') {
      pointA = joints.shoulder;
      pointB = joints.elbow;
      pointC = joints.wrist;
      activeJointLabel = 'ELBOW';
    } else if (exercise === 'gym_press') {
      pointA = joints.shoulder;
      pointB = joints.elbow;
      pointC = joints.wrist;
      activeJointLabel = 'ELBOW';
    } else {
      // pt_raise or raise
      pointA = joints.hip;
      pointB = joints.shoulder;
      pointC = joints.elbow;
      activeJointLabel = 'SHOULDER';
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isFault = !isOptimal;

    // 1. Draw Full Body Wireframe (Crisp semi-transparent cyan skeleton)
    if (!overlayOnly) {
      const connections = [
        [11, 12],
        [11, 23], [12, 24], [23, 24],
        [11, 13], [13, 15],
        [12, 14], [14, 16],
        [23, 25], [25, 27],
        [24, 26], [26, 28]
      ];

      ctx.lineWidth = 3;
      ctx.strokeStyle = isFault ? 'rgba(239, 68, 68, 0.35)' : 'rgba(91, 156, 246, 0.45)';

      connections.forEach(([i, j]) => {
        const l1 = landmarks[i];
        const l2 = landmarks[j];
        if (l1 && l2 && (l1.visibility === undefined || l1.visibility > 0.15) && (l2.visibility === undefined || l2.visibility > 0.15)) {
          ctx.beginPath();
          ctx.moveTo(getX(l1), getY(l1));
          ctx.lineTo(getX(l2), getY(l2));
          ctx.stroke();
        }
      });

      // Highlight trunk / spine in vivid red if trunk lean or core arch fault is active
      if (isFault) {
        ctx.save();
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
        ctx.lineWidth = 7;
        
        // Torso left & right pillars
        [[11, 23], [12, 24], [11, 12], [23, 24]].forEach(([i, j]) => {
          const l1 = landmarks[i];
          const l2 = landmarks[j];
          if (l1 && l2) {
            ctx.beginPath();
            ctx.moveTo(getX(l1), getY(l1));
            ctx.lineTo(getX(l2), getY(l2));
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // Subtle skeletal joint dots
      [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(idx => {
        const lm = landmarks[idx];
        if (lm && (lm.visibility === undefined || lm.visibility > 0.15)) {
          ctx.beginPath();
          ctx.arc(getX(lm), getY(lm), 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = isFault ? 'rgba(255, 100, 100, 0.9)' : 'rgba(147, 197, 253, 0.8)';
          ctx.fill();
        }
      });
    }

    // 2. High-Visibility Active Kinematic Chains (Supports both limbs in bilateral motion)
    const isBoth = side === 'both' || side === 'auto';
    const sidesToDraw = isBoth ? ['left', 'right'] : (side === 'right' ? ['right'] : ['left']);

    sidesToDraw.forEach(currentSide => {
      const isL = currentSide === 'left';
      let pA, pB, pC;
      if (exercise === 'gym_squat' || exercise === 'pt_knee_ext' || exercise === 'squat') {
        pA = isL ? landmarks[23] : landmarks[24];
        pB = isL ? landmarks[25] : landmarks[26];
        pC = isL ? landmarks[27] : landmarks[28];
      } else if (exercise === 'gym_curl' || exercise === 'pt_elbow_flex' || exercise === 'curl' || exercise === 'gym_extension' || exercise === 'gym_press' || exercise === 'pt_elbow_ext') {
        pA = isL ? landmarks[11] : landmarks[12];
        pB = isL ? landmarks[13] : landmarks[14];
        pC = isL ? landmarks[15] : landmarks[16];
      } else {
        // pt_raise or raise
        pA = isL ? landmarks[23] : landmarks[24];
        pB = isL ? landmarks[11] : landmarks[12];
        pC = isL ? landmarks[13] : landmarks[14];
      }

      if (pA && pB && pC && (pA.visibility === undefined || pA.visibility > 0.15) && (pB.visibility === undefined || pB.visibility > 0.15) && (pC.visibility === undefined || pC.visibility > 0.15)) {
        this._drawKinematicChain(ctx, pA, pB, pC, isOptimal, getX, getY);
      }
    });

    ctx.restore();
  }

  _drawKinematicChain(ctx, pointA, pointB, pointC, isOptimal, getX, getY) {
    const pxA = getX(pointA);
    const pyA = getY(pointA);
    const pxB = getX(pointB);
    const pyB = getY(pointB);
    const pxC = getX(pointC);
    const pyC = getY(pointC);

    const isFault = !isOptimal;

    if (isFault) {
      // ─────────────────────────────────────────────────────────────
      // ULTRA-CLEAR VIVID RED FAULT / ERROR LINES
      // ─────────────────────────────────────────────────────────────
      ctx.save();
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 26;
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.45)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(pxA, pyA);
      ctx.lineTo(pxB, pyB);
      ctx.lineTo(pxC, pyC);
      ctx.stroke();

      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 9;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();

      // Dynamic Angle Arc
      const radius = 52;
      let angleBA = Math.atan2(pyA - pyB, pxA - pxB);
      let angleBC = Math.atan2(pyC - pyB, pxC - pxB);
      if (angleBA < 0) angleBA += 2 * Math.PI;
      if (angleBC < 0) angleBC += 2 * Math.PI;
      let diff = angleBC - angleBA;
      if (diff < 0) diff += 2 * Math.PI;
      const counterClockwise = diff > Math.PI;

      ctx.beginPath();
      ctx.arc(pxB, pyB, radius, angleBA, angleBC, counterClockwise);
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.75)';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Pulsating Fault Halo
      const t = Date.now() * 0.007;
      const pulseR = 16 + Math.sin(t) * 6;
      ctx.beginPath();
      ctx.arc(pxB, pyB, pulseR, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pxB, pyB, 11, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff1744';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // End Nodes
      [{ x: pxA, y: pyA }, { x: pxC, y: pyC }].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff1744';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

    } else {
      // ─────────────────────────────────────────────────────────────
      // OPTIMAL ACTIVE GREEN/CYAN LASER LINES
      // ─────────────────────────────────────────────────────────────
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(pxA, pyA);
      ctx.lineTo(pxB, pyB);
      ctx.lineTo(pxC, pyC);
      ctx.stroke();

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 7;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Angle Arc
      const radius = 48;
      let angleBA = Math.atan2(pyA - pyB, pxA - pxB);
      let angleBC = Math.atan2(pyC - pyB, pxC - pxB);
      if (angleBA < 0) angleBA += 2 * Math.PI;
      if (angleBC < 0) angleBC += 2 * Math.PI;
      let diff = angleBC - angleBA;
      if (diff < 0) diff += 2 * Math.PI;
      const counterClockwise = diff > Math.PI;

      ctx.beginPath();
      ctx.arc(pxB, pyB, radius, angleBA, angleBC, counterClockwise);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Joint Vertex Node
      ctx.beginPath();
      ctx.arc(pxB, pyB, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // End Nodes
      [{ x: pxA, y: pyA }, { x: pxC, y: pyC }].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });
    }

    ctx.restore();
  }
}
