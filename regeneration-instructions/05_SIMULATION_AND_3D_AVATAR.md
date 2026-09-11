# FlexAlign AI — 3D Avatar & Simulation Engine

This document details the Three.js 3D Avatar rigging in `js/avatar3d.js` and the Universal Kinematic Motion Synthesizer in `js/simulator.js`.

---

## 1. Three.js 3D Avatar Rig (`js/avatar3d.js`)

The 3D Avatar provides a live visual representation of human movement, running smoothly at 60 FPS in WebGL:

### 1.1 Scene & Camera Setup
- **Renderer:** `THREE.WebGLRenderer` with `antialias: true`, `alpha: true`, and shadows enabled.
- **Camera:** `THREE.PerspectiveCamera` ($45^\circ$ FOV, aspect ratio synced to container, position `(0, 1.2, 2.8)` looking at `(0, 0.9, 0)`).
- **Lighting:**
  - Ambient light (`#ffffff`, intensity 0.6) for balanced ambient visibility.
  - Directional key light (`#ffffff`, intensity 0.85, castShadow: true) at `(2, 4, 3)`.
  - Cyan/Purple fill lights (`#06b6d4` & `#a855f7`) at opposing sides for cybernetic edge illumination.
- **Environment:**
  - Circular dark grid floor (`THREE.GridHelper`) with glowing emerald or cyan grid lines.

### 1.2 Humanoid Skeletal Mesh
- **Joint Markers:** `THREE.SphereGeometry` meshes rendered at head, neck, shoulders, elbows, wrists, spine, hips, knees, and ankles.
  - Joint material: Semi-translucent glowing cybernetic physical material (`roughness: 0.2`, `metalness: 0.8`, `emissive: #10b981`).
- **Bone Segments:** `THREE.CylinderGeometry` connecting paired joint coordinates.
  - Dynamically oriented each frame via vector difference:
    ```javascript
    const p1 = joints[startJoint].position;
    const p2 = joints[endJoint].position;
    boneMesh.position.copy(p1).lerp(p2, 0.5);
    boneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    boneMesh.scale.set(1, p1.distanceTo(p2), 1);
    ```

---

## 2. Universal Kinematic Motion Synthesizer (`js/simulator.js`)

The `MotionSimulator` generates synthetic 33-landmark MediaPipe arrays using sinusoidal time cycles ($cycle = \frac{1 - \cos(\omega t)}{2} \in [0, 1]$).

### 2.1 Supported 3D Motion Patterns

| Pattern ID | Movement Type | Monitored Joint | Key Landmarks Affected | Fault Simulation |
|---|---|---|---|---|
| **1. Curls** | `curl` | Elbow | Wrists (15, 16), Elbows (13, 14) | Upper arm torso swing |
| **2. Pushdowns** | `pushdown` | Elbow | Forearm descent to $170^\circ$ lockout | Incomplete lockout & elbow drift |
| **3. Overhead Press** | `press_overhead` | Elbow / Shoulder | Wrists vertical extension above head | Lumbar hyperextension |
| **4. Lateral Raise** | `lateral_raise` | Shoulder | Abduction arc from $18^\circ$ to $85^\circ+$ | Shoulder hiking & scapular shrug |
| **5. Front Raise** | `front_raise` | Shoulder | Anterior sagittal arm flexion | Torso backward lean |
| **6. Push-Up** | `press_horizontal` | Elbow | Horizontal chest push from plank | Elbow flaring $> 70^\circ$ & hip sag |
| **7. RDL Hinge** | `hinge_deadlift` | Hip | Deep hip hinge with soft knees | Spinal rounding & excessive knee flexion |
| **8. Lunges / Split** | `lunge` | Knee | Unilateral lead leg drop | Knee valgus collapse inward |
| **9. Calf Raise** | `calf_raise` | Knee / Ankle | Full body vertical plantarflexion | Forward hip rocking |
| **10. Seated Leg Ext**| `seated_leg_ext` | Knee | Seated position, tibia extension arc | Lumbar slump |
| **11. Bilateral Squat**| `squat` | Knee | Hip drop, knee forward excursion | Knee valgus shift & forward pitch |

### 2.2 Dynamic Kinematic Mapping
For any custom or modified exercise, the simulator reads `motionProfile`:
```javascript
const mp = customDef.motionProfile;
const startDeg = mp.startAngle !== undefined ? mp.startAngle : 165;
const targetDeg = isFault
  ? (mp.faultAngle !== undefined ? mp.faultAngle : 115)
  : (mp.targetAngle !== undefined ? mp.targetAngle : (customDef.defaultTarget || 85));

// Compute angle along active cycle:
const currentDeg = startDeg + cycle * (targetDeg - startDeg);
```
This enables the simulator to animate **any** exercise described by the user in natural language with genuine biomechanical kinematics.
