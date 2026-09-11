# FlexAlign AI — Comprehensive System Architecture & Complete Recreation Guide

This document is a comprehensive, production-grade guide detailing every feature, architectural pattern, mathematical formulation, and visual enhancement implemented in FlexAlign AI. With these detailed instructions, you can recreate the entire system from scratch with complete fidelity.

---

## 1. Project Directory & Component Architecture

The codebase has been refactored into a clean, decoupled modular structure:

```
FlexAlignAi/
├── index.html                           # Single-page interface with responsive viewports, docks, & modals
├── css/
│   ├── main.css                         # Dark cyber-aesthetic design system, tokens, typography, HUD
│   └── components/                      # Modular styling (dock, call overlay, coach drawer, modals)
├── js/
│   ├── app.js                           # Core orchestrator coordinating state, streams, and components
│   ├── avatar3d.js                      # Three.js 3D Humanoid Avatar with musculature & dynamic equipment
│   ├── evaluator.js                     # Biomechanical ROM calculator, repetition counter, & fault detector
│   ├── exercises.js                     # 70+ clinical & gym exercise directory with procedural generator
│   ├── math.js                          # Vector math (3D angles, dot products, cross products, projections)
│   ├── audio.js                         # Web Audio API sound effects (rep chimes, warnings, countdowns)
│   ├── elevenlabs.js                    # Ultra-realistic neural speech synthesis for AI Coach
│   ├── voice-listener.js                # Continuous speech recognition with VAD and turn-taking
│   ├── gemini.js                        # Google Gemini 2.5 Flash API client for clinical kinesiology & AI Lab
│   ├── renderer.js                      # 2D Canvas HUD overlays, angle arcs, gridlines, skeleton rendering
│   ├── waveform.js                      # Real-time ROM excursion oscilloscope / kinetic waveform monitor
│   ├── components/
│   │   ├── camera-tracker.js            # MediaPipe Pose video tracking, auto-mirroring, side resolution
│   │   ├── hud-manager.js               # Rep tables, compliance badges, camera docks, quick-zoom widget
│   │   ├── coach-drawer.js              # Slide-out AI Coach panel, dynamic tips, voice playback
│   │   ├── call-overlay.js              # Full-duplex interactive voice call mode with AI Coach
│   │   └── ai-lab-modal.js              # AI Exercise Lab modal for procedural exercise generation
│   └── simulation/
│       ├── simulator.js                 # Virtual Biomechanical Motion Simulator orchestrator
│       ├── gym-kinematics.js            # Gym strength motion generators (Squat, Deadlift, Bench, etc.)
│       ├── pt-kinematics.js             # Physical therapy rehabilitation generators (ACL, Rotator Cuff, etc.)
│       └── procedural-kinematics.js     # Instant procedural 3D motion synthesizer
└── summarisation.md                     # Complete recreation and implementation manual
```

---

## 2. Core Feature Implementations & Technical Details

### A. Dynamic 3D Humanoid Biomechanical Avatar (`js/avatar3d.js`)

#### 1. Anatomical Musculature via Smooth Capsules
- **Primitives Replaced**: All generic box and cylindrical shapes were replaced with anatomical `CapsuleGeometry` and `SphereGeometry` to emulate authentic human musculature (pectorals, deltoids, biceps, triceps, quadriceps, gastrocnemius calves, and cervical neck).
- **Proportional Scaling (`_lmTo3D`)**:
  To prevent slender or elongated figures, landmark coordinate normalization utilizes aspect-ratio-corrected scale factors:
  ```javascript
  const scaleX = scale * 1.26; // Broad athletic shoulder and hip girth
  const scaleY = scale * 0.95; // Anatomically proportional vertical height
  const scaleZ = scale * 1.05; // Depth
  ```
- **Organic Articulated Hands**:
  Each hand is sculpted with an anatomical palm base (`BoxGeometry`), knuckle arch (`CylinderGeometry`), 4 curled athletic fingers (`CapsuleGeometry` naturally flexed inward at `-Math.PI * 0.35`), and an opposable thumb angled inward.
- **Cross-Trainer Footwear**:
  Sculpted athletic sneakers with thick cushioned midsoles, cyan accent stripes, ergonomic uppers, padded ankle collars, and toe caps.
