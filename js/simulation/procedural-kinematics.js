/**
 * FlexAlign AI - Procedural Biomechanical Synthesizer
 * Generates 3D landmark trajectories for ANY AI-generated or custom exercise.
 */

export function inferMotionProfile(customDef) {
  const cd = customDef || {};
  const name = (cd.name || '').toLowerCase();
  const id = (cd.id || '').toLowerCase();
  const joint = (cd.jointLabel || 'KNEE').toUpperCase();
  const isFlex = cd.isFlexion !== false;
  const target = cd.defaultTarget || (isFlex ? 80 : 160);

  if (name.includes('pendulum') || id.includes('pendulum')) {
    return { posture: 'hinged', movementType: 'pendulum', primaryJoint: 'SHOULDER', startAngle: 15, targetAngle: 40, tempoSpeed: 1.1 };
  } else if (name.includes('scaption') || id.includes('scaption') || name.includes('full can')) {
    return { posture: 'standing', movementType: 'scaption', primaryJoint: 'SHOULDER', startAngle: 18, targetAngle: 90, tempoSpeed: 1.2 };
  } else if (name.includes('wall angel') || id.includes('wall_angel')) {
    return { posture: 'standing', movementType: 'wall_angels', primaryJoint: 'SHOULDER', startAngle: 90, targetAngle: 150, tempoSpeed: 1.1 };
  } else if (name.includes('clamshell') || id.includes('clamshell')) {
    return { posture: 'side_lying', movementType: 'clamshell', primaryJoint: 'HIP', startAngle: 20, targetAngle: 45, tempoSpeed: 1.2 };
  } else if (name.includes('pelvic tilt') || id.includes('pelvic_tilt')) {
    return { posture: 'supine', movementType: 'pelvic_tilt', primaryJoint: 'HIP', startAngle: 165, targetAngle: 178, tempoSpeed: 1.2 };
  } else if (name.includes('crunch') || id.includes('crunch')) {
    return { posture: 'supine', movementType: 'crunch', primaryJoint: 'HIP', startAngle: 165, targetAngle: 135, tempoSpeed: 1.3 };
  } else if (name.includes('ankle pump') || id.includes('ankle_pump')) {
    return { posture: 'supine', movementType: 'ankle_pump', primaryJoint: 'KNEE', startAngle: 155, targetAngle: 180, tempoSpeed: 1.2 };
  } else if (name.includes('tke') || id.includes('tke') || name.includes('terminal knee')) {
    return { posture: 'standing', movementType: 'tke', primaryJoint: 'KNEE', startAngle: 145, targetAngle: 178, tempoSpeed: 1.3 };
  } else if (name.includes('goblet') || id.includes('goblet')) {
    return { posture: 'standing', movementType: 'goblet_squat', primaryJoint: 'KNEE', startAngle: 175, targetAngle: 85, tempoSpeed: 1.3 };
  } else if (name.includes('rdl') || name.includes('romanian')) {
    return { posture: 'hinged', movementType: 'rdl', primaryJoint: 'HIP', startAngle: 175, targetAngle: 75, tempoSpeed: 1.3 };
  } else if (name.includes('deadlift') && !name.includes('rdl')) {
    return { posture: 'hinged', movementType: 'deadlift', primaryJoint: 'HIP', startAngle: 175, targetAngle: 70, tempoSpeed: 1.3 };
  } else if (name.includes('split squat') || id.includes('split_squat')) {
    return { posture: 'lunge', movementType: 'split_squat', primaryJoint: 'KNEE', startAngle: 170, targetAngle: 85, tempoSpeed: 1.4 };
  } else if (name.includes('walking lunge') || (name.includes('lunge') && !name.includes('reverse') && !name.includes('split'))) {
    return { posture: 'lunge', movementType: 'forward_lunge', primaryJoint: 'KNEE', startAngle: 170, targetAngle: 88, tempoSpeed: 1.4 };
  } else if (name.includes('sumo') || id.includes('sumo')) {
    return { posture: 'standing', movementType: 'sumo_squat', primaryJoint: 'KNEE', startAngle: 175, targetAngle: 90, tempoSpeed: 1.4 };
  } else if (name.includes('good morning') || id.includes('good_morning')) {
    return { posture: 'hinged', movementType: 'good_morning', primaryJoint: 'HIP', startAngle: 175, targetAngle: 80, tempoSpeed: 1.3 };
  } else if (name.includes('reverse lunge') || id.includes('reverse_lunge')) {
    return { posture: 'lunge', movementType: 'reverse_lunge', primaryJoint: 'KNEE', startAngle: 170, targetAngle: 85, tempoSpeed: 1.4 };
  } else if (name.includes('diamond') || id.includes('diamond')) {
    return { posture: 'plank', movementType: 'diamond_pushup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 75, tempoSpeed: 1.3 };
  } else if (name.includes('floor press') || id.includes('floor_press')) {
    return { posture: 'supine', movementType: 'floor_press', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 88, tempoSpeed: 1.3 };
  } else if (name.includes('arnold') || id.includes('arnold')) {
    return { posture: 'standing', movementType: 'arnold_press', primaryJoint: 'ELBOW', startAngle: 80, targetAngle: 168, tempoSpeed: 1.3 };
  } else if (name.includes('hammer') || id.includes('hammer')) {
    return { posture: 'standing', movementType: 'hammer_curl', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 50, tempoSpeed: 1.4 };
  } else if (name.includes('chin-up') || name.includes('chinup') || id.includes('chinup')) {
    return { posture: 'standing', movementType: 'chinup', armPattern: 'pullup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 55, tempoSpeed: 1.3 };
  } else if (name.includes('bird dog') || name.includes('cat cow') || name.includes('cat-cow') || id.includes('bird_dog') || id.includes('cat_cow')) {
    const isCat = name.includes('cat');
    return { posture: 'quadruped', movementType: isCat ? 'spinal_flexion' : 'quadruped_reach', primaryJoint: 'HIP', startAngle: isCat ? 160 : 120, targetAngle: isCat ? 135 : 175, tempoSpeed: 1.2 };
  } else if (name.includes('mckenzie') || name.includes('cobra') || name.includes('prone') || name.includes('superman')) {
    return { posture: 'prone', movementType: 'prone_extension', armPattern: 'chest_push', primaryJoint: 'ELBOW', startAngle: 90, targetAngle: target || 160, tempoSpeed: 1.2 };
  } else if (name.includes('bridge') || name.includes('thrust')) {
    return { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 110, targetAngle: target || 170, tempoSpeed: 1.2 };
  } else if (name.includes('slr') || name.includes('straight leg')) {
    return { posture: 'supine', movementType: 'slr', primaryJoint: 'HIP', startAngle: 175, targetAngle: target || 135, tempoSpeed: 1.2 };
  } else if (name.includes('push-up') || name.includes('pushup') || id.includes('pushup') || name.includes('press-up')) {
    return { posture: 'plank', movementType: 'pushup', armPattern: 'pushup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 80, tempoSpeed: 1.3 };
  } else if (name.includes('plank') || id.includes('plank')) {
    return { posture: 'plank', movementType: 'plank', armPattern: 'plank', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 165, tempoSpeed: 1.0 };
  } else if (name.includes('bench') || name.includes('chest press')) {
    return { posture: 'supine', movementType: 'press_horizontal', armPattern: 'bench_press', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 80, tempoSpeed: 1.3 };
  } else if (name.includes('row') || name.includes('pull') && !name.includes('up')) {
    return { posture: 'hinged', movementType: 'row', armPattern: 'row_pull', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: target || 65, tempoSpeed: 1.3 };
  } else if (name.includes('pull-up') || name.includes('pullup')) {
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

/**
 * Universal Kinematic Synthesizer for procedural motions
 */
export function synthesizeProceduralMotion(lms, customDef, isFault, cycle, dims) {
  const { shoulderY, hipY, kneeY, ankleY } = dims;
  const mp = (customDef && customDef.motionProfile) ? customDef.motionProfile : inferMotionProfile(customDef);
  const posture = (mp.posture || '').toLowerCase();
  const mType = (mp.movementType || '').toLowerCase();
  const name = ((customDef && customDef.name) || '').toLowerCase();
  const id = ((customDef && customDef.id) || '').toLowerCase();
  const isFlexion = customDef ? customDef.isFlexion !== false : true;

  let joint = ((customDef && customDef.jointLabel) || 'KNEE').toUpperCase();
  if (joint.includes('GLENOHUMERAL') || joint.includes('DELTOID') || joint.includes('SHOULDER')) joint = 'SHOULDER';
  else if (joint.includes('BICEP') || joint.includes('TRICEP') || joint.includes('ELBOW')) joint = 'ELBOW';
  else if (joint.includes('HIP') || joint.includes('HAMSTRING') || joint.includes('GLUTE') || joint.includes('PELVIS')) joint = 'HIP';
  else if (joint.includes('KNEE') || joint.includes('QUAD') || joint.includes('CALF') || joint.includes('ANKLE')) joint = 'KNEE';

  // HIGH PLANK HOLD
  if (mType === 'plank' || name.includes('plank')) {
    lms[27] = { x: 0.44, y: 0.89, z: -0.62, visibility: 0.98 };
    lms[28] = { x: 0.56, y: 0.89, z: -0.62, visibility: 0.98 };
    lms[15] = { x: 0.41, y: 0.90, z: 0.10, visibility: 0.98 };
    lms[16] = { x: 0.59, y: 0.90, z: 0.10, visibility: 0.98 };
    const shY = 0.74;
    lms[11] = { x: 0.41, y: shY, z: 0.10, visibility: 0.98 };
    lms[12] = { x: 0.59, y: shY, z: 0.10, visibility: 0.98 };
    lms[0]  = { x: 0.50, y: shY - 0.03, z: 0.20, visibility: 0.98 };
    const hipSag = isFault ? (cycle * 0.10) : 0;
    lms[23] = { x: 0.44, y: 0.78 + hipSag, z: -0.16, visibility: 0.98 };
    lms[24] = { x: 0.56, y: 0.78 + hipSag, z: -0.16, visibility: 0.98 };
    lms[25] = { x: 0.44, y: 0.83, z: -0.38, visibility: 0.98 };
    lms[26] = { x: 0.56, y: 0.83, z: -0.38, visibility: 0.98 };
    lms[13] = { x: 0.40, y: 0.82, z: 0.10, visibility: 0.98 };
    lms[14] = { x: 0.60, y: 0.82, z: 0.10, visibility: 0.98 };
    return;
  }

  // DIAMOND PUSH-UP
  if (mType === 'diamond_pushup' || name.includes('diamond')) {
    const maxDrop = isFault ? 0.06 : 0.12;
    const dropY = cycle * maxDrop;
    lms[27] = { x: 0.44, y: 0.89, z: -0.62, visibility: 0.98 };
    lms[28] = { x: 0.56, y: 0.89, z: -0.62, visibility: 0.98 };
    lms[15] = { x: 0.48, y: 0.90, z: 0.10, visibility: 0.98 };
    lms[16] = { x: 0.52, y: 0.90, z: 0.10, visibility: 0.98 };
    const shY = 0.74 + dropY;
    lms[11] = { x: 0.41, y: shY, z: 0.10, visibility: 0.98 };
    lms[12] = { x: 0.59, y: shY, z: 0.10, visibility: 0.98 };
    lms[0]  = { x: 0.50, y: shY - 0.03, z: 0.20, visibility: 0.98 };
    lms[23] = { x: 0.44, y: 0.78 + dropY * 0.7, z: -0.16, visibility: 0.98 };
    lms[24] = { x: 0.56, y: 0.78 + dropY * 0.7, z: -0.16, visibility: 0.98 };
    lms[25] = { x: 0.44, y: 0.83 + dropY * 0.35, z: -0.38, visibility: 0.98 };
    lms[26] = { x: 0.56, y: 0.83 + dropY * 0.35, z: -0.38, visibility: 0.98 };
    const flareX = isFault ? (0.07 * cycle) : (0.02 * cycle);
    lms[13] = { x: 0.43 - flareX, y: shY + 0.08, z: 0.10 - 0.14 * cycle, visibility: 0.98 };
    lms[14] = { x: 0.57 + flareX, y: shY + 0.08, z: 0.10 - 0.14 * cycle, visibility: 0.98 };
    return;
  }

  // SUPINE BENCH / FLOOR PRESS
  if (posture === 'supine' || mType === 'floor_press' || mType === 'press_horizontal' || name.includes('bench') || name.includes('floor press')) {
    const isFloor = mType === 'floor_press' || name.includes('floor');
    const targetAngle = isFloor ? 90 : (isFault ? 115 : 80);
    const angleDeg = 165 - cycle * (165 - targetAngle);
    const angleRad = (angleDeg * Math.PI) / 180;
    const armLen = 0.20;
    lms[0]  = { x: 0.50, y: 0.82, z: 0.40, visibility: 0.98 };
    lms[11] = { x: 0.42, y: 0.82, z: 0.25, visibility: 0.98 };
    lms[12] = { x: 0.58, y: 0.82, z: 0.25, visibility: 0.98 };
    lms[23] = { x: 0.44, y: 0.82, z: -0.15, visibility: 0.98 };
    lms[24] = { x: 0.56, y: 0.82, z: -0.15, visibility: 0.98 };
    lms[25] = { x: 0.43, y: 0.74, z: -0.35, visibility: 0.98 };
    lms[26] = { x: 0.57, y: 0.74, z: -0.35, visibility: 0.98 };
    lms[27] = { x: 0.43, y: 0.88, z: -0.45, visibility: 0.98 };
    lms[28] = { x: 0.57, y: 0.88, z: -0.45, visibility: 0.98 };
    const elbowDropZ = (isFloor ? 0.08 : 0.12) * cycle;
    const flareX = isFault ? (0.06 * cycle) : 0;
    lms[13] = { x: 0.38 - flareX, y: 0.78, z: 0.25 - elbowDropZ, visibility: 0.98 };
    lms[14] = { x: 0.62 + flareX, y: 0.78, z: 0.25 - elbowDropZ, visibility: 0.98 };
    const wristElev = Math.sin(angleRad) * armLen;
    lms[15] = { x: 0.40, y: 0.78 - wristElev, z: 0.25, visibility: 0.98 };
    lms[16] = { x: 0.60, y: 0.78 - wristElev, z: 0.25, visibility: 0.98 };
    return;
  }

  // QUADRUPED (BIRD DOG / CAT COW)
  if (posture === 'quadruped' || mType === 'quadruped_reach' || mType === 'spinal_flexion' || name.includes('bird dog') || name.includes('cat cow') || name.includes('cat-cow')) {
    lms[15] = { x: 0.40, y: 0.90, z: 0.15, visibility: 0.98 };
    lms[16] = { x: 0.60, y: 0.90, z: 0.15, visibility: 0.98 };
    lms[13] = { x: 0.40, y: 0.81, z: 0.15, visibility: 0.98 };
    lms[14] = { x: 0.60, y: 0.81, z: 0.15, visibility: 0.98 };
    lms[25] = { x: 0.43, y: 0.90, z: -0.25, visibility: 0.98 };
    lms[26] = { x: 0.57, y: 0.90, z: -0.25, visibility: 0.98 };
    lms[27] = { x: 0.43, y: 0.90, z: -0.48, visibility: 0.98 };
    lms[28] = { x: 0.57, y: 0.90, z: -0.48, visibility: 0.98 };

    const isCatCow = mType === 'spinal_flexion' || name.includes('cat');
    if (isCatCow) {
      const archY = (cycle - 0.5) * 0.08;
      lms[11] = { x: 0.42, y: 0.72 - archY * 0.5, z: 0.15, visibility: 0.98 };
      lms[12] = { x: 0.58, y: 0.72 - archY * 0.5, z: 0.15, visibility: 0.98 };
      lms[23] = { x: 0.43, y: 0.72 - archY, z: -0.25, visibility: 0.98 };
      lms[24] = { x: 0.57, y: 0.72 - archY, z: -0.25, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.74 + archY * 0.8, z: 0.28, visibility: 0.98 };
    } else {
      lms[11] = { x: 0.42, y: 0.72, z: 0.15, visibility: 0.98 };
      lms[12] = { x: 0.58, y: 0.72, z: 0.15, visibility: 0.98 };
      lms[23] = { x: 0.43, y: 0.72, z: -0.25, visibility: 0.98 };
      lms[24] = { x: 0.57, y: 0.72, z: -0.25, visibility: 0.98 };
      lms[0]  = { x: 0.50, y: 0.72, z: 0.28, visibility: 0.98 };
      const reachZ = cycle * 0.28;
      const reachY = cycle * 0.04;
      lms[15] = { x: 0.40, y: 0.72 - reachY, z: 0.15 + reachZ, visibility: 0.98 };
      lms[28] = { x: 0.57, y: 0.72 - reachY, z: -0.48 - reachZ, visibility: 0.98 };
    }
    return;
  }

  // DEFAULT FALLBACK HINGE OR SQUAT MOTION
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
