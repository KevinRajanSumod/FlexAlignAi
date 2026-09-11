# FlexAlign AI — Biomechanics & Evaluator Engine

This document outlines the mathematical trigonometry, MediaPipe landmark topology, repetition state machine, and form fault algorithms implemented in `js/math.js`, `js/exercises.js`, and `js/evaluator.js`.

---

## 1. 3D Vector Trigonometry (`js/math.js`)

### 1.1 Joint Angle Calculation (`calculateJointAngle`)
Computes the interior angle in degrees at vertex joint $B$ formed by vectors $\vec{BA}$ and $\vec{BC}$:

$$\vec{v_1} = A - B, \quad \vec{v_2} = C - B$$
$$\cos(\theta) = \frac{\vec{v_1} \cdot \vec{v_2}}{\|\vec{v_1}\| \|\vec{v_2}\|}$$
$$\theta = \arccos\left(\text{clamp}(\cos(\theta), -1.0, 1.0)\right) \times \frac{180^\circ}{\pi}$$

```javascript
export function calculateJointAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cosTheta) * 180) / Math.PI);
}
```

### 1.2 Torso Lean Deviation (`calculateTorsoLean`)
Calculates angular deviation of the spine vector (Hip to Shoulder) relative to the global vertical Y axis.

---

## 2. MediaPipe Pose Landmark Indices

| Landmark ID | Anatomical Name | Used in Joint Calculation |
|---|---|---|
| `11` / `12` | Left / Right Shoulder | Vertex for Shoulder Angle, Proximal for Elbow |
| `13` / `14` | Left / Right Elbow | Vertex for Elbow Flexion & Extension |
| `15` / `16` | Left / Right Wrist | Distal for Elbow Angle |
| `23` / `24` | Left / Right Hip | Vertex for Hip Hinge, Proximal for Knee |
| `25` / `26` | Left / Right Knee | Vertex for Knee Flexion & Squats |
| `27` / `28` | Left / Right Ankle | Distal for Knee Angle |

---

## 3. Repetition State Machine (`js/evaluator.js`)

The evaluator tracks movement cadence through 5 states:
1. `IDLE / READY`: Joint is in neutral starting position.
2. `INFLECTION`: Joint angle moves past the hysteresis trigger into active repetition excursion.
3. `TARGET_REACHED`: Joint angle meets or exceeds target depth/extension (e.g. $\le 90^\circ$ for Squats, $\le 45^\circ$ for Curls, $\ge 165^\circ$ for Pushdowns). Audio cue fires.
4. `RETURNING`: Eccentric or return phase begins back toward starting position.
5. `REP_COMPLETE`: Joint crosses lockout criterion. Counter increments by 1; compliance score and peak ROM are logged.

```
 [IDLE] ──(excursion starts)──> [INFLECTION] ──(reaches target)──> [TARGET_REACHED]
   ▲                                                                     │
   │                                                                     │ (begins return)
   └────────── [REP_COMPLETE] <──────── [RETURNING] <────────────────────┘
               (rep++, chime)
```

---

## 4. Form Fault Detection Algorithms

| Exercise | Monitored Fault | Mathematical Condition | Feedback Message |
|---|---|---|---|
| **Squat / Lunge** | Knee Valgus Collapse | Knee X deviates inward toward midline relative to Hip-Ankle axis | `⚠️ Knee Valgus: Push knees outward over toes!` |
| **Squat / Deadlift** | Excessive Torso Lean | Torso lean deviation $> 35^\circ$ | `⚠️ Spine Deviation: Keep chest upright!` |
| **Bicep Curl** | Upper Arm Sway | Shoulder-Elbow displacement in Z or Y axis $> 0.15$ | `⚠️ Elbow Sway: Pin elbows against ribcage!` |
| **Pushdown** | Incomplete Lockout | Angle does not reach $165^\circ$ before returning | `⚠️ Incomplete ROM: Lock out triceps fully!` |
| **PT Mode (Any)** | Safe Ceiling Violation | Joint angle exceeds physician-set slider ceiling | `⚠️ Safe ROM Exceeded: Lower arm below ceiling!` |