- **Dynamic Breathing Cycle**:
  In `_renderLoop()`, the upper thoracic chest and collar expand and contract smoothly using a harmonic sinusoidal wave (`performance.now() * 0.0022` with a 2.2% volumetric expansion), bringing the avatar to life.

#### 2. Full 3D Camera Manipulation & Controls
- **OrbitControls**: Configured with damping (`dampingFactor: 0.08`), min/max distance clamping (1.4m to 12.0m), and customized multi-touch / mouse bindings:
  - **Left Click / 1-Finger Drag**: 360° rotational orbit
  - **Right Click / 2-Finger Drag**: Screen-space camera panning
  - **Scroll Wheel / Pinch**: Smooth zoom dolly
- **View Presets**: One-click camera transitions (`front`, `side` [sagittal profile], `side_left`, `iso` [3/4 angle], and `top` [elevated overhead 45°]).
- **X-Ray Biomechanical Mode**: Toggles materials dynamically to translucent cyber-blue physical glass shaders (`MeshPhysicalMaterial` with clearcoat, roughness 0.15, metalness 0.85, opacity 0.45), allowing visualization of internal skeletal alignment.
- **Interactive Joint Raycasting**: Hovering or clicking on any anatomical joint displays its biomechanical label, highlights the sphere, and smoothly focuses the camera on that joint.

---

### B. Dynamic 3D Exercise Equipment Engine (`js/avatar3d.js`)

#### 1. Equipment Models Built from Scratch
1. **Hex Dumbbells (`_createHexDumbbell`)**:
   - Knurled chrome steel handle (`CylinderGeometry(0.014, 0.014, 0.17)`).
   - Textured center grip band (`0x273450`).
   - Inner safety collars (`CylinderGeometry(0.022, 0.022, 0.016)`).
   - Hexagonal rubber bumper plates (`CylinderGeometry(0.065, 0.065, 0.052, 6)`).
   - Outer beveled end caps and glowing cyan accent rings (`TorusGeometry(0.066, 0.005)`).
2. **Tournament Olympic Barbell (`_createBarbell`)**:
   - 1.62m Olympic chrome bar (`CylinderGeometry(0.015, 0.015, 1.62)`).
   - Knurling grip markers at `±0.22m` and `±0.42m`.
   - Inner sleeve stops and rotating bushings at `±0.50m`.
   - 20kg competition bumper plates (450mm scale, `0.21m` radius) with perimeter cyan rings.
   - 10kg secondary plates (`0.16m` radius) and quick-release collar locks.
3. **Competition Kettlebell (`_createKettlebell`)**:
   - Matte cast-iron sphere (`0.115m` radius) with flat bottom platform.
   - Wide ergonomic chrome handle (`TorusGeometry(0.075, 0.016, 12, 24, Math.PI)`).
   - Vertical riser horns and laser-etched weight spec badge with electric cyan emissive ring.
4. **Overhead Pull-Up Rig (`_createPullUpBar`)**:
   - 1.35m chrome bar with dual knurled foam grip pads and cyan accents.
   - Dual vertical matte steel support stanchions (`2.7m` tall).
5. **Parallel Dip Bars (`_createDipBars`)**:
   - Dual parallel chrome dipping rails at hip height (`0.95m` length, `0.72m` total span).
   - Four vertical steel support legs with rubber floor stabilizer feet.

#### 2. Biomechanical Attachment & Kinematic Assignment (`_updateEquipment`)
- **Dumbbell Attachment**:
  - Attached directly inside the palm/grip of each hand (`handPosL`, `handPosR`).
  - Orthonormal orientation constructed via `Matrix4.makeBasis()`:
    - **Neutral / Sagittal Grip** (`gripDir = (0, 0, 1)`) for Hammer Curls, Lateral Raises, Front Raises, Reverse Lunges, Bulgarian Split Squats, and Calf Raises.
    - **Coronal / Horizontal Grip** (`gripDir = (1, 0, 0)`) for Bicep Curls, Overhead Shoulder Press, Arnold Press, and Dumbbell Floor Press.
    - **Single Dumbbell**: For Single-Arm Dumbbell Row, only the active rowing hand holds a dumbbell.
