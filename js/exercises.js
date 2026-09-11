/**
 * FlexAlign AI - Exercise Definitions & Biomechanical Specifications
 */

export const EXERCISES = {
  squat: {
    id: 'squat',
    name: 'Bodyweight Squat',
    category: 'Lower Body / Mobility',
    jointLabel: 'KNEE',
    jointTitle: 'Knee Joint Flexion',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    gymCriterion: '≤ 90° (Parallel/Below)',
    gymLockout: '> 160° (Full Extension)',
    repFooter: 'Cycle: Stand ➔ Depth',
    ptSliderMin: 70,
    ptSliderMax: 120,
    defaultSafeThreshold: 100,
    sliderLabel: 'Safe Flexion Limit (ACL Rehab):',
    ptTip: '💡 <strong>Squat Rehab:</strong> Maintain knee alignment over toes. Alerts trigger if flexion exceeds safe threshold to prevent graft strain.'
  },
  curl: {
    id: 'curl',
    name: 'Bicep Curl',
    category: 'Upper Body / Strength',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Joint Flexion',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    gymCriterion: '≤ 45° (Peak Flexion)',
    gymLockout: '> 155° (Full Extension)',
    repFooter: 'Cycle: Extend ➔ Curl',
    ptSliderMin: 35,
    ptSliderMax: 90,
    defaultSafeThreshold: 45,
    sliderLabel: 'Target Flexion Goal:',
    ptTip: '💡 <strong>Elbow Rehab:</strong> Verifies smooth flexion-extension arc without compensatory shoulder swing or jerky cadence.'
  },
  raise: {
    id: 'raise',
    name: 'Shoulder Lateral Raise',
    category: 'Rehab / Mobility',
    jointLabel: 'SHOULDER',
    jointTitle: 'Shoulder Abduction Angle',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    gymCriterion: '80°–95° (Parallel Raise)',
    gymLockout: '< 25° (Rest at Side)',
    repFooter: 'Cycle: Rest ➔ Parallel',
    ptSliderMin: 70,
    ptSliderMax: 120,
    defaultSafeThreshold: 100,
    sliderLabel: 'Impingement Ceiling:',
    ptTip: '💡 <strong>Rotator Cuff Rehab:</strong> Avoid abduction above 100°–110° to prevent subacromial impingement and cuff compression.'
  }
};
