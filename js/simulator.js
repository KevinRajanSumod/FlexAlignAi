/**
 * FlexAlign AI - Virtual Biomechanical Motion Simulator
 * Generates distinct, realistic 3D landmark trajectories tailored specifically
 * to Gym and Physical Therapy exercises with authentic anatomical kinematics.
 *
 * v3 — Frame-rate-independent, smooth eased motion with accurate fault/non-fault
 *       separation that matches evaluator thresholds exactly.
 */

import { getExerciseDefinition } from './exercises.js';

export const SIMULATION_EXERCISES = [
  'gym_squat',
  'gym_curl',
  'gym_extension',
  'gym_press',
  'pt_raise',
  'pt_knee_ext',
  'pt_elbow_ext',
  'pt_elbow_flex'
];

export class MotionSimulator {
  constructor() {
    this._startTime = performance.now();
    this._prevLandmarks = null;       // for smoothing
    this._smoothFactor = 0.25;        // how much of new value to blend (0=frozen, 1=no smoothing)
  }

  /**
   * Smooth ease-in-out cycle value [0..1..0] with natural deceleration at endpoints.
   * speed: radians per second of the underlying sin wave
   */
  _easedCycle(speed = 1.6) {
    const elapsed = (performance.now() - this._startTime) / 1000;
    // Raw sine: oscillates -1..1  →  mapped to 0..1
    const raw = (Math.sin(elapsed * speed) + 1) / 2;
    // Apply smoothstep easing for natural deceleration at endpoints
    return raw * raw * (3 - 2 * raw);
  }

  /**
   * Lerp-smooth a full landmark array against the previous frame.
   */
  _smooth(lms) {
    if (!this._prevLandmarks) {
      this._prevLandmarks = lms.map(l => ({ ...l }));
      return lms;
    }
    const factor = this._smoothFactor;
    for (let i = 0; i < lms.length; i++) {
      if (!lms[i] || !this._prevLandmarks[i]) continue;
      lms[i].x = this._prevLandmarks[i].x + (lms[i].x - this._prevLandmarks[i].x) * factor;
      lms[i].y = this._prevLandmarks[i].y + (lms[i].y - this._prevLandmarks[i].y) * factor;
      lms[i].z = this._prevLandmarks[i].z + (lms[i].z - this._prevLandmarks[i].z) * factor;
    }
    this._prevLandmarks = lms.map(l => ({ ...l }));
    return lms;
  }

