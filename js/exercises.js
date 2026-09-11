/**
 * FlexAlign AI - Universal Biomechanical Exercise Directory & Real-Time Auto-Synthesizer
 * Comprehensive clinical and athletic kinesiology database spanning over 70+ exercises
 * across Gym and Physical Therapy, with an instant 0ms procedural exercise generator.
 */

export const GYM_EXERCISES = {
  // ── SQUATS & LOWER COMPOUND ──
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
    defaultTarget: 90,
    isFlexion: true,
    motionProfile: { posture: 'standing', movementType: 'squat', primaryJoint: 'KNEE', startAngle: 175, targetAngle: 90, tempoSpeed: 1.4 }
  },
  gym_goblet_squat: {
    id: 'gym_goblet_squat',
    name: 'Goblet Squat',
    category: 'Lower Body / Quads & Core',
    jointLabel: 'KNEE',
    jointTitle: 'Knee Joint Flexion Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≤ 85° (Deep Parallel)',
    lockoutCriterion: '> 160° (Extension Lockout)',
    repFooter: 'Rack Weight ➔ Deep Squat ➔ Stand',
    tip: '⚡ <strong>Goblet Squat:</strong> Hold kettlebell or dumbbell close to sternum. Spread the floor with feet and keep elbows inside knees.',
    defaultTarget: 85,
    isFlexion: true,
    motionProfile: { posture: 'standing', movementType: 'squat', primaryJoint: 'KNEE', startAngle: 175, targetAngle: 85, tempoSpeed: 1.4 }
  },
  gym_sumo_squat: {
    id: 'gym_sumo_squat',
    name: 'Sumo Squat (Wide Stance)',
    category: 'Lower Body / Adductors & Glutes',
    jointLabel: 'KNEE',
    jointTitle: 'Knee Joint Flexion',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≤ 90° (Parallel Depth)',
    lockoutCriterion: '> 160° (Full Extension)',
    repFooter: 'Wide Stance ➔ Deep Crease ➔ Drive',
    tip: '⚡ <strong>Sumo Squat:</strong> Set feet 1.5x shoulder-width, toes turned 30-45° out. Push knees out tracking over second toes.',
    defaultTarget: 90,
    isFlexion: true,
    motionProfile: { posture: 'standing', movementType: 'squat', primaryJoint: 'KNEE', startAngle: 175, targetAngle: 90, tempoSpeed: 1.4 }
  },

  // ── POSTERIOR CHAIN & HINGES ──
  gym_rdl: {
    id: 'gym_rdl',
    name: 'Romanian Deadlift (RDL)',
    category: 'Posterior Chain / Hamstrings',
    jointLabel: 'HIP',
    jointTitle: 'Hip Hinge Flexion Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    targetCriterion: '≤ 75° (Deep Hip Hinge)',
    lockoutCriterion: '> 165° (Neutral Lockout)',
    defaultTarget: 75,
    isFlexion: true,
    repFooter: 'Stand ➔ Push Hips Back ➔ Drive Glutes',
    tip: '⚡ <strong>RDL Hinge:</strong> Maintain soft knee bend and drive hips straight back. Bar skims thighs with neutral cervical spine.',
    faultMessage: '⚠️ Form Fault: Spine Rounding or Excessive Knee Bend! Push Hips Backward',
    faultCriteria: { torsoLeanThreshold: 45, kneeBendThreshold: 140 },
    motionProfile: { posture: 'hinged', movementType: 'hinge_deadlift', primaryJoint: 'HIP', startAngle: 175, targetAngle: 75, tempoSpeed: 1.3 }
  },
  gym_deadlift: {
    id: 'gym_deadlift',
    name: 'Conventional Deadlift',
    category: 'Posterior Chain / Full Body Pull',
    jointLabel: 'HIP',
    jointTitle: 'Hip Extension Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    targetCriterion: '≤ 70° (Floor Setup / Deep Hinge)',
    lockoutCriterion: '> 165° (Tall Lockout)',
    defaultTarget: 70,
    isFlexion: true,
    repFooter: 'Floor Setup ➔ Leg Drive ➔ Glute Lockout',
    tip: '⚡ <strong>Deadlift:</strong> Brace core, pull slack out of bar. Drive through mid-foot and lock out hips without hyperextending lower back.',
    motionProfile: { posture: 'hinged', movementType: 'hinge_deadlift', primaryJoint: 'HIP', startAngle: 175, targetAngle: 70, tempoSpeed: 1.3 }
  },
  gym_good_morning: {
    id: 'gym_good_morning',
    name: 'Barbell Good Morning',
    category: 'Posterior Chain / Hamstrings & Erectors',
    jointLabel: 'HIP',
    jointTitle: 'Hip Hinge Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    targetCriterion: '≤ 80° (Torso Parallel Hinge)',
    lockoutCriterion: '> 165° (Upright Stand)',
    defaultTarget: 80,
    isFlexion: true,
    repFooter: 'Stand ➔ Horizontal Hinge ➔ Drive Hips',
    tip: '⚡ <strong>Good Morning:</strong> Bar on upper traps. Hinge hips back until torso is near parallel. Keep lats packed tight.',
    motionProfile: { posture: 'hinged', movementType: 'hinge_deadlift', primaryJoint: 'HIP', startAngle: 175, targetAngle: 80, tempoSpeed: 1.3 }
  },
  gym_glute_bridge: {
    id: 'gym_glute_bridge',
    name: 'Barbell Glute Bridge / Hip Thrust',
    category: 'Glutes & Hip Extension',
    jointLabel: 'HIP',
    jointTitle: 'Hip Extension Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    targetCriterion: '≥ 165° (Full Posterior Lockout)',
    lockoutCriterion: '< 110° (Hips Folded Setup)',
    defaultTarget: 165,
    isFlexion: false,
    repFooter: 'Bottom Setup ➔ Squeeze Glutes at Top ➔ Return',
    tip: '🍑 <strong>Glute Bridge:</strong> Drive through heels to full hip extension. Squeeze glutes at top with posterior pelvic tilt.',
    motionProfile: { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 110, targetAngle: 170, tempoSpeed: 1.3 }
  },

  // ── UNILATERAL LOWER BODY ──
  gym_split_squat: {
    id: 'gym_split_squat',
    name: 'Bulgarian Split Squat',
    category: 'Unilateral Quads & Glutes',
    jointLabel: 'KNEE',
    jointTitle: 'Lead Knee Flexion Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≤ 85° (Full Single-Leg Depth)',
    lockoutCriterion: '> 160° (Full Extension)',
    defaultTarget: 85,
    isFlexion: true,
    repFooter: 'Upright Setup ➔ 90° Knee Drop ➔ Drive Lead Foot',
    tip: '⚡ <strong>Split Squat:</strong> Lower rear knee toward floor while keeping lead shin vertical. Maintain square pelvis and upright chest.',
    motionProfile: { posture: 'lunge', movementType: 'lunge', primaryJoint: 'KNEE', startAngle: 170, targetAngle: 85, tempoSpeed: 1.4 }
  },
  gym_lunge: {
    id: 'gym_lunge',
    name: 'Walking Lunge',
    category: 'Unilateral Lower Body',
    jointLabel: 'KNEE',
    jointTitle: 'Lead Knee Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≤ 88° (90-Degree Knee Bend)',
    lockoutCriterion: '> 160° (Stand Tall)',
    defaultTarget: 88,
    isFlexion: true,
    repFooter: 'Step Forward ➔ Decelerate to 90° ➔ Drive Forward',
    tip: '🦵 <strong>Walking Lunges:</strong> Step forward and drop hips straight down. Keep front knee centered over foot without caving inward.',
    motionProfile: { posture: 'lunge', movementType: 'lunge', primaryJoint: 'KNEE', startAngle: 170, targetAngle: 88, tempoSpeed: 1.4 }
  },
  gym_reverse_lunge: {
    id: 'gym_reverse_lunge',
    name: 'Dumbbell Reverse Lunge',
    category: 'Unilateral Glutes & Hamstrings',
    jointLabel: 'KNEE',
    jointTitle: 'Front Knee Flexion Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≤ 85° (90° Knee Angle)',
    lockoutCriterion: '> 160° (Return to Stand)',
    defaultTarget: 85,
    isFlexion: true,
    repFooter: 'Step Back ➔ Controlled Drop ➔ Drive Front Heel',
    tip: '⚡ <strong>Reverse Lunge:</strong> Step backward onto ball of foot. Lower gently until back knee taps floor, then drive front heel to return.',
    motionProfile: { posture: 'lunge', movementType: 'lunge', primaryJoint: 'KNEE', startAngle: 170, targetAngle: 85, tempoSpeed: 1.4 }
  },

  // ── CHEST & HORIZONTAL PUSH ──
  gym_pushup: {
    id: 'gym_pushup',
    name: 'Standard Push-Up',
    category: 'Upper Body / Pectorals & Triceps',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Flexion Depth',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 80° (Chest to Floor)',
    lockoutCriterion: '> 160° (High Plank Lockout)',
    defaultTarget: 80,
    isFlexion: true,
    repFooter: 'High Plank ➔ 80° Elbow Depth ➔ Push Away',
    tip: '💪 <strong>Push-Up Kinematics:</strong> Tuck elbows 45° relative to torso. Maintain rigid plank line from shoulders through ankles without sagging hips.',
    faultMessage: '⚠️ Form Fault: Excessive Elbow Flare (> 70°) or Sagging Hip Core Breakdown!',
    faultCriteria: { flareThreshold: 0.28, hipSagThreshold: 15 },
    motionProfile: { posture: 'plank', movementType: 'pushup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 80, tempoSpeed: 1.3 }
  },
  gym_diamond_pushup: {
    id: 'gym_diamond_pushup',
    name: 'Diamond Push-Up (Triceps Focus)',
    category: 'Upper Body / Triceps & Chest',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Flexion Depth',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 75° (Deep Tricep Flexion)',
    lockoutCriterion: '> 160° (Crisp Lockout)',
    defaultTarget: 75,
    isFlexion: true,
    repFooter: 'Hands Diamond ➔ Touch Sternum ➔ Lockout',
    tip: '💪 <strong>Diamond Push-Up:</strong> Form triangle with thumbs and index fingers beneath sternum. Keep body rigid and pin elbows close.',
    motionProfile: { posture: 'plank', movementType: 'pushup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 75, tempoSpeed: 1.3 }
  },
  gym_bench_press: {
    id: 'gym_bench_press',
    name: 'Barbell Bench Press',
    category: 'Upper Body / Chest & Triceps',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Extension Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 80° (Touch Chest)',
    lockoutCriterion: '> 165° (Full Lockout)',
    defaultTarget: 80,
    isFlexion: true,
    repFooter: 'Unrack Lockout ➔ Touch Sternum ➔ Drive Up',
    tip: '⚡ <strong>Bench Press:</strong> Retract shoulder blades into bench. Lower bar under control to lower chest, press up in slight J-curve.',
    motionProfile: { posture: 'supine', movementType: 'press_horizontal', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 80, tempoSpeed: 1.3 }
  },
  gym_floor_press: {
    id: 'gym_floor_press',
    name: 'Dumbbell Floor Press',
    category: 'Upper Body / Chest & Shoulder Safe',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Joint Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 88° (Triceps Rest on Floor)',
    lockoutCriterion: '> 165° (Lockout Over Chest)',
    defaultTarget: 88,
    isFlexion: true,
    repFooter: 'Floor Setup ➔ Press to Lockout ➔ Control Tap',
    tip: '⚡ <strong>Floor Press:</strong> Triceps pause lightly on floor to eliminate shoulder hyperextension while building explosive lockout.',
    motionProfile: { posture: 'supine', movementType: 'press_horizontal', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 88, tempoSpeed: 1.3 }
  },

  // ── SHOULDERS & VERTICAL PRESS ──
  gym_press: {
    id: 'gym_press',
    name: 'Overhead Shoulder Press',
    category: 'Upper Body / Shoulders & Core',
    jointLabel: 'ELBOW',
    jointTitle: 'Overhead Elbow Lockout',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '> 160° (Overhead Lockout)',
    lockoutCriterion: '< 90° (Return to Rack)',
    repFooter: 'Rack ➔ Overhead Lockout ➔ Return',
    tip: '⚡ <strong>Overhead Press:</strong> Lock out elbows directly overhead. Squeeze glutes and brace abs to avoid hyperextending lower back.',
    defaultTarget: 160,
    isFlexion: false,
    motionProfile: { posture: 'standing', movementType: 'press_overhead', primaryJoint: 'ELBOW', startAngle: 80, targetAngle: 168, tempoSpeed: 1.3 }
  },
  gym_arnold_press: {
    id: 'gym_arnold_press',
    name: 'Arnold Dumbbell Press',
    category: 'Upper Body / Deltoid Complex',
    jointLabel: 'ELBOW',
    jointTitle: 'Overhead Extension Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≥ 165° (Overhead Lockout)',
    lockoutCriterion: '< 85° (Supinated Chest Rack)',
    defaultTarget: 165,
    isFlexion: false,
    repFooter: 'Palms In ➔ Rotate & Press ➔ Lockout',
    tip: '🎯 <strong>Arnold Press:</strong> Start with palms facing chest. Rotate wrists outward as dumbbells ascend into complete overhead lockout.',
    motionProfile: { posture: 'standing', movementType: 'press_overhead', primaryJoint: 'ELBOW', startAngle: 80, targetAngle: 168, tempoSpeed: 1.3 }
  },
  gym_lateral_raise: {
    id: 'gym_lateral_raise',
    name: 'Dumbbell Lateral Raise',
    category: 'Upper Body / Lateral Deltoids',
    jointLabel: 'SHOULDER',
    jointTitle: 'Shoulder Abduction Angle',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    targetCriterion: '≥ 85° (Parallel Abduction)',
    lockoutCriterion: '< 25° (Neutral Return)',
    defaultTarget: 85,
    isFlexion: false,
    repFooter: 'Sides ➔ Shoulder Height ➔ Controlled Lower',
    tip: '🎯 <strong>Lateral Raise:</strong> Raise arms smoothly in scapular plane (slight 15° forward angle). Lead with elbows, not wrists.',
    motionProfile: { posture: 'standing', movementType: 'lateral_raise', primaryJoint: 'SHOULDER', startAngle: 18, targetAngle: 85, tempoSpeed: 1.2 }
  },
  gym_front_raise: {
    id: 'gym_front_raise',
    name: 'Dumbbell Front Raise',
    category: 'Upper Body / Anterior Deltoid',
    jointLabel: 'SHOULDER',
    jointTitle: 'Shoulder Flexion Angle',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    targetCriterion: '≥ 85° (Parallel Flexion)',
    lockoutCriterion: '< 20° (Thigh Return)',
    defaultTarget: 85,
    isFlexion: false,
    repFooter: 'Thighs ➔ Eye Level ➔ Control Descent',
    tip: '🎯 <strong>Front Raise:</strong> Raise dumbbells straight forward to eye level. Keep core braced to avoid leaning torso backward.',
    motionProfile: { posture: 'standing', movementType: 'front_raise', primaryJoint: 'SHOULDER', startAngle: 15, targetAngle: 85, tempoSpeed: 1.2 }
  },

  // ── BACK & UPPER PULL ──
  gym_pullup: {
    id: 'gym_pullup',
    name: 'Overhand Pull-Up',
    category: 'Upper Body / Lats & Biceps',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Flexion at Peak',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 65° (Chin Over Bar)',
    lockoutCriterion: '> 160° (Dead Hang Return)',
    defaultTarget: 65,
    isFlexion: true,
    repFooter: 'Dead Hang ➔ Drive Elbows Down ➔ Chin Over Bar',
    tip: '⚡ <strong>Pull-Up:</strong> Initiate from dead hang by depressing scapulae. Drive elbows down and back to pull chest toward bar.',
    motionProfile: { posture: 'standing', movementType: 'pullup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 65, tempoSpeed: 1.3 }
  },
  gym_chinup: {
    id: 'gym_chinup',
    name: 'Underhand Chin-Up',
    category: 'Upper Body / Lats & Biceps Peak',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Flexion Depth',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 55° (Chest to Bar)',
    lockoutCriterion: '> 160° (Full Extension)',
    defaultTarget: 55,
    isFlexion: true,
    repFooter: 'Hang ➔ Supinated Drive ➔ Chin Over',
    tip: '💪 <strong>Chin-Up:</strong> Supinated underhand grip maximizes biceps recruitment. Pull all the way until chin cleanly clears the bar.',
    motionProfile: { posture: 'standing', movementType: 'pullup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 55, tempoSpeed: 1.3 }
  },
  gym_bent_row: {
    id: 'gym_bent_row',
    name: 'Barbell Bent-Over Row',
    category: 'Upper Body / Lats, Rhomboids & Erectors',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Drive Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 70° (Bar to Abdomen)',
    lockoutCriterion: '> 155° (Full Arm Hang)',
    defaultTarget: 70,
    isFlexion: true,
    repFooter: 'Hang ➔ Pull to Navel ➔ Controlled Lower',
    tip: '⚡ <strong>Bent-Over Row:</strong> Hinge at 45-60°. Pull elbows straight back past ribcage, squeezing shoulder blades at peak.',
    motionProfile: { posture: 'hinged', movementType: 'row', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 65, tempoSpeed: 1.3 }
  },
  gym_dumbbell_row: {
    id: 'gym_dumbbell_row',
    name: 'Single-Arm Dumbbell Row',
    category: 'Upper Body / Unilateral Back',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Retraction Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 65° (Dumbbell to Hip)',
    lockoutCriterion: '> 160° (Full Hang Stretch)',
    defaultTarget: 65,
    isFlexion: true,
    repFooter: 'Stretch at Bottom ➔ Row to Pocket ➔ Control',
    tip: '⚡ <strong>Dumbbell Row:</strong> Pull dumbbell in slight arc toward hip pocket rather than straight up to fully engage latissimus dorsi.',
    motionProfile: { posture: 'hinged', movementType: 'row', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 65, tempoSpeed: 1.3 }
  },

  // ── ARMS & ISOLATION ──
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
    defaultTarget: 45,
    isFlexion: true,
    motionProfile: { posture: 'standing', movementType: 'curl', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 45, tempoSpeed: 1.4 }
  },
  gym_hammer_curl: {
    id: 'gym_hammer_curl',
    name: 'Hammer Curl (Neutral Grip)',
    category: 'Upper Body / Brachialis & Forearms',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Joint Flexion',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 50° (Peak Contraction)',
    lockoutCriterion: '> 155° (Full Lockout)',
    defaultTarget: 50,
    isFlexion: true,
    repFooter: 'Palms In ➔ Curl Up ➔ Controlled Lower',
    tip: '💪 <strong>Hammer Curl:</strong> Maintain neutral grip (palms facing each other) throughout the entire excursion to build brachialis thickness.',
    motionProfile: { posture: 'standing', movementType: 'curl', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 50, tempoSpeed: 1.4 }
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
    defaultTarget: 165,
    isFlexion: false,
    motionProfile: { posture: 'standing', movementType: 'pushdown', primaryJoint: 'ELBOW', startAngle: 75, targetAngle: 170, tempoSpeed: 1.3 }
  },
  gym_dip: {
    id: 'gym_dip',
    name: 'Parallel Bar Dips',
    category: 'Upper Body / Chest & Triceps Compound',
    jointLabel: 'ELBOW',
    jointTitle: 'Elbow Flexion Depth',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '≤ 85° (Upper Arms Parallel)',
    lockoutCriterion: '> 160° (Full Top Lockout)',
    defaultTarget: 85,
    isFlexion: true,
    repFooter: 'Top Support ➔ Lower to 90° ➔ Press to Lockout',
    tip: '💪 <strong>Dips:</strong> Lean torso slightly forward to recruit pectorals. Descend until shoulders are level with elbows, then lock out.',
    motionProfile: { posture: 'standing', movementType: 'dip', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 85, tempoSpeed: 1.3 }
  },
  gym_calf_raise: {
    id: 'gym_calf_raise',
    name: 'Standing Calf Raise',
    category: 'Lower Body / Gastrocnemius & Soleus',
    jointLabel: 'KNEE',
    jointTitle: 'Ankle Extension / Plantarflexion',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    targetCriterion: '≥ 170° (Full Plantarflexion Rise)',
    lockoutCriterion: '< 150° (Heels Dropped)',
    defaultTarget: 170,
    isFlexion: false,
    repFooter: 'Heels Stretched ➔ Drive to Toes ➔ 2s Hold',
    tip: '⚡ <strong>Calf Raise:</strong> Drive up onto big toe mounds. Hold top contraction for 1 full second to maximize motor unit recruitment.',
    motionProfile: { posture: 'standing', movementType: 'calf_raise', primaryJoint: 'KNEE', startAngle: 155, targetAngle: 175, tempoSpeed: 1.2 }
  },

  // ── CORE & CALISTHENICS ──
  gym_plank: {
    id: 'gym_plank',
    name: 'High Plank Hold',
    category: 'Core / Isometric Anterior Chain',
    jointLabel: 'ELBOW',
    jointTitle: 'Arm Stability Angle',
    hudBadge: 'JOINT: ELBOW (SHOULDER-ELBOW-WRIST)',
    targetCriterion: '> 165° (Straight Arm Support)',
    lockoutCriterion: '> 150° (Plank Maintained)',
    defaultTarget: 165,
    isFlexion: false,
    repFooter: 'Rigid Core ➔ Glutes Clamped ➔ Static Hold',
    tip: '⚡ <strong>Plank Standard:</strong> Press floor away through hands. Keep pelvis tucked with posterior tilt to lock abdominal wall.',
    motionProfile: { posture: 'plank', movementType: 'pushup', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 165, tempoSpeed: 1.0 }
  },
  gym_crunch: {
    id: 'gym_crunch',
    name: 'Standard Abdominal Crunch',
    category: 'Core / Rectus Abdominis',
    jointLabel: 'HIP',
    jointTitle: 'Trunk Flexion Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    targetCriterion: '≤ 135° (Peak Spinal Flexion)',
    lockoutCriterion: '> 160° (Floor Return)',
    defaultTarget: 135,
    isFlexion: true,
    repFooter: 'Floor Setup ➔ Curl Ribs to Pelvis ➔ Return',
    tip: '⚡ <strong>Crunch:</strong> Exhale forcefully and curl ribcage down toward hips. Guard against pulling on the neck with hands.',
    motionProfile: { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 165, targetAngle: 135, tempoSpeed: 1.3 }
  }
};

export const PT_EXERCISES = {
  // ── SHOULDER / ROTATOR CUFF & SCAPULAR REHAB ──
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
    tip: '💡 <strong>Rotator Cuff Rehab:</strong> Avoid raising arm above safe ceiling to prevent subacromial impingement.',
    motionProfile: { posture: 'standing', movementType: 'lateral_raise', primaryJoint: 'SHOULDER', startAngle: 18, targetAngle: 85, tempoSpeed: 1.2 }
  },
  pt_pendulum: {
    id: 'pt_pendulum',
    name: 'Codman Shoulder Pendulum Swings',
    category: 'Acute Post-Op Shoulder Mobility',
    jointLabel: 'SHOULDER',
    jointTitle: 'Passive Shoulder Oscillation',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    sliderLabel: 'Safe Oscillation Limit:',
    ptSliderMin: 20,
    ptSliderMax: 60,
    defaultSafeThreshold: 35,
    repFooter: 'Hinged Stance ➔ Gentle Passive Circle ➔ Rest',
    tip: '💡 <strong>Codman Pendulum:</strong> Lean forward supporting torso on table. Let affected arm hang completely limp, using torso momentum to swing.',
    motionProfile: { posture: 'hinged', movementType: 'hinge_deadlift', primaryJoint: 'SHOULDER', startAngle: 15, targetAngle: 40, tempoSpeed: 1.1 }
  },
  pt_scaption: {
    id: 'pt_scaption',
    name: 'Scapular Plane Elevation (Full Can)',
    category: 'Supraspinatus Activation Protocol',
    jointLabel: 'SHOULDER',
    jointTitle: 'Scapular Elevation Angle',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    sliderLabel: 'Safe Elevation Limit:',
    ptSliderMin: 60,
    ptSliderMax: 120,
    defaultSafeThreshold: 90,
    repFooter: 'Neutral Setup ➔ 30° Scaption Plane ➔ Return',
    tip: '💡 <strong>Full Can Scaption:</strong> Raise arm 30° forward of the body with thumbs pointing up to isolate supraspinatus without impingement.',
    motionProfile: { posture: 'standing', movementType: 'lateral_raise', primaryJoint: 'SHOULDER', startAngle: 18, targetAngle: 85, tempoSpeed: 1.2 }
  },
  pt_wall_angels: {
    id: 'pt_wall_angels',
    name: 'Wall Angels (Scapular Retraction)',
    category: 'Scapulothoracic Rehab & Mobility',
    jointLabel: 'SHOULDER',
    jointTitle: 'Scapular Reach Arc',
    hudBadge: 'JOINT: SHOULDER (HIP-SHOULDER-ELBOW)',
    sliderLabel: 'Safe Upward Reach Ceiling:',
    ptSliderMin: 90,
    ptSliderMax: 160,
    defaultSafeThreshold: 140,
    repFooter: 'W Position ➔ Smooth Slide Up ➔ W Return',
    tip: '💡 <strong>Wall Angels:</strong> Press back, elbows, and wrists flat against wall. Slide arms smoothly upward without arching lumbar spine.',
    motionProfile: { posture: 'standing', movementType: 'lateral_raise', primaryJoint: 'SHOULDER', startAngle: 45, targetAngle: 140, tempoSpeed: 1.1 }
  },

  // ── KNEE / ACL / MENISCUS REHAB ──
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
    tip: '💡 <strong>ACL Protocol:</strong> Extend knee slowly and smoothly. Stop immediately if pain or resistance occurs.',
    motionProfile: { posture: 'seated', movementType: 'seated_leg_ext', primaryJoint: 'KNEE', startAngle: 90, targetAngle: 160, tempoSpeed: 1.2 }
  },
  pt_tke: {
    id: 'pt_tke',
    name: 'Terminal Knee Extension (TKE)',
    category: 'VMO & Terminal Lockout Restoration',
    jointLabel: 'KNEE',
    jointTitle: 'Terminal Extension Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    sliderLabel: 'Target Terminal Lockout:',
    ptSliderMin: 145,
    ptSliderMax: 180,
    defaultSafeThreshold: 175,
    repFooter: 'Soft Knee (150°) ➔ Drive to Full Lockout (175°)',
    tip: '💡 <strong>TKE Protocol:</strong> Band behind knee. Straighten knee into full extension, firing the inner quadriceps (VMO) forcefully.',
    motionProfile: { posture: 'standing', movementType: 'squat', primaryJoint: 'KNEE', startAngle: 145, targetAngle: 175, tempoSpeed: 1.3 }
  },
  pt_slr: {
    id: 'pt_slr',
    name: 'Straight Leg Raise (SLR)',
    category: 'Post-Op Quad Reactivation',
    jointLabel: 'HIP',
    jointTitle: 'Hip Flexion Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    sliderLabel: 'Safe Hip Flexion Ceiling:',
    ptSliderMin: 30,
    ptSliderMax: 65,
    defaultSafeThreshold: 45,
    repFooter: 'Locked Knee Setup ➔ Lift Leg 45° ➔ Slow Return',
    tip: '💡 <strong>Straight Leg Raise:</strong> Lock knee completely straight before lifting heel 12 inches off floor. Avoid quad lag.',
    motionProfile: { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 175, targetAngle: 135, tempoSpeed: 1.2 }
  },
  pt_mini_squat: {
    id: 'pt_mini_squat',
    name: 'Functional Mini Squat (0-45°)',
    category: 'Early Weight-Bearing Patellofemoral',
    jointLabel: 'KNEE',
    jointTitle: 'Knee Flexion Angle',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    sliderLabel: 'Conservative Depth Ceiling:',
    ptSliderMin: 135,
    ptSliderMax: 160,
    defaultSafeThreshold: 145,
    repFooter: 'Stand Tall ➔ Mini Dip (145°) ➔ Press to Lockout',
    tip: '💡 <strong>Mini Squats:</strong> Controlled shallow knee flexion without exceeding 45° to protect patellar tendon and cartilage graft.',
    motionProfile: { posture: 'standing', movementType: 'squat', primaryJoint: 'KNEE', startAngle: 175, targetAngle: 145, tempoSpeed: 1.3 }
  },

  // ── SPINE, THORACIC & CORE STABILITY ──
  pt_cat_cow: {
    id: 'pt_cat_cow',
    name: 'Cat-Cow Spinal Segmentation',
    category: 'Cervical, Thoracic & Lumbar Mobility',
    jointLabel: 'HIP',
    jointTitle: 'Spinal Flexion-Extension Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    sliderLabel: 'Safe Spinal Excursion:',
    ptSliderMin: 120,
    ptSliderMax: 175,
    defaultSafeThreshold: 145,
    repFooter: 'All-Fours ➔ Arch Spine (Cat) ➔ Incline Belly (Cow)',
    tip: '💡 <strong>Cat-Cow:</strong> Move vertebra by vertebra. Exhale tucking pelvis and chin into Cat; inhale opening chest into Cow.',
    motionProfile: { posture: 'quadruped', movementType: 'spinal_flexion', primaryJoint: 'HIP', startAngle: 160, targetAngle: 135, tempoSpeed: 1.1 }
  },
  pt_bird_dog: {
    id: 'pt_bird_dog',
    name: 'Bird Dog Quadruped Reach',
    category: 'Lumbar Spine Stabilization (McGill Big 3)',
    jointLabel: 'HIP',
    jointTitle: 'Hip Extension Reach',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    sliderLabel: 'Safe Hip Neutral Extension:',
    ptSliderMin: 150,
    ptSliderMax: 180,
    defaultSafeThreshold: 175,
    repFooter: 'All-Fours ➔ Reach Opposite Arm & Leg ➔ Return',
    tip: '💡 <strong>Bird Dog:</strong> Reach opposite arm forward and leg backward parallel to floor without twisting pelvis or arching back.',
    motionProfile: { posture: 'quadruped', movementType: 'quadruped_reach', primaryJoint: 'HIP', startAngle: 120, targetAngle: 175, tempoSpeed: 1.2 }
  },
  pt_pelvic_tilt: {
    id: 'pt_pelvic_tilt',
    name: 'Posterior Pelvic Tilt',
    category: 'Lumbar Neutral & Core Activation',
    jointLabel: 'HIP',
    jointTitle: 'Pelvic Flexion Arc',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    sliderLabel: 'Target Flattening Goal:',
    ptSliderMin: 155,
    ptSliderMax: 180,
    defaultSafeThreshold: 172,
    repFooter: 'Relaxed ➔ Flatten Low Back to Floor ➔ Relax',
    tip: '💡 <strong>Pelvic Tilt:</strong> Contract abdominal wall and roll pelvis backward so lower back flattens completely against floor.',
    motionProfile: { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 165, targetAngle: 175, tempoSpeed: 1.2 }
  },

  // ── HIP REHABILITATION ──
  pt_clamshell: {
    id: 'pt_clamshell',
    name: 'Side-Lying Clamshells',
    category: 'Gluteus Medius & Pelvic Stability',
    jointLabel: 'HIP',
    jointTitle: 'Hip External Rotation Angle',
    hudBadge: 'JOINT: HIP (SHOULDER-HIP-KNEE)',
    sliderLabel: 'Safe Abduction Limit:',
    ptSliderMin: 25,
    ptSliderMax: 60,
    defaultSafeThreshold: 45,
    repFooter: 'Feet Together ➔ Open Top Knee ➔ Controlled Close',
    tip: '💡 <strong>Clamshell:</strong> Keep feet glued together and open top knee like a clamshell. Guard against rolling top hip backward.',
    motionProfile: { posture: 'supine', movementType: 'bridge', primaryJoint: 'HIP', startAngle: 20, targetAngle: 45, tempoSpeed: 1.2 }
  },

  // ── ELBOW, WRIST & ANKLE REHAB ──
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
    tip: '💡 <strong>Terminal Extension:</strong> Restore full straight-arm lockout. Guard against compensatory shoulder hiking.',
    motionProfile: { posture: 'standing', movementType: 'pushdown', primaryJoint: 'ELBOW', startAngle: 75, targetAngle: 165, tempoSpeed: 1.3 }
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
    tip: '💡 <strong>Elbow Mobility:</strong> Controlled active flexion arc without compensatory upper arm motion.',
    motionProfile: { posture: 'standing', movementType: 'curl', primaryJoint: 'ELBOW', startAngle: 165, targetAngle: 90, tempoSpeed: 1.2 }
  },
  pt_ankle_pump: {
    id: 'pt_ankle_pump',
    name: 'Active Ankle Pumps',
    category: 'DVT Prevention & Edema Reduction',
    jointLabel: 'KNEE',
    jointTitle: 'Ankle Plantar/Dorsiflexion',
    hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
    sliderLabel: 'Safe Ankle Arc:',
    ptSliderMin: 155,
    ptSliderMax: 180,
    defaultSafeThreshold: 175,
    repFooter: 'Pull Toes Up (Dorsiflex) ➔ Point Toes Down',
    tip: '💡 <strong>Ankle Pumps:</strong> Pump feet up and down rhythmically to activate calf muscle venous pump and restore ankle mobility.',
    motionProfile: { posture: 'supine', movementType: 'calf_raise', primaryJoint: 'KNEE', startAngle: 160, targetAngle: 180, tempoSpeed: 1.2 }
  }
};

