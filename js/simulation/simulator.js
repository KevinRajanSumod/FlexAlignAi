/**
 * FlexAlign AI - Biomechanical Motion Simulation Core
 * Orchestrates kinematic generators for Gym, PT, and Procedural AI-generated movements.
 */

import { getExerciseDefinition } from '../exercises.js';
import { generateGymLandmarks, isGymExercise } from './gym-kinematics.js';
import { generatePTLandmarks, isPTExercise } from './pt-kinematics.js';
import { inferMotionProfile, synthesizeProceduralMotion } from './procedural-kinematics.js';

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

  generateLandmarks(exerciseInput, isFault = false) {
    const exDef = (typeof exerciseInput === 'object' && exerciseInput) ? exerciseInput : getExerciseDefinition(exerciseInput);
    const exercise = (exDef && exDef.id) ? exDef.id : (typeof exerciseInput === 'string' ? exerciseInput : 'gym_squat');

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

    const dims = { shoulderY, hipY, kneeY, ankleY };

    // 1. Check gym exercises
    if (isGymExercise(exercise)) {
      const cycle = this._easedCycle(1.4);
      const handled = generateGymLandmarks(exercise, isFault, cycle, lms, dims);
      if (handled) return this._smooth(lms);
    }

    // 2. Check physical therapy rehab exercises
    if (isPTExercise(exercise)) {
      const cycle = this._easedCycle(1.4);
      const handled = generatePTLandmarks(exercise, isFault, cycle, lms, dims);
      if (handled) return this._smooth(lms);
    }

    // 3. Fallback: Synthesize procedural biomechanical motion for any custom / AI exercise
    const profile = inferMotionProfile(exDef);
    const speed = (profile && profile.tempoSpeed) ? profile.tempoSpeed : 1.4;
    const cycle = this._easedCycle(speed);
    synthesizeProceduralMotion(profile, isFault, cycle, lms, dims);
    return this._smooth(lms);
  }
}