- **Barbell Attachment**:
  - **Pulls & Presses (Deadlift, RDL, Bent-Over Row, Bench Press)**: Bridges seamlessly between `handPosL` and `handPosR` along `barDir = (handPosR - handPosL).normalize()`.
  - **Good Morning**: Rests securely across upper trapezius muscles behind neck (`midShoulder.y + 0.04, midShoulder.z - 0.07`) and rotates with spinal hinge.
  - **Glute Bridge / Hip Thrust**: Rests across the pelvis (`midHip.y + 0.04, midHip.z + 0.07`) and moves dynamically with hip extension.
- **Kettlebell Attachment**:
  - **Goblet Squat**: Cupped by the horns at upper sternum (`midHands.y - 0.095, midHands.z + 0.04`), with the handle held directly between both palms.
  - **Sumo Squat**: Hanging straight down between the thighs (`midHands.y - 0.10, midHands.z + 0.02`).
- **Calisthenics & Bodyweight Isolation**:
  - Exercises requiring zero equipment (Bodyweight Squat, Standard Push-Up, Diamond Push-Up, High Plank, Crunch, and PT mobility exercises) strictly hide all equipment items (`visible = false`).

---

### C. Distinct Exercise Kinematics & Simulation Mode (`js/simulation/`)

#### 1. Differentiation of Similar Exercises
Previously identical exercises were given unique kinematic profiles:
- **Bodyweight Squat vs. Goblet Squat vs. Sumo Squat**:
  - Bodyweight Squat: Shoulder-width stance, hands extended for counterbalance, 90° knee flexion.
  - Goblet Squat: Narrower stance, upright chest, hands cupped at sternum holding kettlebell, 85° deep parallel depth.
  - Sumo Squat: 1.5x wide stance, toes turned out 35°, vertical torso, kettlebell hanging between thighs.
- **Conventional Deadlift vs. Romanian Deadlift (RDL) vs. Good Morning**:
  - Conventional Deadlift: Combined knee bend (110°) and deep hip hinge (70°), lifting bar from floor to lockout.
  - RDL: Pure posterior hip hinge (75°), knees soft but fixed at 155°, bar skims thighs.
  - Good Morning: Barbell on upper traps, knees soft, torso hinges to near horizontal (80°).
- **Standard Push-Up vs. Diamond Push-Up**:
  - Standard Push-Up: Hands shoulder-width apart, 45° elbow flare, 80° elbow depth.
  - Diamond Push-Up: Hands centered beneath sternum forming a triangle apex, elbows tucked close to ribcage, 75° deep tricep flexion.
- **Bicep Curl vs. Hammer Curl**:
  - Bicep Curl: Supinated grip, dumbbells curl in sagittal-coronal arc to anterior shoulders.
  - Hammer Curl: Neutral grip (palms facing inward throughout), purely working the brachialis.

#### 2. Simulation Mode Flawlessness & Zero False Faults
- **Optimal Textbook Kinematics**: When 3D Simulation runs without "Test Fault" active, the simulator generates 100% textbook form.
- **Evaluator Supine/Horizontal Posture Fix**:
  In `js/evaluator.js`, `calculateTorsoLean` measures deviation from vertical `(0, -1, 0)`. For horizontal exercises (Glute Bridge, Floor Press, Bench Press, Pushups), checking `torsoLean > 45°` caused false "Torso Rounding" alarms. This check was restricted strictly to `standing` and `hinged` postures.
- **Procedural Kinematics Argument Order**:
  In `js/simulation/simulator.js`, the argument order for `synthesizeProceduralMotion(lms, exDef, isFault, cycle, dims)` was corrected, fixing the issue where Diamond Push-Up and procedural exercises remained stationary.

---

### D. Full-Duplex AI Coach Talking Mode (`js/components/call-overlay.js` & `js/voice-listener.js`)

#### 1. Interactive Voice Regulation & Natural Conversation
- **Acoustic Echo Cancellation & Noise Suppression**:
  Configures microphone streams with `echoCancellation: true`, `noiseSuppression: true`, and `autoGainControl: true`.
