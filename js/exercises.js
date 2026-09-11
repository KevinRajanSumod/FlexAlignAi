/**
 * FlexAlign AI - Exercise Definitions & Biomechanical Specifications
 * Clear distinction between Bicep Curl (Flexion) and Elbow Extension (Lockout)
 */

export const GYM_EXERCISES = {
  gym_squat: {
    id: 'gym_squat',
    name: 'Bodyweight Squat',
    category: 'Lower Body / Compound',
    jointLabel: 'KNEE',
    jointTitle: 'Knee Joint Flexion',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≤ 90° (Parallel Depth)',
    lockoutCriterion: '> 160° (Full Extension)',
    repFooter: 'Stand ➔ Depth ➔ Stand',
    tip: '⚡ <strong>Gym Standards:</strong> Descend until thighs are parallel to ground (≤ 90°). Maintain upright chest and push knees out.',
    defaultTarget: 90
  },
  gym_curl: {
    id: 'gym_curl',
    name: 'Bicep Curl (Flexion)',
    category: 'Upper Body / Biceps',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Joint Flexion',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 45° (Peak Flexion)',
    lockoutCriterion: '> 155° (Full Extension)',
    repFooter: 'Extension ➔ Curl ➔ Extension',
    tip: '💪 <strong>Bicep Curl:</strong> Pin elbows tight against ribcage. Curl forearm upward to anterior shoulder. Avoid swinging torso.',
    defaultTarget: 45
  },
  gym_extension: {
    id: 'gym_extension',
    name: 'Triceps Pushdown (Extension)',
    category: 'Upper Body / Triceps',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Extension (Lockout)',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≥ 165° (Full Lockout)',
    lockoutCriterion: '< 85° (Flexed Setup)',
    repFooter: 'Flexed Setup ➔ Full Lockout',
    tip: '⚡ <strong>Triceps Pushdown:</strong> Drive forearms downward into full crisp lockout (≥ 165°). Keep upper arms stationary at ribcage.',
    defaultTarget: 165
  },
  gym_press: {
    id: 'gym_press',
    name: 'Overhead Press',
    category: 'Upper Body / Shoulders',
    jointLabel: 'ELBOW',
    jointTitle: 'Overhead Elbow Lockout',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '> 160° (Overhead Lockout)',
    lockoutCriterion: '< 90° (Return to Rack)',
    repFooter: 'Rack ➔ Overhead Lockout',
    tip: '⚡ <strong>Overhead Press:</strong> Lock out elbows directly overhead. Keep core engaged and avoid hyperextending lumbar spine.',
    defaultTarget: 160
  }
};

export const PT_EXERCISES = {
  pt_raise: {
    id: 'pt_raise',
    name: 'Shoulder Lateral Raise',
    category: 'Impingement Rehab',
    jointLabel: 'SHOULDER',
    jointTitle: 'Shoulder Abduction Angle',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    sliderLabel: 'Safe Abduction Ceiling:',
    ptSliderMin: 70,
    ptSliderMax: 120,
    defaultSafeThreshold: 100,
    repFooter: 'Rest ➔ Peak ➔ Rest',
    tip: '💡 <strong>Rotator Cuff Rehab:</strong> Avoid raising arm above safe ceiling to prevent subacromial impingement.'
  },
  pt_knee_ext: {
    id: 'pt_knee_ext',
    name: 'Seated Knee Extension',
    category: 'ACL/MCL Rehab',
    jointLabel: 'KNEE',
    jointTitle: 'Knee Extension Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    sliderLabel: 'Safe Extension Limit:',
    ptSliderMin: 120,
    ptSliderMax: 175,
    defaultSafeThreshold: 160,
    repFooter: 'Flexed ➔ Extended',
    tip: '💡 <strong>ACL Protocol:</strong> Extend knee slowly and smoothly. Stop immediately if pain or resistance occurs.'
  },
  pt_elbow_ext: {
    id: 'pt_elbow_ext',
    name: 'Elbow Extension (Lockout Rehab)',
    category: 'Terminal Extension Restoration',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Extension Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    sliderLabel: 'Target Extension Goal:',
    ptSliderMin: 140,
    ptSliderMax: 180,
    defaultSafeThreshold: 165,
    repFooter: 'Flexed ➔ Full Extension',
    tip: '💡 <strong>Terminal Extension:</strong> Restore full straight-arm lockout. Guard against compensatory shoulder hiking.'
  },
  pt_elbow_flex: {
    id: 'pt_elbow_flex',
    name: 'Elbow Flexion (Bending Rehab)',
    category: 'Post-Op Flexion Mobility',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Flexion Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    sliderLabel: 'Target Flexion Goal:',
    ptSliderMin: 45,
    ptSliderMax: 120,
    defaultSafeThreshold: 90,
    repFooter: 'Extended ➔ Controlled Flexion',
    tip: '💡 <strong>Elbow Mobility:</strong> Controlled active flexion arc without compensatory upper arm motion.'
  }
};

/**
 * Dynamic Exercise Registry for Gemini AI-generated and modified exercises
 */
export const CUSTOM_EXERCISES = {};

/**
 * Register or update an exercise dynamically
 */
export function registerExercise(exDef) {
  if (!exDef || !exDef.id) return null;
  
  CUSTOM_EXERCISES[exDef.id] = exDef;
  
  if (exDef.mode === 'pt') {
    PT_EXERCISES[exDef.id] = exDef;
  } else {
    GYM_EXERCISES[exDef.id] = exDef;
  }
  return exDef;
}

/**
 * Modify an existing exercise definition
 */
export function modifyExerciseDefinition(id, updates) {
  const ex = getExerciseDefinition(id);
  if (!ex) return null;
  
  Object.assign(ex, updates, { isCustom: true });
  CUSTOM_EXERCISES[id] = ex;
  if (ex.mode === 'pt') {
    PT_EXERCISES[id] = ex;
  } else {
    GYM_EXERCISES[id] = ex;
  }
  return ex;
}

/**
 * Retrieve an exercise definition by ID
 */
export function getExerciseDefinition(id) {
  return CUSTOM_EXERCISES[id] || GYM_EXERCISES[id] || PT_EXERCISES[id] || null;
}

/**
 * Get all exercises for a specific mode
 */
export function getAllExercisesForMode(mode) {
  const base = mode === 'pt' ? PT_EXERCISES : GYM_EXERCISES;
  return { ...base };
}