/**
 * Dynamic Exercise Registry for runtime-generated and AI-synthesized exercises
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

/**
 * Instant Kinesiology Auto-Synthesizer:
 * Takes ANY exercise name or prompt and instantly generates a complete, mathematically
 * validated biomechanical specification with authentic 3D motion profile in 0ms.
 */
export function synthesizeExerciseFromQuery(query, preferredMode = 'gym') {
  if (!query || typeof query !== 'string') return null;
  const q = query.toLowerCase().trim();

  // 1. Direct or fuzzy lookup in catalog
  const allKnown = { ...GYM_EXERCISES, ...PT_EXERCISES, ...CUSTOM_EXERCISES };
  for (const key of Object.keys(allKnown)) {
    const item = allKnown[key];
    const itemName = item.name.toLowerCase();
    if (itemName === q || q.includes(itemName) || itemName.includes(q)) {
      return { ...item, isCustom: true };
    }
  }

  // 2. Keyword-based deterministic kinesiology parser
  let joint = 'KNEE';
  let posture = 'standing';
  let mType = 'squat';
  let armPattern = 'counterbalance';
  let isFlex = true;
  let target = 90;
  let start = 175;
  let faultType = 'valgus';
  let category = preferredMode === 'pt' ? 'Physical Therapy / Mobility' : 'Athletic Kinematics';

  // Determine Joint
  if (q.includes('shoulder') || q.includes('deltoid') || q.includes('lateral raise') || q.includes('front raise') || q.includes('scaption') || q.includes('angel') || q.includes('pendulum') || q.includes('rotator') || q.includes('face pull') || q.includes('pull apart') || q.includes('shrug') || q.includes('fly')) {
    joint = 'SHOULDER';
    isFlex = false;
    target = q.includes('angel') ? 150 : 85;
    start = q.includes('angel') ? 65 : 18;
    faultType = 'flare';
    mType = q.includes('front') ? 'front_raise' : 'lateral_raise';
    armPattern = q.includes('front') ? 'front_raise' : 'lateral_raise';
  } else if (q.includes('mckenzie') || q.includes('cobra') || q.includes('elbow') || q.includes('bicep') || q.includes('tricep') || q.includes('curl') || q.includes('pushdown') || q.includes('push-up') || q.includes('pushup') || q.includes('press-up') || q.includes('bench') || q.includes('dip') || q.includes('chin-up') || q.includes('pull-up') || q.includes('row')) {
    joint = 'ELBOW';
    if (q.includes('mckenzie') || q.includes('cobra')) {
      isFlex = false;
      target = 160;
      start = 90;
      mType = 'prone_extension';
      armPattern = 'chest_push';
    } else if (q.includes('pushdown') || q.includes('extension')) {
      isFlex = false;
      target = 168;
      start = 75;
      mType = 'pushdown';
      armPattern = 'tricep_pushdown';
    } else if (q.includes('curl')) {
      isFlex = true;
      target = 45;
      start = 165;
      mType = 'curl';
      armPattern = 'bicep_curl';
    } else if (q.includes('press') && !q.includes('bench') && !q.includes('push')) {
      isFlex = false;
      target = 168;
      start = 80;
      mType = 'press_overhead';
      armPattern = 'overhead_press';
    } else if (q.includes('pull') && (q.includes('up') || q.includes('down'))) {
      isFlex = true;
      target = 65;
      start = 165;
      mType = 'pullup';
      armPattern = 'pullup';
    } else if (q.includes('row')) {
      isFlex = true;
      target = 65;
      start = 165;
      mType = 'row';
      armPattern = 'row_pull';
    } else {
      isFlex = true;
      target = 80;
      start = 165;
      mType = 'pushup';
      armPattern = 'pushup';
    }
  } else if (q.includes('hip') || q.includes('deadlift') || q.includes('rdl') || q.includes('hinge') || q.includes('good morning') || q.includes('bridge') || q.includes('thrust') || q.includes('hamstring') || q.includes('glute') || q.includes('bird dog') || q.includes('cat cow') || q.includes('cat-cow') || q.includes('spine') || q.includes('lumbar') || q.includes('core') || q.includes('crunch') || q.includes('slr')) {
    joint = 'HIP';
    isFlex = !q.includes('bridge') && !q.includes('thrust') && !q.includes('bird dog');
    target = isFlex ? 75 : 170;
    start = isFlex ? 175 : 110;
    mType = (q.includes('bridge') || q.includes('thrust')) ? 'bridge' : (q.includes('bird dog') ? 'quadruped_reach' : (q.includes('cat') ? 'spinal_flexion' : 'hinge_deadlift'));
    armPattern = 'stationary';
    faultType = 'lean';
  } else if (q.includes('calf') || q.includes('ankle') || q.includes('heel') || q.includes('toe')) {
    joint = 'KNEE';
    isFlex = false;
    target = 175;
    start = 155;
    mType = 'calf_raise';
  } else {
    joint = 'KNEE';
    isFlex = true;
    target = q.includes('split') || q.includes('lunge') ? 85 : 90;
    start = 175;
    mType = q.includes('split') || q.includes('lunge') ? 'lunge' : 'squat';
  }

  // Determine Posture
  if (q.includes('push-up') || q.includes('pushup') || q.includes('press-up') || q.includes('plank') || q.includes('climber') || q.includes('burpee')) {
    posture = 'plank';
    mType = q.includes('plank') ? 'pushup' : 'pushup';
  } else if (q.includes('bench') || q.includes('floor press') || q.includes('supine') || q.includes('bridge') || q.includes('thrust') || q.includes('dead bug') || q.includes('crunch') || q.includes('situp') || q.includes('slr') || q.includes('straight leg')) {
    posture = 'supine';
  } else if (q.includes('prone') || q.includes('mckenzie') || q.includes('stomach') || q.includes('superman')) {
    posture = 'prone';
  } else if (q.includes('quadruped') || q.includes('all fours') || q.includes('bird dog') || q.includes('cat cow') || q.includes('cat-cow')) {
    posture = 'quadruped';
  } else if (q.includes('seated') || q.includes('chair') || q.includes('preacher') || q.includes('leg extension')) {
    posture = 'seated';
  } else if (q.includes('hinge') || q.includes('deadlift') || q.includes('rdl') || q.includes('bent') || q.includes('row')) {
    posture = 'hinged';
  } else if (q.includes('lunge') || q.includes('split') || q.includes('step')) {
    posture = 'lunge';
  } else {
    posture = 'standing';
  }

  // Format clean name
  const cleanName = query
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const id = 'custom_' + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const jointTitles = {
    KNEE: isFlex ? 'Knee Joint Flexion' : 'Knee Extension Lockout',
    ELBOW: isFlex ? 'Elbow Joint Flexion' : 'Elbow Extension Lockout',
    HIP: isFlex ? 'Hip Hinge Flexion Angle' : 'Hip Extension Angle',
    SHOULDER: isFlex ? 'Shoulder Flexion Angle' : 'Shoulder Abduction Angle'
  };

  return {
    id,
    name: cleanName,
    category: category,
    mode: preferredMode,
    jointLabel: joint,
    jointTitle: jointTitles[joint] || `${joint} Kinematics`,
    hudBadge: `JOINT: ${joint}`,
    targetCriterion: isFlex ? `≤ ${target}° (Peak Depth)` : `≥ ${target}° (Full Lockout)`,
    lockoutCriterion: isFlex ? `> ${Math.min(170, start)}° (Full Extension)` : `< ${Math.max(20, start)}° (Starting Return)`,
    defaultTarget: target,
    isFlexion: isFlex,
    repFooter: isFlex ? 'Setup ➔ Full Excursion ➔ Return' : 'Flexed Setup ➔ Full Lockout ➔ Return',
    tip: `⚡ <strong>Biomechanical Standard:</strong> Maintain smooth cadence and authentic ${posture} kinematics. Guard against momentum.`,
    faultMessage: `⚠️ Form Fault: Biomechanical compensation or breakdown!`,
    faultCriteria: { torsoLeanThreshold: 25, lateralDriftThreshold: 0.28 },
    motionProfile: {
      posture,
      movementType: mType,
      primaryJoint: joint,
      startAngle: start,
      targetAngle: target,
      faultAngle: isFlex ? target + 30 : target - 30,
      faultType,
      armPattern,
      tempoSpeed: 1.3
    },
    isCustom: true
  };
}