- **Smart Silence Auto-Turn Detection**:
  Calculates RMS audio energy in real time. Automatically detects when the user finishes speaking (1.4s of silence following active speech) and dispatches the prompt to Gemini AI Coach without requiring manual button clicks.
- **Interruption Support**:
  Speaking while the AI Coach is speaking instantly cancels the active speech synthesis and listens to the user.
- **Voice Regulation Sliders**:
  Allows interactive tuning of:
  - **Speaking Speed** (0.75x to 1.5x)
  - **Pitch** (0.8x to 1.3x)
  - **Voice Volume** (0% to 100%)
  - **Preferred Coach Voice selection**
- **Zero-Latency Web Speech Fallback**:
  If the ElevenLabs API key is not configured or experiences network rate limits, the system seamlessly and instantly falls back to high-quality browser Web Speech API speech synthesis (`window.speechSynthesis`), ensuring voice never fails.

---

### E. HUD Layout & Controls Arrangement

#### 1. Non-Colliding Layout
- **Relocated Coaching Popups**:
  Rep feedback cards and coaching banners were moved beneath the 3D control dock (`top: 155px; left: 24px;`), guaranteeing that the 3D camera orbit, view presets, and zoom buttons are never occluded.
- **Dedicated Floating Quick-Zoom Widget (`#avatarQuickZoomWidget`)**:
  Positioned floating on the top-right of the 3D canvas with sleek glassmorphism buttons:
  - `[ + ]`: Zoom in by 0.85x
  - `[ − ]`: Zoom out by 1.15x
  - `[ ⟲ ]`: Reset view preset to Front view

---

### F. Modular Architecture Decomposition

The original monolithic code was cleanly refactored into distinct modules:
1. **`js/components/camera-tracker.js`**: Manages MediaPipe camera initialization, video canvas drawing, automatic body inversion detection, and active side selection (`left`, `right`, `both`).
2. **`js/components/hud-manager.js`**: Manages real-time metric updates (ROM angle, compliance score, rep counts, cadence time), rep history table, toast notifications, view presets, and zoom controls.
3. **`js/components/coach-drawer.js`**: Manages the slide-out coach drawer, Gemini prompt generation, rep-based tips, and ElevenLabs audio playback.
4. **`js/components/call-overlay.js`**: Manages the fullscreen interactive voice call mode, real-time waveform visualizer, volume regulation, and voice activity detection.
5. **`js/components/ai-lab-modal.js`**: Manages the Gemini AI Exercise Lab modal, prompt building, procedural kinematic profile generation, and custom exercise loading.
6. **`js/simulation/`**: Decouples gym, physical therapy, and procedural kinematic algorithms from the main application thread.

---

## 3. Step-by-Step Recreation Walkthrough

To reproduce this application from scratch:

### Step 1: Initialize Workspace & Static Files
1. Create `index.html` with two primary viewport containers:
   - Video container (`#videoContainer`) for 2D MediaPipe tracking.
   - 3D container (`#avatar3dContainer`) with WebGL canvas (`#avatar3dCanvas`).
2. Add control docks:
   - Floating camera controls dock (`#avatarControlDock`).
   - Quick-zoom widget (`#avatarQuickZoomWidget`).
   - Coach tip banner (`#avatarCoachTipBanner`).
   - Interactive Call Overlay modal (`#callOverlay`).

### Step 2: Implement Vector Mathematics (`js/math.js`)
Implement:
- `calculateAngle3D(a, b, c)`: Computes the inner angle between vectors `BA` and `BC` using dot product and arccosine.
- `calculateTorsoLean(shoulder, hip)`: Computes the inclination angle of the spine vector relative to vertical.
- Vector smoothing helpers (exponential moving average / lerp).

### Step 3: Implement Exercise Directory (`js/exercises.js`)
1. Define `GYM_EXERCISES` (Squats, Deadlifts, Lunges, Pushups, Curls, Presses, Dips, Rows).
2. Define `PT_EXERCISES` (Shoulder raises, Pendulums, Wall angels, Knee extensions, TKE, SLR).
3. Implement `getExerciseDefinition(id)`: Returns the exercise definition, or synthesizes a custom procedural definition if not found.

