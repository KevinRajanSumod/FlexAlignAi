/**
 * FlexAlign AI - Gym Mode Kinematic Motion Generators
 * Generates anatomically accurate 3D landmark trajectories for gym strength exercises.
 */

export const GYM_SIM_IDS = [
  'gym_squat',
  'squat',
  'gym_curl',
  'curl',
  'gym_extension',
  'gym_press',
  'gym_rdl',
  'rdl',
  'gym_reverse_lunge',
  'reverse_lunge',
  'gym_goblet_squat',
  'goblet_squat',
  'gym_lat_raise',
  'lateral_raise',
  'gym_pushup',
  'pushup',
  'gym_glute_bridge',
  'glute_bridge'
];

export function isGymExercise(exerciseId) {
  if (!exerciseId) return false;
  const id = exerciseId.toLowerCase();
  return id.startsWith('gym_') || GYM_SIM_IDS.includes(id);
}

/**
 * Generate 3D landmarks for gym exercises
 */
export function generateGymLandmarks(exercise, isFault, cycle, lms, dims) {
  const { shoulderY, hipY, kneeY, ankleY } = dims;

  // 1. BODYWEIGHT SQUAT
  if (exercise === 'gym_squat' || exercise === 'squat') {
    const depthFactor = isFault ? 0.12 : 0.22;
    const squatDrop = cycle * depthFactor;
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
    return true;
  }

  // 2. BICEP CURL
  if (exercise === 'gym_curl' || exercise === 'curl') {
    const elbowY = 0.47;
    const armLen = 0.21;
    const leanBackZ = isFault ? (-0.18 * cycle) : 0;
    lms[11] = { x: 0.43, y: shoulderY, z: leanBackZ, visibility: 0.98 };
    lms[12] = { x: 0.57, y: shoulderY, z: leanBackZ, visibility: 0.98 };

    const elbowDriftZ = isFault ? (0.18 * cycle) : 0;
    lms[13] = { x: 0.41, y: elbowY, z: elbowDriftZ, visibility: 0.98 };
    lms[14] = { x: 0.59, y: elbowY, z: elbowDriftZ, visibility: 0.98 };

    const startAngle = 165;
    const endAngle = isFault ? 85 : 40;
    const angleDeg = startAngle - cycle * (startAngle - endAngle);
    const angleRad = (angleDeg * Math.PI) / 180;

    const wristDispY = Math.cos(Math.PI - angleRad) * armLen;
    const wristDispZ = Math.sin(Math.PI - angleRad) * armLen * 0.9;
    lms[15] = { x: 0.42, y: elbowY + wristDispY, z: elbowDriftZ + wristDispZ, visibility: 0.98 };
    lms[16] = { x: 0.58, y: elbowY + wristDispY, z: elbowDriftZ + wristDispZ, visibility: 0.98 };
    return true;
  }

  // 3. TRICEPS ELBOW EXTENSION
  if (exercise === 'gym_extension') {
    const elbowY = 0.47;
    const armLen = 0.21;
    lms[11].z = 0.02;
    lms[12].z = 0.02;

    const swingZ = isFault ? (0.22 * cycle) : 0;
    const flareX = isFault ? (0.05 * cycle) : 0;
    const elbowBaseZ = 0.02;
    lms[13] = { x: 0.41 - flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };
    lms[14] = { x: 0.59 + flareX, y: elbowY, z: elbowBaseZ + swingZ, visibility: 0.98 };

    const maxExtDeg = isFault ? 135 : 172;
    const extDeg = 70 + cycle * (maxExtDeg - 70);
    const extRad = (extDeg * Math.PI) / 180;

    const wristDispY = Math.cos(Math.PI - extRad) * armLen;
    const wristDispZ = Math.sin(Math.PI - extRad) * armLen * 0.9;
    lms[15] = { x: 0.41 - flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };
    lms[16] = { x: 0.59 + flareX, y: elbowY + wristDispY, z: elbowBaseZ + swingZ + wristDispZ, visibility: 0.98 };
    return true;
  }

  // 4. OVERHEAD PRESS
  if (exercise === 'gym_press') {
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
    return true;
  }

  // 5. ROMANIAN DEADLIFT (RDL)
  if (exercise === 'gym_rdl' || exercise === 'rdl') {
    const hipHingeBackZ = isFault ? (-0.08 * cycle) : (-0.22 * cycle);
    const hipDrop = 0.04 * cycle;
    lms[23] = { x: 0.44, y: hipY + hipDrop, z: hipHingeBackZ, visibility: 0.98 };
    lms[24] = { x: 0.56, y: hipY + hipDrop, z: hipHingeBackZ, visibility: 0.98 };

    const hingeAngle = cycle * (isFault ? 1.45 : 1.25);
    const torsoLen = 0.24;
    const dY = -torsoLen * Math.cos(hingeAngle);
    const dZ = torsoLen * Math.sin(hingeAngle);

    const torsoY = (hipY + hipDrop) + dY;
    const torsoZ = hipHingeBackZ + dZ;

    lms[11] = { x: 0.43, y: torsoY, z: torsoZ, visibility: 0.98 };
    lms[12] = { x: 0.57, y: torsoY, z: torsoZ, visibility: 0.98 };
    lms[0]  = { x: 0.50, y: torsoY - 0.12, z: torsoZ + 0.02, visibility: 0.98 };

    const kneeSoftZ = 0.04 * cycle;
    lms[25] = { x: 0.43, y: kneeY + 0.01 * cycle, z: kneeSoftZ, visibility: 0.98 };
    lms[26] = { x: 0.57, y: kneeY + 0.01 * cycle, z: kneeSoftZ, visibility: 0.98 };
    lms[27] = { x: 0.43, y: ankleY, z: 0, visibility: 0.98 };
    lms[28] = { x: 0.57, y: ankleY, z: 0, visibility: 0.98 };

    const barY = torsoY + 0.28;
    lms[13] = { x: 0.42, y: torsoY + 0.15, z: torsoZ * 0.7, visibility: 0.98 };
    lms[14] = { x: 0.58, y: torsoY + 0.15, z: torsoZ * 0.7, visibility: 0.98 };
    lms[15] = { x: 0.42, y: barY, z: torsoZ * 0.85, visibility: 0.98 };
    lms[16] = { x: 0.58, y: barY, z: torsoZ * 0.85, visibility: 0.98 };
    return true;
  }

  // 6. REVERSE LUNGE
  if (exercise === 'gym_reverse_lunge' || exercise === 'reverse_lunge') {
    const drop = cycle * 0.20;
    const torsoLeanZ = isFault ? (0.24 * cycle) : (0.02 * cycle);
    lms[23] = { x: 0.44, y: hipY + drop, z: -0.06 * cycle, visibility: 0.98 };
    lms[24] = { x: 0.56, y: hipY + drop, z: -0.06 * cycle, visibility: 0.98 };
    lms[11] = { x: 0.43, y: shoulderY + drop, z: torsoLeanZ, visibility: 0.98 };
    lms[12] = { x: 0.57, y: shoulderY + drop, z: torsoLeanZ, visibility: 0.98 };
    lms[0]  = { x: 0.50, y: 0.16 + drop, z: torsoLeanZ, visibility: 0.98 };

    lms[25] = { x: 0.43, y: kneeY + drop * 0.42, z: 0.06 * cycle, visibility: 0.98 };
    lms[27] = { x: 0.43, y: ankleY, z: 0, visibility: 0.98 };

    lms[26] = { x: 0.57, y: kneeY + drop * 0.65, z: -0.16 * cycle, visibility: 0.98 };
    lms[28] = { x: 0.57, y: ankleY - 0.03 * cycle, z: -0.28 * cycle, visibility: 0.98 };

    lms[13] = { x: 0.41, y: shoulderY + drop + 0.20, z: 0, visibility: 0.98 };
    lms[14] = { x: 0.59, y: shoulderY + drop + 0.20, z: 0, visibility: 0.98 };
    lms[15] = { x: 0.41, y: shoulderY + drop + 0.40, z: 0, visibility: 0.98 };
    lms[16] = { x: 0.59, y: shoulderY + drop + 0.40, z: 0, visibility: 0.98 };
    return true;
  }

  // 7. GOBLET SQUAT
  if (exercise === 'gym_goblet_squat' || exercise === 'goblet_squat') {
    const squatDrop = cycle * (isFault ? 0.12 : 0.22);
    const trunkLeanZ = isFault ? (0.24 * cycle) : (0.03 * cycle);
    lms[23] = { x: 0.44, y: hipY + squatDrop, z: -0.04 * cycle, visibility: 0.98 };
    lms[24] = { x: 0.56, y: hipY + squatDrop, z: -0.04 * cycle, visibility: 0.98 };
    const torsoY = shoulderY + squatDrop * 0.8;
    lms[11] = { x: 0.43, y: torsoY, z: trunkLeanZ, visibility: 0.98 };
    lms[12] = { x: 0.57, y: torsoY, z: trunkLeanZ, visibility: 0.98 };
    lms[0]  = { x: 0.50, y: 0.16 + squatDrop * 0.8, z: trunkLeanZ, visibility: 0.98 };

    const kneeZ = 0.09 * cycle;
    const kneeYDrop = kneeY + squatDrop * 0.35;
    const valgusShift = isFault ? (cycle * 0.07) : -0.015 * cycle;
    lms[25] = { x: 0.43 + valgusShift, y: kneeYDrop, z: kneeZ, visibility: 0.98 };
    lms[26] = { x: 0.57 - valgusShift, y: kneeYDrop, z: kneeZ, visibility: 0.98 };
    lms[27] = { x: 0.42, y: ankleY, z: 0, visibility: 0.98 };
    lms[28] = { x: 0.58, y: ankleY, z: 0, visibility: 0.98 };

    const elbowTuck = isFault ? (0.04 * cycle) : 0;
    lms[13] = { x: 0.44 - elbowTuck, y: torsoY + 0.18, z: trunkLeanZ + 0.08, visibility: 0.98 };
    lms[14] = { x: 0.56 + elbowTuck, y: torsoY + 0.18, z: trunkLeanZ + 0.08, visibility: 0.98 };
    lms[15] = { x: 0.48, y: torsoY + 0.07, z: trunkLeanZ + 0.16, visibility: 0.98 };
    lms[16] = { x: 0.52, y: torsoY + 0.07, z: trunkLeanZ + 0.16, visibility: 0.98 };
    return true;
  }

  // 8. LATERAL RAISE
  if (exercise === 'gym_lat_raise' || exercise === 'lateral_raise') {
    const maxAbduction = isFault ? 125 : 90;
    const abductionDeg = 15 + cycle * (maxAbduction - 15);
    const rad = (abductionDeg * Math.PI) / 180;
    const armLen = 0.23;
    const scaptionZ = Math.sin(rad) * 0.04;
    const hikeY = isFault ? (-0.05 * cycle) : 0;
    lms[11].y = shoulderY + hikeY;
    lms[12].y = shoulderY + hikeY;

    lms[13] = { x: 0.43 - Math.sin(rad) * (armLen * 0.5), y: lms[11].y + Math.cos(rad) * (armLen * 0.5), z: scaptionZ * 0.5, visibility: 0.98 };
    lms[15] = { x: 0.43 - Math.sin(rad) * armLen, y: lms[11].y + Math.cos(rad) * armLen, z: scaptionZ, visibility: 0.98 };
    lms[14] = { x: 0.57 + Math.sin(rad) * (armLen * 0.5), y: lms[12].y + Math.cos(rad) * (armLen * 0.5), z: scaptionZ * 0.5, visibility: 0.98 };
    lms[16] = { x: 0.57 + Math.sin(rad) * armLen, y: lms[12].y + Math.cos(rad) * armLen, z: scaptionZ, visibility: 0.98 };
    return true;
  }

  // 9. PUSH-UPS
  if (exercise === 'gym_pushup' || exercise === 'pushup') {
    const maxDrop = isFault ? 0.05 : 0.12;
    const dropY = cycle * maxDrop;
    lms[27] = { x: 0.44, y: 0.89, z: -0.62, visibility: 0.98 };
    lms[28] = { x: 0.56, y: 0.89, z: -0.62, visibility: 0.98 };
    lms[15] = { x: 0.38, y: 0.90, z: 0.10, visibility: 0.98 };
    lms[16] = { x: 0.62, y: 0.90, z: 0.10, visibility: 0.98 };
    const shY = 0.74 + dropY;
    lms[11] = { x: 0.41, y: shY, z: 0.10, visibility: 0.98 };
    lms[12] = { x: 0.59, y: shY, z: 0.10, visibility: 0.98 };
    lms[0]  = { x: 0.50, y: shY - 0.03, z: 0.20, visibility: 0.98 };
    const hipSagY = isFault ? (dropY * 1.5) : (dropY * 0.7);
    lms[23] = { x: 0.44, y: 0.78 + hipSagY, z: -0.16, visibility: 0.98 };
    lms[24] = { x: 0.56, y: 0.78 + hipSagY, z: -0.16, visibility: 0.98 };
    lms[25] = { x: 0.44, y: 0.83 + dropY * 0.35, z: -0.38, visibility: 0.98 };
    lms[26] = { x: 0.56, y: 0.83 + dropY * 0.35, z: -0.38, visibility: 0.98 };
    const elbowFlareX = isFault ? (0.09 * cycle) : (0.04 * cycle);
    const elbowRetractZ = 0.12 * cycle;
    const elbowY = shY + (0.90 - shY) * 0.5;
    lms[13] = { x: 0.38 - elbowFlareX, y: elbowY, z: 0.10 - elbowRetractZ, visibility: 0.98 };
    lms[14] = { x: 0.62 + elbowFlareX, y: elbowY, z: 0.10 - elbowRetractZ, visibility: 0.98 };
    return true;
  }

  // 10. GLUTE BRIDGE
  if (exercise === 'gym_glute_bridge' || exercise === 'glute_bridge') {
    const bridgeLift = isFault ? (0.12 * cycle) : (0.22 * cycle);
    lms[0]  = { x: 0.50, y: 0.84, z: 0.38, visibility: 0.98 };
    lms[11] = { x: 0.42, y: 0.84, z: 0.25, visibility: 0.98 };
    lms[12] = { x: 0.58, y: 0.84, z: 0.25, visibility: 0.98 };
    lms[23] = { x: 0.44, y: 0.84 - bridgeLift, z: -0.05, visibility: 0.98 };
    lms[24] = { x: 0.56, y: 0.84 - bridgeLift, z: -0.05, visibility: 0.98 };
    lms[25] = { x: 0.43, y: 0.76, z: -0.28, visibility: 0.98 };
    lms[26] = { x: 0.57, y: 0.76, z: -0.28, visibility: 0.98 };
    lms[27] = { x: 0.43, y: 0.88, z: -0.34, visibility: 0.98 };
    lms[28] = { x: 0.57, y: 0.88, z: -0.34, visibility: 0.98 };
    lms[13] = { x: 0.38, y: 0.86, z: 0.12, visibility: 0.98 };
    lms[14] = { x: 0.62, y: 0.86, z: 0.12, visibility: 0.98 };
    lms[15] = { x: 0.38, y: 0.88, z: -0.02, visibility: 0.98 };
    lms[16] = { x: 0.62, y: 0.88, z: -0.02, visibility: 0.98 };
    return true;
  }

  return false;
}
