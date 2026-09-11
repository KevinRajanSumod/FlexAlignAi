/**
 * FlexAlign AI - Physical Therapy & Rehab Kinematic Motion Generators
 * Generates clinical rehabilitation motion profiles with accurate therapeutic joint ranges.
 */

export const PT_SIM_IDS = [
  'pt_raise',
  'raise',
  'pt_knee_ext',
  'pt_elbow_ext',
  'pt_elbow_flex',
  'slr',
  'clamshell',
  'quadruped',
  'tke',
  'mini_squat',
  'ankle_pumps',
  'prone_cobra'
];

export function isPTExercise(exerciseId) {
  if (!exerciseId) return false;
  const id = exerciseId.toLowerCase();
  return id.startsWith('pt_') || PT_SIM_IDS.includes(id);
}

/**
 * Generate 3D landmarks for physical therapy and rehab exercises
 */
export function generatePTLandmarks(exercise, isFault, cycle, lms, dims) {
  const { shoulderY, hipY, kneeY, ankleY } = dims;

  // 1. SHOULDER LATERAL RAISE / SCAPTION
  if (exercise === 'pt_raise' || exercise === 'raise') {
    const maxAbduction = isFault ? 122 : 85;
    const abductionDeg = 18 + cycle * (maxAbduction - 18);
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
    return true;
  }

  // 2. SEATED KNEE EXTENSION
  if (exercise === 'pt_knee_ext') {
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
    return true;
  }

  // 3. ELBOW EXTENSION REHAB
  if (exercise === 'pt_elbow_ext') {
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
    return true;
  }

  // 4. ELBOW FLEXION REHAB
  if (exercise === 'pt_elbow_flex') {
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
    return true;
  }

  return false;
}