### Step 4: Implement 3D Avatar & Equipment (`js/avatar3d.js`)
1. Import Three.js and OrbitControls from CDN:
   - `three@0.160.0/build/three.module.js`
   - `three@0.160.0/examples/jsm/controls/OrbitControls.js`
2. In `_buildHumanoid()`:
   - Construct head (cranium, jaw, high-tech visor).
   - Construct segmented 3-part flexible torso (chest, abdomen, pelvis) using `CapsuleGeometry`.
   - Construct articulated hands with curled fingers and thumbs.
   - Construct cross-trainer sneakers.
   - Add joint indicator spheres and billboards.
3. In `_buildEquipment()`:
   - Build Hex Dumbbells (`_createHexDumbbell`).
   - Build Olympic Barbell (`_createBarbell`).
   - Build Competition Kettlebell (`_createKettlebell`).
   - Build Pull-Up Rig (`_createPullUpBar`) and Dip Bars (`_createDipBars`).
4. In `updatePose()`:
   - Smooth landmarks with exponential moving average (`lerp(raw, 0.38)`).
   - Place limbs using `_placeLimb` with dynamic bicep and quadricep flexion scaling.
   - Call `_updateEquipment(posWristL, posWristR, dirForearmL, dirForearmR, exercise)`.

### Step 5: Implement Evaluator & Form Analysis (`js/evaluator.js`)
1. Track active exercise state, mode (`gym` vs `therapy`), target ROM angle, and lockout angle.
2. Implement peak detection state machine (`STATE_EXTENDED`, `STATE_FLEXING`, `STATE_PEAK`, `STATE_RETURNING`).
3. Compute form faults:
   - Guard `torsoLean` so horizontal/floor exercises are not falsely penalized.
   - Elbow flare check on pushups.
   - Valgus knee collapse check on squats.
   - Safe ROM thresholds on PT exercises.

### Step 6: Implement Kinematic Simulator (`js/simulation/`)
1. Create `gym-kinematics.js`, `pt-kinematics.js`, and `procedural-kinematics.js`.
2. Generate anatomical landmarks for each exercise cycle (`cycle = 0.5 - 0.5 * Math.cos(t)`).
3. Integrate into `simulator.js` with correct argument forwarding.

### Step 7: Implement AI Voice & Conversation (`js/components/call-overlay.js`)
1. Capture microphone with noise suppression and echo cancellation.
2. Monitor RMS volume for smart silence detection (1.4s auto-turn threshold).
3. Integrate ElevenLabs neural voice with browser Web Speech API fallback.
4. Provide speaking rate, pitch, and volume controls.

### Step 8: Assemble in `js/app.js` & Verify
1. Connect MediaPipe Pose listener or Virtual Simulator to `onPoseResults()`.
2. Update HUD metrics, audio chimes, and 3D Avatar each frame.
3. Run local web server and verify all 44 exercises.

---

## 4. Verification Checklist

- [x] **Dumbbell Exercises**: Display dual/single chrome hex dumbbells in hands with correct orientation (bicep curl, hammer curl, floor press, overhead press, lateral raise, reverse lunge, split squat, dumbbell row).
- [x] **Barbell Exercises**: Display Olympic bumper barbell spanning hands for deadlifts/RDL/bench press/bent row, resting on traps for good morning, and resting across pelvis for glute bridge.
- [x] **Kettlebell Exercises**: Display competition kettlebell cupped at chest for goblet squat, and hanging between thighs for sumo squat.
- [x] **Pull-Up & Dip Rigs**: Display overhead pull-up rig for pull-ups/chin-ups and parallel bars for dips.
- [x] **Bodyweight Calisthenics**: Display zero equipment for standard push-up, diamond push-up, bodyweight squat, plank, and crunch.
- [x] **Diamond Push-Up Motion**: Avatar assumes rigid horizontal plank with hands in diamond shape under chest and descends smoothly.
- [x] **Simulation Form Compliance**: Default simulation runs with 100% compliance, 0 false errors, and clean rep counts.
- [x] **AI Coach Call Mode**: Interactive voice mode functions with voice regulation controls, silence turn-taking, and zero-latency audio fallback.
- [x] **Controls Accessibility**: 3D orbit, zoom widget, and view presets remain completely visible without popup overlap.