  generateLandmarks(exercise, isFault = false) {
    // Base humanoid skeleton (33 MediaPipe landmarks)
    const lms = new Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.98 }));

    const shoulderY = 0.28;
    const hipY = 0.52;
    const kneeY = 0.72;
    const ankleY = 0.90;

    // Default base pose
    lms[0]  = { x: 0.50, y: 0.16, z: 0, visibility: 0.98 }; // nose
    lms[11] = { x: 0.43, y: shoulderY, z: 0, visibility: 0.98 }; // left shoulder
    lms[12] = { x: 0.57, y: shoulderY, z: 0, visibility: 0.98 }; // right shoulder
    lms[23] = { x: 0.44, y: hipY, z: 0, visibility: 0.98 };      // left hip
    lms[24] = { x: 0.56, y: hipY, z: 0, visibility: 0.98 };      // right hip
    lms[25] = { x: 0.43, y: kneeY, z: 0, visibility: 0.98 };     // left knee
    lms[26] = { x: 0.57, y: kneeY, z: 0, visibility: 0.98 };     // right knee
    lms[27] = { x: 0.43, y: ankleY, z: 0, visibility: 0.98 };    // left ankle
    lms[28] = { x: 0.57, y: ankleY, z: 0, visibility: 0.98 };    // right ankle
    lms[13] = { x: 0.41, y: 0.47, z: 0, visibility: 0.98 };      // left elbow
    lms[14] = { x: 0.59, y: 0.47, z: 0, visibility: 0.98 };      // right elbow
    lms[15] = { x: 0.41, y: 0.67, z: 0, visibility: 0.98 };      // left wrist
    lms[16] = { x: 0.59, y: 0.67, z: 0, visibility: 0.98 };      // right wrist

    // ─────────────────────────────────────────────────────────────
    // 1. GYM MODE: BODYWEIGHT SQUAT
    //    Evaluator thresholds: torsoLean > 35°, kneeValgus > 0.04
    //    Rep counted when angle <= 95° then returns > 160°
    // ─────────────────────────────────────────────────────────────
    if (exercise === 'gym_squat' || exercise === 'squat') {
      const cycle = this._easedCycle(1.4); // ~2.2s per half-cycle
      const depthFactor = isFault ? 0.12 : 0.22;
      const squatDrop = cycle * depthFactor;

      // OPTIMAL: hipZ stays tiny (< 0.06) so torsoLean angle stays < 15°
      // FAULT: large hipZ (-0.22) + large trunkLeanZ (0.28) → torsoLean > 40°
      const hipZ = isFault ? (-0.22 * cycle) : (-0.04 * cycle);
      lms[23] = { x: 0.44, y: hipY + squatDrop, z: hipZ, visibility: 0.98 };
      lms[24] = { x: 0.56, y: hipY + squatDrop, z: hipZ, visibility: 0.98 };

      // Shoulder Z: OPTIMAL keeps near 0, FAULT pushes far forward
      const trunkLeanZ = isFault ? (0.28 * cycle) : (0.01 * cycle);
      const torsoY = shoulderY + squatDrop * 0.7;
      lms[11] = { x: 0.43, y: torsoY, z: trunkLeanZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: torsoY, z: trunkLeanZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.16 + squatDrop * 0.7, z: trunkLeanZ, visibility: 0.98 };

      // Knees
      const kneeZ = 0.10 * cycle;
      const kneeYDrop = kneeY + squatDrop * 0.35;
      // FAULT: knee valgus — knees collapse inward beyond 0.04 threshold
      const valgusShift = isFault ? (cycle * 0.08) : 0;
      lms[25] = { x: 0.43 + valgusShift, y: kneeYDrop, z: kneeZ, visibility: 0.98 };
      lms[26] = { x: 0.57 - valgusShift, y: kneeYDrop, z: kneeZ, visibility: 0.98 };

      // Ankles planted
      lms[27] = { x: 0.43, y: ankleY, z: 0, visibility: 0.98 };
      lms[28] = { x: 0.57, y: ankleY, z: 0, visibility: 0.98 };

      // Arms: natural counterbalance
      const armFloatZ = 0.12 * cycle;
      lms[13] = { x: 0.42, y: 0.44 + squatDrop * 0.3, z: armFloatZ * 0.4, visibility: 0.98 };
      lms[14] = { x: 0.58, y: 0.44 + squatDrop * 0.3, z: armFloatZ * 0.4, visibility: 0.98 };
      lms[15] = { x: 0.43, y: 0.58 + squatDrop * 0.1, z: armFloatZ, visibility: 0.98 };
      lms[16] = { x: 0.57, y: 0.58 + squatDrop * 0.1, z: armFloatZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 2. GYM MODE: BICEP CURL (FLEXION TARGET)
    //    Evaluator thresholds: elbowDrift > 32° AND mainAngle < 145,
    //                          torsoLean > 20° AND mainAngle < 145
    //    Rep: mainAngle <= 55 then returns > 155
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'gym_curl' || exercise === 'curl') {
      const cycle = this._easedCycle(1.5);
      const elbowY = 0.47;
      const armLen = 0.21;

      // OPTIMAL: shoulders and hips have z=0, so torsoLean = 0
      // FAULT: shoulder z goes negative (lean back) → torsoLean > 25°
      const leanBackZ = isFault ? (-0.18 * cycle) : 0;
      lms[11] = { x: 0.43, y: shoulderY, z: leanBackZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY, z: leanBackZ, visibility: 0.98 };

      // Upper arm: OPTIMAL stays pinned at z≈0 → elbowDrift angle = ~8° (well under 32°)
      // FAULT: elbow drifts forward in z → hip-shoulder-elbow angle > 35°
      const elbowDriftZ = isFault ? (0.18 * cycle) : 0;
      lms[13] = { x: 0.41, y: elbowY, z: elbowDriftZ, visibility: 0.98 };
      lms[14] = { x: 0.59, y: elbowY, z: elbowDriftZ, visibility: 0.98 };

      // Forearm curl arc:
      // OPTIMAL: 165° → 40° (full ROM, rep counted)
      // FAULT: 165° → 85° (partial ROM, no rep)
      const startAngle = 165;
      const endAngle = isFault ? 85 : 40;
      const angleDeg = startAngle - cycle * (startAngle - endAngle);
      const angleRad = (angleDeg * Math.PI) / 180;

      const wristDispY = Math.cos(Math.PI - angleRad) * armLen;
      const wristDispZ = Math.sin(Math.PI - angleRad) * armLen * 0.9;

      lms[15] = { x: 0.42, y: elbowY + wristDispY, z: elbowDriftZ + wristDispZ, visibility: 0.98 };
      lms[16] = { x: 0.58, y: elbowY + wristDispY, z: elbowDriftZ + wristDispZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 3. GYM MODE: TRICEPS ELBOW EXTENSION (LOCKOUT TARGET)
    //    Evaluator thresholds: shoulderSwing > 16° or flare > 0.28
    //    Rep: mainAngle >= 165 then returns < 85
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'gym_extension') {
      const cycle = this._easedCycle(1.5);
      const elbowY = 0.47;
      const armLen = 0.21;

      // Small torso incline for clearance
      lms[11].z = 0.02;
      lms[12].z = 0.02;

      // Upper arm: OPTIMAL keeps z ≈ 0.02
      // FAULT: upper arm swings forward (swingZ) + elbows flare out
      const swingZ = isFault ? (0.22 * cycle) : 0;
      const flareX = isFault ? (0.05 * cycle) : 0;
      const elbowBaseZ = 0.02;
      lms[13] = { x: 0.41 - flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };
      lms[14] = { x: 0.59 + flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };

      // Extension arc:
      // OPTIMAL: 70° → 172° (full lockout, rep counted)
      // FAULT: 70° → 135° (incomplete, no rep)
      const maxExtDeg = isFault ? 135 : 172;
      const extDeg = 70 + cycle * (maxExtDeg - 70);
      const extRad = (extDeg * Math.PI) / 180;

      const wristDispY = Math.cos(Math.PI - extRad) * armLen;
      const wristDispZ = Math.sin(Math.PI - extRad) * armLen * 0.9;

      lms[15] = { x: 0.41 - flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };
      lms[16] = { x: 0.59 + flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 4. GYM MODE: OVERHEAD PRESS
    //    Evaluator thresholds: torsoLean > 15°
    //    Rep: mainAngle >= 155 then returns < 90
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'gym_press') {
      const cycle = this._easedCycle(1.3);

      // OPTIMAL: shoulders z=0, hips z=0 → torsoLean=0
      // FAULT: shoulder leans back, hips push forward → torsoLean > 20°
      const archZ = isFault ? (-0.22 * cycle) : 0;
      const hipPushZ = isFault ? (0.14 * cycle) : 0;
      lms[11] = { x: 0.43, y: shoulderY, z: archZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY, z: archZ, visibility: 0.98 };
      lms[23].z = hipPushZ;
      lms[24].z = hipPushZ;

      // Press arc: from rack position (~80°) to overhead lockout (~170°)
      const elbowX = 0.35 + cycle * 0.07;
      const elbowYPos = 0.32 - cycle * 0.15;
      const elbowZ = 0.06 * (1 - cycle) + archZ;

      const wristX = 0.39 + cycle * 0.03;
      const wristYPos = 0.22 - cycle * 0.18;
      const wristZ = 0.08 * (1 - cycle) + archZ;

      lms[13] = { x: elbowX, y: elbowYPos, z: elbowZ, visibility: 0.98 };
      lms[15] = { x: wristX, y: wristYPos, z: wristZ, visibility: 0.98 };
      lms[14] = { x: 1 - elbowX, y: elbowYPos, z: elbowZ, visibility: 0.98 };
      lms[16] = { x: 1 - wristX, y: wristYPos, z: wristZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 5. THERAPY MODE: SHOULDER LATERAL RAISE
    //    Evaluator thresholds: mainAngle > safeCeiling (100°)
    //    Rep: mainAngle >= 65 (inflection) then returns < 35
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'pt_raise' || exercise === 'raise') {
      const cycle = this._easedCycle(1.2);
      const maxAbduction = isFault ? 122 : 85;
      const abductionDeg = 18 + cycle * (maxAbduction - 18);
      const rad = (abductionDeg * Math.PI) / 180;
      const armLen = 0.23;

      const scaptionZ = Math.sin(rad) * 0.04;
      const hikeY = isFault ? (-0.04 * cycle) : 0;
      lms[11].y = shoulderY + hikeY;
      lms[12].y = shoulderY + hikeY;

      // Left arm
      lms[13] = { x: 0.43 - Math.sin(rad) * (armLen * 0.5), y: lms[11].y + Math.cos(rad) * (armLen * 0.5), z: scaptionZ * 0.5, visibility: 0.98 };
      lms[15] = { x: 0.43 - Math.sin(rad) * armLen, y: lms[11].y + Math.cos(rad) * armLen, z: scaptionZ, visibility: 0.98 };
      // Right arm
      lms[14] = { x: 0.57 + Math.sin(rad) * (armLen * 0.5), y: lms[12].y + Math.cos(rad) * (armLen * 0.5), z: scaptionZ * 0.5, visibility: 0.98 };
      lms[16] = { x: 0.57 + Math.sin(rad) * armLen, y: lms[12].y + Math.cos(rad) * armLen, z: scaptionZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 6. THERAPY MODE: SEATED KNEE EXTENSION
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'pt_knee_ext') {
      const cycle = this._easedCycle(1.1);
      const seatedHipY = 0.56;
      const seatedKneeY = 0.56;
      const slumpZ = isFault ? (-0.14 * cycle) : 0;

      lms[23] = { x: 0.44, y: seatedHipY, z: -0.18 + slumpZ * 0.5, visibility: 0.98 };
      lms[24] = { x: 0.56, y: seatedHipY, z: -0.18 + slumpZ * 0.5, visibility: 0.98 };
      lms[11] = { x: 0.43, y: 0.30, z: -0.16 + slumpZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: 0.30, z: -0.16 + slumpZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.18, z: -0.16 + slumpZ, visibility: 0.98 };
      lms[13] = { x: 0.42, y: 0.45, z: -0.04, visibility: 0.90 };
      lms[14] = { x: 0.58, y: 0.45, z: -0.04, visibility: 0.90 };
      lms[15] = { x: 0.42, y: 0.52, z: 0.05, visibility: 0.90 };
      lms[16] = { x: 0.58, y: 0.52, z: 0.05, visibility: 0.90 };

      lms[25] = { x: 0.44, y: seatedKneeY, z: 0.06, visibility: 0.98 };
      lms[26] = { x: 0.56, y: seatedKneeY, z: 0.06, visibility: 0.98 };

      const maxExtDeg = isFault ? 176 : 155;
      const extAngleDeg = 90 + cycle * (maxExtDeg - 90);
      const extRad = (extAngleDeg * Math.PI) / 180;
      const shinLen = 0.28;

      const shinRelY = Math.sin(Math.PI - extRad) * shinLen;
      const shinRelZ = Math.cos(Math.PI - extRad) * shinLen;

      lms[27] = { x: 0.44, y: seatedKneeY + shinRelY, z: 0.06 + shinRelZ, visibility: 0.98 };
      lms[28] = { x: 0.56, y: seatedKneeY + shinRelY, z: 0.06 + shinRelZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 7. THERAPY MODE: ELBOW EXTENSION REHAB
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'pt_elbow_ext') {
      const cycle = this._easedCycle(1.0);
      const elbowY = 0.47;
      const armLen = 0.21;

      const swingZ = isFault ? (0.22 * cycle) : 0;
      const flareX = isFault ? (0.05 * cycle) : 0;
      const elbowBaseZ = 0.01;
      lms[13] = { x: 0.41 - flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };
      lms[14] = { x: 0.59 + flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };

      const targetExt = isFault ? 140 : 168;
      const extDeg = 82 + cycle * (targetExt - 82);
      const extRad = (extDeg * Math.PI) / 180;

      const wristDispY = Math.cos(Math.PI - extRad) * armLen;
      const wristDispZ = Math.sin(Math.PI - extRad) * armLen * 0.9;

      lms[15] = { x: 0.41 - flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };
      lms[16] = { x: 0.59 + flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 8. THERAPY MODE: ELBOW FLEXION REHAB
    // ─────────────────────────────────────────────────────────────
    } else if (exercise === 'pt_elbow_flex') {
      const cycle = this._easedCycle(1.0);
      const elbowY = 0.47;
      const armLen = 0.21;

      const swingZ = isFault ? (0.22 * cycle) : 0;
      const flareX = isFault ? (0.05 * cycle) : 0;
      const elbowBaseZ = 0.01;
      lms[13] = { x: 0.41 - flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };
      lms[14] = { x: 0.59 + flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };

      const angleDeg = 162 - cycle * (162 - 82);
      const angleRad = (angleDeg * Math.PI) / 180;

      const wristDispY = Math.cos(Math.PI - angleRad) * armLen;
      const wristDispZ = Math.sin(Math.PI - angleRad) * armLen * 0.9;

      lms[15] = { x: 0.41 - flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };
      lms[16] = { x: 0.59 + flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // 9. UNIVERSAL DYNAMIC AI-GENERATED / CUSTOM EXERCISE SYNTHESIZER
    // ─────────────────────────────────────────────────────────────
    } else {
      const customDef = getExerciseDefinition(exercise) || {};
      this._synthesizeCustomMotion(lms, customDef, isFault, shoulderY, hipY, kneeY, ankleY);
    }

    return this._smooth(lms);
  }

  /**
   * Universal Kinematic Synthesizer:
   * Generates mathematically accurate 3D landmark trajectories for ANY exercise
   * based on its AI-generated kinematic motion profile or inferred biomechanics.
   */
  _synthesizeCustomMotion(lms, customDef, isFault, shoulderY, hipY, kneeY, ankleY) {
    const mp = customDef.motionProfile || this._inferMotionProfile(customDef);
    const posture = (mp.posture || '').toLowerCase();
    const mType = (mp.movementType || '').toLowerCase();
    const name = (customDef.name || '').toLowerCase();
    const id = (customDef.id || '').toLowerCase();
    const tempo = mp.tempoSpeed || 1.3;
    const cycle = this._easedCycle(tempo);
    const isFlexion = customDef.isFlexion !== false;
    let joint = (customDef.jointLabel || 'KNEE').toUpperCase();
    if (joint.includes('GLENOHUMERAL') || joint.includes('DELTOID') || joint.includes('SHOULDER')) joint = 'SHOULDER';
    else if (joint.includes('BICEP') || joint.includes('TRICEP') || joint.includes('ELBOW')) joint = 'ELBOW';
    else if (joint.includes('HIP') || joint.includes('HAMSTRING') || joint.includes('GLUTE') || joint.includes('PELVIS')) joint = 'HIP';
    else if (joint.includes('KNEE') || joint.includes('QUAD') || joint.includes('CALF') || joint.includes('ANKLE')) joint = 'KNEE';

    // ─────────────────────────────────────────────────────────────
    // PATTERN A: PLANK / PUSH-UP / HORIZONTAL PRONE
    // ─────────────────────────────────────────────────────────────
    if (posture === 'plank' || mType === 'pushup' || name.includes('push') || id.includes('push') || (mType === 'press_horizontal' && posture !== 'supine')) {
      const maxDrop = isFault && mp.faultType === 'incomplete_rom' ? 0.05 : 0.12;
      const dropY = cycle * maxDrop;

      // Feet/Toes remain anchored at back near floor
      lms[27] = { x: 0.44, y: 0.89, z: -0.62, visibility: 0.98 };
      lms[28] = { x: 0.56, y: 0.89, z: -0.62, visibility: 0.98 };

      // Hands remain firmly planted on the floor under shoulders
      const handFlare = isFault ? 0.03 : 0.0;
      lms[15] = { x: 0.38 - handFlare, y: 0.90, z: 0.10, visibility: 0.98 };
      lms[16] = { x: 0.62 + handFlare, y: 0.90, z: 0.10, visibility: 0.98 };

      // Shoulders lower down toward hands as chest lowers
      const shY = 0.74 + dropY;
      lms[11] = { x: 0.41, y: shY, z: 0.10, visibility: 0.98 };
      lms[12] = { x: 0.59, y: shY, z: 0.10, visibility: 0.98 };

      // Head aligned ahead of shoulders along spine
      lms[0] = { x: 0.50, y: shY - 0.03, z: 0.20, visibility: 0.98 };

      // Hips: optimal maintains rigid straight line between shoulders and feet.
      // Fault (hip sag): hips collapse downward toward floor breaking the plank line!
      const hipSagY = isFault ? (dropY * 1.5) : (dropY * 0.7);
      lms[23] = { x: 0.44, y: 0.78 + hipSagY, z: -0.16, visibility: 0.98 };
      lms[24] = { x: 0.56, y: 0.78 + hipSagY, z: -0.16, visibility: 0.98 };

      // Knees follow plank line
      lms[25] = { x: 0.44, y: 0.83 + dropY * 0.35, z: -0.38, visibility: 0.98 };
      lms[26] = { x: 0.56, y: 0.83 + dropY * 0.35, z: -0.38, visibility: 0.98 };

      // Elbows: flex backward in Z and flare outward in X as chest lowers
      // High plank: arms straight (~168°). Bottom depth: elbows bent back to ~78°-80°
      const elbowFlareX = isFault ? (0.09 * cycle) : (0.04 * cycle);
      const elbowRetractZ = 0.12 * cycle;
      const elbowY = shY + (0.90 - shY) * 0.5;
      lms[13] = { x: 0.38 - elbowFlareX, y: elbowY, z: 0.10 - elbowRetractZ, visibility: 0.98 };
      lms[14] = { x: 0.62 + elbowFlareX, y: elbowY, z: 0.10 - elbowRetractZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN B: SUPINE (BENCH PRESS, GLUTE BRIDGE, STRAIGHT LEG RAISE)
    // ─────────────────────────────────────────────────────────────
    } else if (posture === 'supine' || name.includes('bench') || name.includes('floor press') || mType === 'bridge' || name.includes('bridge') || name.includes('thrust') || name.includes('slr') || name.includes('straight leg')) {
      const isBridge = mType === 'bridge' || name.includes('bridge') || name.includes('thrust') || name.includes('pelvic');
      const isSlr = mType === 'slr' || name.includes('straight leg') || name.includes('slr');

      if (isBridge) {
        // Glute Bridge / Pelvic Thrust
        const bridgeLift = isFault ? (0.12 * cycle) : (0.22 * cycle);
        lms[0]  = { x: 0.50, y: 0.84, z: 0.38, visibility: 0.98 };
        lms[11] = { x: 0.42, y: 0.84, z: 0.25, visibility: 0.98 };
        lms[12] = { x: 0.58, y: 0.84, z: 0.25, visibility: 0.98 };

        // Hips elevate to full extension (collinear with shoulders and knees)
        lms[23] = { x: 0.44, y: 0.84 - bridgeLift, z: -0.05, visibility: 0.98 };
        lms[24] = { x: 0.56, y: 0.84 - bridgeLift, z: -0.05, visibility: 0.98 };

        // Knees bent ~90°
        lms[25] = { x: 0.43, y: 0.76, z: -0.28, visibility: 0.98 };
        lms[26] = { x: 0.57, y: 0.76, z: -0.28, visibility: 0.98 };

        // Feet flat on ground
        lms[27] = { x: 0.43, y: 0.88, z: -0.34, visibility: 0.98 };
        lms[28] = { x: 0.57, y: 0.88, z: -0.34, visibility: 0.98 };

        // Arms resting by sides on ground
        lms[13] = { x: 0.38, y: 0.86, z: 0.12, visibility: 0.98 };
        lms[14] = { x: 0.62, y: 0.86, z: 0.12, visibility: 0.98 };
        lms[15] = { x: 0.38, y: 0.88, z: -0.02, visibility: 0.98 };
        lms[16] = { x: 0.62, y: 0.88, z: -0.02, visibility: 0.98 };

      } else if (isSlr) {
        // Straight Leg Raise (SLR)
        lms[0]  = { x: 0.50, y: 0.84, z: 0.38, visibility: 0.98 };
        lms[11] = { x: 0.42, y: 0.84, z: 0.25, visibility: 0.98 };
        lms[12] = { x: 0.58, y: 0.84, z: 0.25, visibility: 0.98 };
        lms[23] = { x: 0.44, y: 0.84, z: -0.15, visibility: 0.98 };
        lms[24] = { x: 0.56, y: 0.84, z: -0.15, visibility: 0.98 };

        // Non-working left leg resting on ground
        lms[25] = { x: 0.43, y: 0.84, z: -0.38, visibility: 0.98 };
        lms[27] = { x: 0.43, y: 0.88, z: -0.60, visibility: 0.98 };

        // Active right leg raises with knee locked straight (~45°-60° hip flexion)
        const liftAngleDeg = isFault ? (25 * cycle) : (48 * cycle);
        const rad = (liftAngleDeg * Math.PI) / 180;
        const thighLen = 0.22;
        const shinLen = 0.24;

        const kneeYPos = 0.84 - Math.sin(rad) * thighLen;
        const kneeZPos = -0.15 - Math.cos(rad) * thighLen;
        lms[26] = { x: 0.57, y: kneeYPos, z: kneeZPos, visibility: 0.98 };

        // Knee lag fault if isFault
        const kneeBend = isFault ? 0.06 : 0;
        const ankleYPos = kneeYPos - Math.sin(rad) * shinLen + kneeBend;
        const ankleZPos = kneeZPos - Math.cos(rad) * shinLen;
        lms[28] = { x: 0.57, y: ankleYPos, z: ankleZPos, visibility: 0.98 };

        // Arms resting by sides
        lms[15] = { x: 0.38, y: 0.88, z: 0.05, visibility: 0.98 };
        lms[16] = { x: 0.62, y: 0.88, z: 0.05, visibility: 0.98 };

      } else {
        // Bench Press / Floor Press
        const startAngle = mp.startAngle || 165;
        const targetAngle = isFault ? 115 : (mp.targetAngle || customDef.defaultTarget || 80);
        const angleDeg = startAngle - cycle * (startAngle - targetAngle);
        const angleRad = (angleDeg * Math.PI) / 180;
        const armLen = 0.20;

        // Torso flat on bench/ground
        lms[0]  = { x: 0.50, y: 0.82, z: 0.40, visibility: 0.98 };
        lms[11] = { x: 0.42, y: 0.82, z: 0.25, visibility: 0.98 };
        lms[12] = { x: 0.58, y: 0.82, z: 0.25, visibility: 0.98 };
        lms[23] = { x: 0.44, y: 0.82, z: -0.15, visibility: 0.98 };
        lms[24] = { x: 0.56, y: 0.82, z: -0.15, visibility: 0.98 };

        // Knees bent, feet on ground
        lms[25] = { x: 0.43, y: 0.74, z: -0.35, visibility: 0.98 };
        lms[26] = { x: 0.57, y: 0.74, z: -0.35, visibility: 0.98 };
        lms[27] = { x: 0.43, y: 0.88, z: -0.45, visibility: 0.98 };
        lms[28] = { x: 0.57, y: 0.88, z: -0.45, visibility: 0.98 };

        // Arms press upward towards ceiling
        const elbowDropZ = 0.12 * cycle;
        const flareX = isFault ? (0.06 * cycle) : 0;
        lms[13] = { x: 0.38 - flareX, y: 0.78, z: 0.25 - elbowDropZ, visibility: 0.98 };
        lms[14] = { x: 0.62 + flareX, y: 0.78, z: 0.25 - elbowDropZ, visibility: 0.98 };

        const wristElev = Math.sin(angleRad) * armLen;
        lms[15] = { x: 0.40, y: 0.78 - wristElev, z: 0.25, visibility: 0.98 };
        lms[16] = { x: 0.60, y: 0.78 - wristElev, z: 0.25, visibility: 0.98 };
      }

    // ─────────────────────────────────────────────────────────────
    // PATTERN B2: QUADRUPED (ALL-FOURS: BIRD DOG, CAT-COW)
    // ─────────────────────────────────────────────────────────────
    } else if (posture === 'quadruped' || mType === 'quadruped_reach' || mType === 'spinal_flexion' || name.includes('bird dog') || name.includes('cat cow') || name.includes('cat-cow')) {
      const isCatCow = mType === 'spinal_flexion' || name.includes('cat');

      // Hands planted firmly on floor under shoulders
      lms[15] = { x: 0.40, y: 0.90, z: 0.15, visibility: 0.98 };
      lms[16] = { x: 0.60, y: 0.90, z: 0.15, visibility: 0.98 };
      lms[13] = { x: 0.40, y: 0.81, z: 0.15, visibility: 0.98 };
      lms[14] = { x: 0.60, y: 0.81, z: 0.15, visibility: 0.98 };

      // Knees planted on floor under hips
      lms[25] = { x: 0.43, y: 0.90, z: -0.25, visibility: 0.98 };
      lms[26] = { x: 0.57, y: 0.90, z: -0.25, visibility: 0.98 };
      lms[27] = { x: 0.43, y: 0.90, z: -0.48, visibility: 0.98 };
      lms[28] = { x: 0.57, y: 0.90, z: -0.48, visibility: 0.98 };

      if (isCatCow) {
        // Cat-Cow: spine flexes up (Cat) and extends down (Cow)
        const archY = (cycle - 0.5) * 0.14;
        lms[11] = { x: 0.41, y: 0.72 - archY * 0.5, z: 0.15, visibility: 0.98 };
        lms[12] = { x: 0.59, y: 0.72 - archY * 0.5, z: 0.15, visibility: 0.98 };
        lms[23] = { x: 0.43, y: 0.72 - archY * 0.5, z: -0.25, visibility: 0.98 };
        lms[24] = { x: 0.57, y: 0.72 - archY * 0.5, z: -0.25, visibility: 0.98 };
        lms[0]  = { x: 0.50, y: 0.69 + archY * 1.2, z: 0.28, visibility: 0.98 }; // head drops in Cat, lifts in Cow

      } else {
        // Bird Dog: Opposite arm and leg reach out parallel to floor
        const reach = cycle * 0.95;
        const pelvicTwist = isFault ? (cycle * 0.08) : 0;

        lms[11] = { x: 0.41, y: 0.72, z: 0.15, visibility: 0.98 };
        lms[12] = { x: 0.59, y: 0.72, z: 0.15, visibility: 0.98 };
        lms[23] = { x: 0.43, y: 0.72 + pelvicTwist, z: -0.25, visibility: 0.98 };
        lms[24] = { x: 0.57, y: 0.72 - pelvicTwist, z: -0.25, visibility: 0.98 };
        lms[0]  = { x: 0.50, y: 0.70, z: 0.26, visibility: 0.98 };

        // Right arm extends forward
        lms[14] = { x: 0.60, y: 0.81 - 0.10 * reach, z: 0.15 + 0.14 * reach, visibility: 0.98 };
        lms[16] = { x: 0.60, y: 0.90 - 0.20 * reach, z: 0.15 + 0.30 * reach, visibility: 0.98 };

        // Left leg extends backward
        lms[25] = { x: 0.43, y: 0.90 - 0.16 * reach, z: -0.25 - 0.16 * reach, visibility: 0.98 };
        lms[27] = { x: 0.43, y: 0.90 - 0.18 * reach, z: -0.48 - 0.20 * reach, visibility: 0.98 };
      }

    // ─────────────────────────────────────────────────────────────
    // PATTERN B3: PRONE (MCKENZIE EXTENSION, SUPERMAN, COBRA)
    // ─────────────────────────────────────────────────────────────
    } else if (posture === 'prone' || mType === 'prone_extension' || name.includes('mckenzie') || name.includes('cobra') || name.includes('superman')) {
      const isSuperman = name.includes('superman');
      const pressRise = isFault ? (0.12 * cycle) : (0.24 * cycle);

      // Pelvis pinned to floor
      const hipLift = isFault && !isSuperman ? (0.08 * cycle) : 0;
      lms[23] = { x: 0.44, y: 0.88 - hipLift, z: -0.15, visibility: 0.98 };
      lms[24] = { x: 0.56, y: 0.88 - hipLift, z: -0.15, visibility: 0.98 };

      // Legs on floor (or lifted in Superman)
      const legLift = isSuperman ? (0.10 * cycle) : 0;
      lms[25] = { x: 0.43, y: 0.88 - legLift, z: -0.38, visibility: 0.98 };
      lms[26] = { x: 0.57, y: 0.88 - legLift, z: -0.38, visibility: 0.98 };
      lms[27] = { x: 0.43, y: 0.88 - legLift * 1.2, z: -0.60, visibility: 0.98 };
      lms[28] = { x: 0.57, y: 0.88 - legLift * 1.2, z: -0.60, visibility: 0.98 };

      // Chest and shoulders press upward into lumbar extension
      lms[11] = { x: 0.42, y: 0.86 - pressRise, z: 0.15 - pressRise * 0.3, visibility: 0.98 };
      lms[12] = { x: 0.58, y: 0.86 - pressRise, z: 0.15 - pressRise * 0.3, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.82 - pressRise * 1.2, z: 0.24 - pressRise * 0.3, visibility: 0.98 };

      // Hands remain planted on floor under shoulders
      lms[15] = { x: 0.38, y: 0.90, z: 0.16, visibility: 0.98 };
      lms[16] = { x: 0.62, y: 0.90, z: 0.16, visibility: 0.98 };
      lms[13] = { x: 0.38, y: 0.88 - pressRise * 0.5, z: 0.16, visibility: 0.98 };
      lms[14] = { x: 0.62, y: 0.88 - pressRise * 0.5, z: 0.16, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN C: BENT-OVER ROW / HINGED UPPER BODY
    // ─────────────────────────────────────────────────────────────
    } else if ((posture === 'hinged' && (mType === 'row' || name.includes('row') || name.includes('pull'))) || mType === 'row') {
      const torsoPitchZ = 0.28;
      const hipPushZ = -0.22;
      lms[23] = { x: 0.44, y: hipY + 0.06, z: hipPushZ, visibility: 0.98 };
      lms[24] = { x: 0.56, y: hipY + 0.06, z: hipPushZ, visibility: 0.98 };
      lms[11] = { x: 0.43, y: shoulderY + 0.18, z: torsoPitchZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY + 0.18, z: torsoPitchZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.16 + 0.18, z: torsoPitchZ, visibility: 0.98 };

      // Soft knees
      lms[25] = { x: 0.43, y: kneeY - 0.02, z: 0.04, visibility: 0.98 };
      lms[26] = { x: 0.57, y: kneeY - 0.02, z: 0.04, visibility: 0.98 };

      // Row pull: elbows pull back past ribcage
      const pullZ = -0.22 * cycle;
      const pullY = -0.10 * cycle;
      const flareX = isFault ? (0.06 * cycle) : (0.02 * cycle);

      lms[13] = { x: 0.41 - flareX, y: 0.48 + pullY, z: torsoPitchZ + pullZ, visibility: 0.98 };
      lms[14] = { x: 0.59 + flareX, y: 0.48 + pullY, z: torsoPitchZ + pullZ, visibility: 0.98 };
      lms[15] = { x: 0.42, y: 0.66 + pullY * 0.5, z: torsoPitchZ + pullZ * 0.5, visibility: 0.98 };
      lms[16] = { x: 0.58, y: 0.66 + pullY * 0.5, z: torsoPitchZ + pullZ * 0.5, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN D: PULL-UP / CHIN-UP / LAT PULLDOWN
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'pullup' || name.includes('pull-up') || name.includes('pullup') || name.includes('chin-up')) {
      const ascendY = -0.16 * cycle;
      lms[0].y  = 0.16 + ascendY;
      lms[11].y = shoulderY + ascendY;
      lms[12].y = shoulderY + ascendY;
      lms[23].y = hipY + ascendY;
      lms[24].y = hipY + ascendY;
      lms[25].y = kneeY + ascendY;
      lms[26].y = kneeY + ascendY;
      lms[27].y = ankleY + ascendY;
      lms[28].y = ankleY + ascendY;

      // Hands anchored overhead on pull-up bar
      lms[15] = { x: 0.38, y: 0.08, z: 0.06, visibility: 0.98 };
      lms[16] = { x: 0.62, y: 0.08, z: 0.06, visibility: 0.98 };

      // Elbows drive down and back to ribs
      const elbowYPos = 0.22 - ascendY * 0.6;
      lms[13] = { x: 0.34, y: elbowYPos, z: -0.05 * cycle, visibility: 0.98 };
      lms[14] = { x: 0.66, y: elbowYPos, z: -0.05 * cycle, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN E: DIPS
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'dip' || name.includes('dip')) {
      const dipDropY = 0.16 * cycle;
      const torsoLeanZ = 0.08 * cycle;
      lms[11] = { x: 0.43, y: shoulderY + dipDropY, z: torsoLeanZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY + dipDropY, z: torsoLeanZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.16 + dipDropY, z: torsoLeanZ, visibility: 0.98 };
      lms[23] = { x: 0.44, y: hipY + dipDropY, z: torsoLeanZ * 0.8, visibility: 0.98 };
      lms[24] = { x: 0.56, y: hipY + dipDropY, z: torsoLeanZ * 0.8, visibility: 0.98 };

      // Hands fixed on parallel bars
      lms[15] = { x: 0.38, y: 0.58, z: 0.0, visibility: 0.98 };
      lms[16] = { x: 0.62, y: 0.58, z: 0.0, visibility: 0.98 };

      // Elbows flex backward
      const elbowZ = -0.14 * cycle;
      lms[13] = { x: 0.36, y: 0.52 + dipDropY * 0.3, z: elbowZ, visibility: 0.98 };
      lms[14] = { x: 0.64, y: 0.52 + dipDropY * 0.3, z: elbowZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 1: BICEP CURL / FOREARM FLEXION
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'curl' || mp.armPattern === 'bicep_curl' || (joint === 'ELBOW' && isFlexion && !mType.includes('push') && !mType.includes('bench'))) {
      const elbowY = 0.47;
      const armLen = 0.21;
      const leanBackZ = isFault ? (-0.18 * cycle) : 0;
      lms[11] = { x: 0.43, y: shoulderY, z: leanBackZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY, z: leanBackZ, visibility: 0.98 };

      const elbowDriftZ = isFault ? (0.18 * cycle) : 0;
      const flareX = isFault ? (0.05 * cycle) : 0;
      lms[13] = { x: 0.41 - flareX, y: elbowY, z: elbowDriftZ, visibility: 0.98 };
      lms[14] = { x: 0.59 + flareX, y: elbowY, z: elbowDriftZ, visibility: 0.98 };

      const startAngle = mp.startAngle || 165;
      const targetAngle = isFault ? (mp.faultAngle || 85) : (mp.targetAngle || customDef.defaultTarget || 40);
      const angleDeg = startAngle - cycle * (startAngle - targetAngle);
      const angleRad = (angleDeg * Math.PI) / 180;

      const wristDispY = Math.cos(Math.PI - angleRad) * armLen;
      const wristDispZ = Math.sin(Math.PI - angleRad) * armLen * 0.9;

      lms[15] = { x: 0.42 - flareX * 0.5, y: elbowY + wristDispY, z: elbowDriftZ + wristDispZ, visibility: 0.98 };
      lms[16] = { x: 0.58 + flareX * 0.5, y: elbowY + wristDispY, z: elbowDriftZ + wristDispZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 2: TRICEPS PUSHDOWN / LOCKOUT EXTENSION
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'pushdown' || mp.armPattern === 'tricep_pushdown' || (joint === 'ELBOW' && !isFlexion && !mType.includes('press'))) {
      const elbowY = 0.47;
      const armLen = 0.21;
      const swingZ = isFault ? (0.22 * cycle) : 0;
      const flareX = isFault ? (0.06 * cycle) : 0;
      const elbowBaseZ = 0.02;

      lms[13] = { x: 0.41 - flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };
      lms[14] = { x: 0.59 + flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };

      const startAngle = mp.startAngle || 75;
      const maxExtDeg = isFault ? (mp.faultAngle || 135) : (mp.targetAngle || customDef.defaultTarget || 170);
      const extDeg = startAngle + cycle * (maxExtDeg - startAngle);
      const extRad = (extDeg * Math.PI) / 180;

      const wristDispY = Math.cos(Math.PI - extRad) * armLen;
      const wristDispZ = Math.sin(Math.PI - extRad) * armLen * 0.9;

      lms[15] = { x: 0.41 - flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };
      lms[16] = { x: 0.59 + flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 3: OVERHEAD SHOULDER PRESS
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'press_overhead' || mp.armPattern === 'overhead_press' || (customDef.name && customDef.name.toLowerCase().includes('overhead'))) {
      const archZ = isFault ? (-0.22 * cycle) : 0;
      const hipPushZ = isFault ? (0.14 * cycle) : 0;
      lms[11] = { x: 0.43, y: shoulderY, z: archZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY, z: archZ, visibility: 0.98 };
      lms[23].z = hipPushZ;
      lms[24].z = hipPushZ;

      const elbowX = 0.35 + cycle * 0.07;
      const elbowYPos = 0.32 - cycle * 0.15;
      const elbowZ = 0.06 * (1 - cycle) + archZ;

      const wristX = 0.39 + cycle * 0.03;
      const wristYPos = 0.22 - cycle * 0.18;
      const wristZ = 0.08 * (1 - cycle) + archZ;

      lms[13] = { x: elbowX, y: elbowYPos, z: elbowZ, visibility: 0.98 };
      lms[15] = { x: wristX, y: wristYPos, z: wristZ, visibility: 0.98 };
      lms[14] = { x: 1 - elbowX, y: elbowYPos, z: elbowZ, visibility: 0.98 };
      lms[16] = { x: 1 - wristX, y: wristYPos, z: wristZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 4: SHOULDER LATERAL RAISE / ABDUCTION
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'lateral_raise' || mType === 'abduction' || mp.armPattern === 'lateral_raise' || (joint === 'SHOULDER' && !isFlexion && (customDef.name || '').toLowerCase().includes('lateral'))) {
      const maxAbduction = isFault ? (mp.faultAngle || 122) : (mp.targetAngle || customDef.defaultTarget || 85);
      const startDeg = mp.startAngle || 18;
      const abductionDeg = startDeg + cycle * (maxAbduction - startDeg);
      const rad = (abductionDeg * Math.PI) / 180;
      const armLen = 0.23;

      const scaptionZ = Math.sin(rad) * 0.04;
      const hikeY = isFault ? (-0.04 * cycle) : 0;
      lms[11].y = shoulderY + hikeY;
      lms[12].y = shoulderY + hikeY;

      lms[13] = { x: 0.43 - Math.sin(rad) * (armLen * 0.5), y: lms[11].y + Math.cos(rad) * (armLen * 0.5), z: scaptionZ * 0.5, visibility: 0.98 };
      lms[15] = { x: 0.43 - Math.sin(rad) * armLen, y: lms[11].y + Math.cos(rad) * armLen, z: scaptionZ, visibility: 0.98 };
      lms[14] = { x: 0.57 + Math.sin(rad) * (armLen * 0.5), y: lms[12].y + Math.cos(rad) * (armLen * 0.5), z: scaptionZ * 0.5, visibility: 0.98 };
      lms[16] = { x: 0.57 + Math.sin(rad) * armLen, y: lms[12].y + Math.cos(rad) * armLen, z: scaptionZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 5: SHOULDER FRONT RAISE
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'front_raise' || mp.armPattern === 'front_raise') {
      const armLen = 0.23;
      const maxFlexDeg = isFault ? 115 : (mp.targetAngle || 85);
      const startDeg = mp.startAngle || 15;
      const deg = startDeg + cycle * (maxFlexDeg - startDeg);
      const rad = (deg * Math.PI) / 180;
      const leanBackZ = isFault ? (-0.18 * cycle) : 0;

      lms[11].z = leanBackZ;
      lms[12].z = leanBackZ;

      const armY = shoulderY + Math.cos(rad) * armLen;
      const armZ = Math.sin(rad) * armLen;

      lms[13] = { x: 0.43, y: shoulderY + Math.cos(rad) * (armLen * 0.5), z: armZ * 0.5, visibility: 0.98 };
      lms[15] = { x: 0.43, y: armY, z: armZ, visibility: 0.98 };
      lms[14] = { x: 0.57, y: shoulderY + Math.cos(rad) * (armLen * 0.5), z: armZ * 0.5, visibility: 0.98 };
      lms[16] = { x: 0.57, y: armY, z: armZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 7: ROMANIAN DEADLIFT / HIP HINGE
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'hinge_deadlift' || mType === 'hinge' || joint === 'HIP') {
      const hipDrop = (mp.hipDropY !== undefined ? mp.hipDropY : 0.08) * cycle;
      const hipZ = isFault ? (-0.12 * cycle) : (mp.hipHingeZ !== undefined ? mp.hipHingeZ * cycle : -0.24 * cycle);
      const torsoLeanZ = isFault ? (0.42 * cycle) : (0.24 * cycle);

      lms[23] = { x: 0.44, y: hipY + hipDrop, z: hipZ, visibility: 0.98 };
      lms[24] = { x: 0.56, y: hipY + hipDrop, z: hipZ, visibility: 0.98 };

      lms[11] = { x: 0.43, y: shoulderY + 0.18 * cycle, z: torsoLeanZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY + 0.18 * cycle, z: torsoLeanZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.16 + 0.18 * cycle, z: torsoLeanZ, visibility: 0.98 };

      // Soft knees maintained
      const kneeZ = isFault ? (0.16 * cycle) : (0.04 * cycle);
      lms[25] = { x: 0.43, y: kneeY - 0.02 * cycle, z: kneeZ, visibility: 0.98 };
      lms[26] = { x: 0.57, y: kneeY - 0.02 * cycle, z: kneeZ, visibility: 0.98 };

      // Arms skimming down shins
      lms[13] = { x: 0.42, y: 0.48 + 0.16 * cycle, z: torsoLeanZ * 0.7, visibility: 0.98 };
      lms[14] = { x: 0.58, y: 0.48 + 0.16 * cycle, z: torsoLeanZ * 0.7, visibility: 0.98 };
      lms[15] = { x: 0.42, y: 0.68 + 0.15 * cycle, z: torsoLeanZ * 0.8, visibility: 0.98 };
      lms[16] = { x: 0.58, y: 0.68 + 0.15 * cycle, z: torsoLeanZ * 0.8, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 8: BULGARIAN SPLIT SQUAT / LUNGES
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'lunge' || (customDef.name && (customDef.name.toLowerCase().includes('lunge') || customDef.name.toLowerCase().includes('split')))) {
      const squatDrop = cycle * 0.22;
      const torsoLeanZ = isFault ? (0.28 * cycle) : (0.03 * cycle);
      const valgusX = isFault ? (0.05 * cycle) : 0;

      lms[23] = { x: 0.44, y: hipY + squatDrop, z: -0.06 * cycle, visibility: 0.98 };
      lms[24] = { x: 0.56, y: hipY + squatDrop, z: -0.06 * cycle, visibility: 0.98 };

      lms[11] = { x: 0.43, y: shoulderY + squatDrop, z: torsoLeanZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: shoulderY + squatDrop, z: torsoLeanZ, visibility: 0.98 };

      // Lead left leg bends deep
      lms[25] = { x: 0.43 + valgusX, y: kneeY + squatDrop * 0.45, z: 0.14 * cycle, visibility: 0.98 };
      // Rear right leg trails
      lms[26] = { x: 0.57, y: kneeY + squatDrop * 0.85, z: -0.22 * cycle, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 9: STANDING CALF RAISE
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'calf_raise' || (customDef.name && customDef.name.toLowerCase().includes('calf'))) {
      const elevation = cycle * 0.08;
      const swayZ = isFault ? (0.12 * cycle) : 0;

      lms[0].y  = 0.16 - elevation;
      lms[11].y = shoulderY - elevation;
      lms[12].y = shoulderY - elevation;
      lms[23].y = hipY - elevation;
      lms[24].y = hipY - elevation;
      lms[25].y = kneeY - elevation;
      lms[26].y = kneeY - elevation;

      lms[0].z  = swayZ;
      lms[11].z = swayZ;
      lms[12].z = swayZ;

    // ─────────────────────────────────────────────────────────────
    // PATTERN 10: SEATED KNEE EXTENSION
    // ─────────────────────────────────────────────────────────────
    } else if (mType === 'seated_leg_ext' || mp.posture === 'seated' || (customDef.name && customDef.name.toLowerCase().includes('seated'))) {
      const seatedHipY = 0.56;
      const seatedKneeY = 0.56;
      const slumpZ = isFault ? (-0.14 * cycle) : 0;

      lms[23] = { x: 0.44, y: seatedHipY, z: -0.18 + slumpZ * 0.5, visibility: 0.98 };
      lms[24] = { x: 0.56, y: seatedHipY, z: -0.18 + slumpZ * 0.5, visibility: 0.98 };
      lms[11] = { x: 0.43, y: 0.30, z: -0.16 + slumpZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: 0.30, z: -0.16 + slumpZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.18, z: -0.16 + slumpZ, visibility: 0.98 };

      lms[25] = { x: 0.44, y: seatedKneeY, z: 0.06, visibility: 0.98 };
      lms[26] = { x: 0.56, y: seatedKneeY, z: 0.06, visibility: 0.98 };

      const maxExtDeg = isFault ? 176 : (mp.targetAngle || 155);
      const startDeg = mp.startAngle || 90;
      const extAngleDeg = startDeg + cycle * (maxExtDeg - startDeg);
      const extRad = (extAngleDeg * Math.PI) / 180;
      const shinLen = 0.28;

      const shinRelY = Math.sin(Math.PI - extRad) * shinLen;
      const shinRelZ = Math.cos(Math.PI - extRad) * shinLen;

      lms[27] = { x: 0.44, y: seatedKneeY + shinRelY, z: 0.06 + shinRelZ, visibility: 0.98 };
      lms[28] = { x: 0.56, y: seatedKneeY + shinRelY, z: 0.06 + shinRelZ, visibility: 0.98 };

    // ─────────────────────────────────────────────────────────────
    // PATTERN 11: BILATERAL SQUAT (DEFAULT LOWER BODY)
    // ─────────────────────────────────────────────────────────────
    } else {
      const squatDrop = cycle * 0.22;
      const hipZ = isFault ? (-0.22 * cycle) : (-0.04 * cycle);
      lms[23] = { x: 0.44, y: hipY + squatDrop, z: hipZ, visibility: 0.98 };
      lms[24] = { x: 0.56, y: hipY + squatDrop, z: hipZ, visibility: 0.98 };

      const trunkLeanZ = isFault ? (0.28 * cycle) : (0.01 * cycle);
      const torsoY = shoulderY + squatDrop * 0.7;
      lms[11] = { x: 0.43, y: torsoY, z: trunkLeanZ, visibility: 0.98 };
      lms[12] = { x: 0.57, y: torsoY, z: trunkLeanZ, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.16 + squatDrop * 0.7, z: trunkLeanZ, visibility: 0.98 };

      const kneeZ = 0.10 * cycle;
      const kneeYDrop = kneeY + squatDrop * 0.35;
      const valgusShift = isFault ? (cycle * 0.08) : 0;
      lms[25] = { x: 0.43 + valgusShift, y: kneeYDrop, z: kneeZ, visibility: 0.98 };
      lms[26] = { x: 0.57 - valgusShift, y: kneeYDrop, z: kneeZ, visibility: 0.98 };

      lms[27] = { x: 0.43, y: ankleY, z: 0, visibility: 0.98 };
      lms[28] = { x: 0.57, y: ankleY, z: 0, visibility: 0.98 };

      const armFloatZ = 0.12 * cycle;
      lms[13] = { x: 0.42, y: 0.44 + squatDrop * 0.3, z: armFloatZ * 0.4, visibility: 0.98 };
      lms[14] = { x: 0.58, y: 0.44 + squatDrop * 0.3, z: armFloatZ * 0.4, visibility: 0.98 };
      lms[15] = { x: 0.43, y: 0.58 + squatDrop * 0.1, z: armFloatZ, visibility: 0.98 };
      lms[16] = { x: 0.57, y: 0.58 + squatDrop * 0.1, z: armFloatZ, visibility: 0.98 };
    }
  }

  /**
   * Infer motionProfile parameters if an exercise object does not have one
   */
  _inferMotionProfile(customDef) {
    const cd = customDef || {};
    const name = (cd.name || '').toLowerCase();
    const id = (cd.id || '').toLowerCase();
    const joint = (cd.jointLabel || 'KNEE').toUpperCase();
    const isFlex = cd.isFlexion !== false;
    const target = cd.defaultTarget || (isFlex ? 80 : 160);

    if (name.includes('bird dog') || name.includes('cat cow') || name.includes('cat-cow') || id.includes('bird_dog') || id.includes('cat_cow')) {
      const isCat = name.includes('cat');
      return { posture: 'quadruped', movementType: isCat ? 'spinal_flexion' : 'quadruped_reach', primaryJoint: 'HIP', startAngle: isCat ? 160 : 120, targetAngle: isCat ? 135 : 175, tempoSpeed: 1.2 };
    } else if (name.includes('mckenzie') || name.includes('cobra') || name.includes('prone') || name.includes('superman')) {
      return { posture: 'prone', movementType: 'prone_extension', armPattern: 'chest_push', primaryJoint: 'ELBOW', startAngle: 90, targetAngle: target || 160, tempoSpeed: 1.2 };
    } else if (name.includes('bridge') || name.includes('thrust') || name.includes('pelvic')) {
      return { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 110, targetAngle: target || 170, tempoSpeed: 1.2 };
    } else if (name.includes('slr') || name.includes('straight leg')) {
      return { posture: 'supine', movementType: 'slr', primaryJoint: 'HIP', startAngle: 175, targetAngle: target || 135, tempoSpeed: 1.2 };
    } else if (name.includes('push-up') || name.includes('pushup') || id.includes('pushup') || name.includes('press-up')) {
      return { posture: 'plank', movementType: 'pushup', armPattern: 'pushup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 80, tempoSpeed: 1.3 };
    } else if (name.includes('plank') || id.includes('plank')) {
      return { posture: 'plank', movementType: 'plank', armPattern: 'plank', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 165, tempoSpeed: 1.0 };
    } else if (name.includes('bench') || name.includes('chest press') || name.includes('floor press')) {
      return { posture: 'supine', movementType: 'press_horizontal', armPattern: 'bench_press', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 80, tempoSpeed: 1.3 };
    } else if (name.includes('row') || name.includes('pull') && !name.includes('up')) {
      return { posture: 'hinged', movementType: 'row', armPattern: 'row_pull', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 65, tempoSpeed: 1.3 };
    } else if (name.includes('pull-up') || name.includes('pullup') || name.includes('chin-up') || name.includes('chinup')) {
      return { posture: 'standing', movementType: 'pullup', armPattern: 'pullup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 65, tempoSpeed: 1.3 };
    } else if (name.includes('dip')) {
      return { posture: 'standing', movementType: 'dip', armPattern: 'dip', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 85, tempoSpeed: 1.3 };
    } else if (name.includes('curl') || (joint === 'ELBOW' && isFlex && !name.includes('push'))) {
      return { posture: 'standing', movementType: 'curl', armPattern: 'bicep_curl', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 45, tempoSpeed: 1.4 };
    } else if (name.includes('tricep') || name.includes('pushdown') || (joint === 'ELBOW' && !isFlex)) {
      return { posture: 'standing', movementType: 'pushdown', armPattern: 'tricep_pushdown', primaryJoint: 'ELBOW', startAngle: 75, targetAngle: target || 165, tempoSpeed: 1.3 };
    } else if (name.includes('press') && (name.includes('overhead') || name.includes('shoulder') || name.includes('military'))) {
      return { posture: 'standing', movementType: 'press_overhead', armPattern: 'overhead_press', primaryJoint: 'ELBOW', startAngle: 80, targetAngle: target || 165, tempoSpeed: 1.3 };
    } else if (name.includes('lateral') || name.includes('raise') || (joint === 'SHOULDER' && !isFlex)) {
      return { posture: 'standing', movementType: 'lateral_raise', armPattern: 'lateral_raise', primaryJoint: 'SHOULDER', startAngle: 18, targetAngle: target || 85, tempoSpeed: 1.2 };
    } else if (name.includes('front') && name.includes('raise')) {
      return { posture: 'standing', movementType: 'front_raise', armPattern: 'front_raise', primaryJoint: 'SHOULDER', startAngle: 15, targetAngle: target || 85, tempoSpeed: 1.2 };
    } else if (name.includes('deadlift') || name.includes('rdl') || name.includes('hinge') || joint === 'HIP') {
      return { posture: 'hinged', movementType: 'hinge_deadlift', primaryJoint: 'HIP', startAngle: 175, targetAngle: target || 75, tempoSpeed: 1.3 };
    } else if (name.includes('lunge') || name.includes('split') || name.includes('step')) {
      return { posture: 'lunge', movementType: 'lunge', armPattern: 'counterbalance', primaryJoint: 'KNEE', startAngle: 170, targetAngle: target || 85, tempoSpeed: 1.4 };
    } else if (name.includes('calf')) {
      return { posture: 'standing', movementType: 'calf_raise', primaryJoint: 'KNEE', startAngle: 160, targetAngle: 180, tempoSpeed: 1.2 };
    } else if (name.includes('seated')) {
      return { posture: 'seated', movementType: 'seated_leg_ext', primaryJoint: 'KNEE', startAngle: 90, targetAngle: target || 160, tempoSpeed: 1.2 };
    } else {
      return { posture: 'standing', movementType: 'squat', armPattern: 'counterbalance', primaryJoint: 'KNEE', startAngle: 175, targetAngle: target || 90, tempoSpeed: 1.4 };
    }
  }
}


