/**
 * FlexAlign AI - Virtual Biomechanical Motion Simulator
 * Generates smooth sinusoidal 2D landmark trajectories for testing & offline evaluation.
 */

export class MotionSimulator {
  constructor() {
    this.step = 0;
  }

  generateLandmarks(exercise, isFault = false) {
    this.step += 0.035;
    const t = this.step;

    // Base standing skeleton (33 MediaPipe landmarks initialized)
    const lms = new Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));

    const shoulderY = 0.28;
    const hipY = 0.52;
    const kneeY = 0.72;
    const ankleY = 0.90;

    lms[11] = { x: 0.44, y: shoulderY, z: 0, visibility: 0.95 }; // left shoulder
    lms[12] = { x: 0.56, y: shoulderY, z: 0, visibility: 0.95 }; // right shoulder
    lms[23] = { x: 0.46, y: hipY, z: 0, visibility: 0.95 };      // left hip
    lms[24] = { x: 0.54, y: hipY, z: 0, visibility: 0.95 };      // right hip

    if (exercise === 'squat') {
      const cycle = (Math.sin(t) + 1) / 2; // 0 (stand) to 1 (depth)
      const squatDrop = cycle * 0.20;

      lms[23].y = hipY + squatDrop;
      lms[24].y = hipY + squatDrop;
      lms[11].y = shoulderY + squatDrop;
      lms[12].y = shoulderY + squatDrop;

      const kneeBendX = cycle * 0.11;
      lms[25] = { x: 0.46 - kneeBendX, y: kneeY + squatDrop * 0.5, z: 0, visibility: 0.95 };
      lms[26] = { x: 0.54 + kneeBendX, y: kneeY + squatDrop * 0.5, z: 0, visibility: 0.95 };

      lms[27] = { x: 0.46, y: ankleY, z: 0, visibility: 0.95 };
      lms[28] = { x: 0.54, y: ankleY, z: 0, visibility: 0.95 };

      lms[13] = { x: 0.38, y: shoulderY + squatDrop + 0.08, z: 0, visibility: 0.9 };
      lms[14] = { x: 0.62, y: shoulderY + squatDrop + 0.08, z: 0, visibility: 0.9 };
      lms[15] = { x: 0.34, y: shoulderY + squatDrop + 0.06, z: 0, visibility: 0.9 };
      lms[16] = { x: 0.66, y: shoulderY + squatDrop + 0.06, z: 0, visibility: 0.9 };

    } else if (exercise === 'curl') {
      const cycle = (Math.sin(t) + 1) / 2;
      const elbowY = 0.44;

      lms[13] = { x: 0.42, y: elbowY, z: 0, visibility: 0.95 };
      lms[14] = { x: 0.58, y: elbowY, z: 0, visibility: 0.95 };

      const wristY = 0.60 - cycle * 0.30;
      const wristXOffset = cycle * 0.04;

      lms[15] = { x: 0.42 - wristXOffset, y: wristY, z: 0, visibility: 0.95 };
      lms[16] = { x: 0.58 + wristXOffset, y: wristY, z: 0, visibility: 0.95 };

      lms[25] = { x: 0.46, y: kneeY, z: 0, visibility: 0.95 };
      lms[26] = { x: 0.54, y: kneeY, z: 0, visibility: 0.95 };
      lms[27] = { x: 0.46, y: ankleY, z: 0, visibility: 0.95 };
      lms[28] = { x: 0.54, y: ankleY, z: 0, visibility: 0.95 };

    } else {
      // Lateral Raise
      const cycle = (Math.sin(t) + 1) / 2;
      const maxRaise = isFault ? 116 : 92;
      const raiseDeg = 15 + cycle * (maxRaise - 15);
      const rad = (raiseDeg * Math.PI) / 180;
      const armLen = 0.22;

      lms[13] = {
        x: 0.44 - Math.sin(rad) * (armLen * 0.5),
        y: shoulderY + Math.cos(rad) * (armLen * 0.5),
        z: 0,
        visibility: 0.95
      };
      lms[15] = {
        x: 0.44 - Math.sin(rad) * armLen,
        y: shoulderY + Math.cos(rad) * armLen,
        z: 0,
        visibility: 0.95
      };

      lms[14] = {
        x: 0.56 + Math.sin(rad) * (armLen * 0.5),
        y: shoulderY + Math.cos(rad) * (armLen * 0.5),
        z: 0,
        visibility: 0.95
      };
      lms[16] = {
        x: 0.56 + Math.sin(rad) * armLen,
        y: shoulderY + Math.cos(rad) * armLen,
        z: 0,
        visibility: 0.95
      };

      lms[25] = { x: 0.46, y: kneeY, z: 0, visibility: 0.95 };
      lms[26] = { x: 0.54, y: kneeY, z: 0, visibility: 0.95 };
      lms[27] = { x: 0.46, y: ankleY, z: 0, visibility: 0.95 };
      lms[28] = { x: 0.54, y: ankleY, z: 0, visibility: 0.95 };
    }

    return lms;
  }
}
