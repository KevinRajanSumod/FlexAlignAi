# FlexAlign AI — AI Prompts Playbook

This document contains **ready-to-use, sequential AI prompts** designed to instruct an AI coding model to build FlexAlign AI step-by-step from an empty directory.

---

## Stage 1: Foundation & Semantic Layout (`index.html`)

### AI Prompt 1:
```markdown
Create `index.html` for FlexAlign AI, a clinical and athletic posture & range-of-motion analyzer.
Requirements:
1. Include Google Fonts: 'Inter' (300 to 800) and 'JetBrains Mono' for telemetry readouts.
2. Link modular CSS files: `css/main.css`, `css/header.css`, `css/viewport.css`, `css/dashboard.css`.
3. Add a Three.js importmap importing "three" (cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js) and "three/addons/".
4. Include MediaPipe Pose CDN: `@mediapipe/camera_utils/camera_utils.js` and `@mediapipe/pose/pose.js`.
5. Add an Early Controller Bridge in `<script>` on `window.app` to queue button clicks before ES modules finish loading.
6. Create top bar with brand logo ⚡ "FlexAlign AI", mode toggle buttons (Gym Mode vs Physical Therapy Mode), and session status pill.
7. Build dual viewport container with:
   - Real-time webcam `<video id="webcam">` and `<canvas id="outputCanvas">`
   - Three.js 3D avatar viewport `<div id="avatar3dContainer">` with overlay HUD
   - Exercise control bar with: Exercise dropdown `<select id="exerciseSelect">`, Side toggle (`Auto`, `Left`, `Right`), Camera toggle button, 3D Simulation toggle button, Inject Fault toggle button, and "✨ Gemini AI Lab" button.
8. Create "Gemini AI Exercise Lab" modal overlay (`#aiExerciseModal`) under the viewport containing:
   - Tabs: "➕ Add New Exercise" and "🛠️ Modify Active Exercise"
   - Quick preset chips (Romanian Deadlift, Bulgarian Split Squat, Push-Up, Wall Angels, Lunges)
   - Specific exercise selector row (`#aiModifyExerciseSelectRow`) with dropdown (`#aiModifyExerciseSelect`) visible only on Modify tab
   - Textarea prompt (`#aiExercisePrompt`), Target Joint selector, Target Mode selector, and Submit button
   - "Did You Mean?" unrecognized exercise suggestions card (`#aiExerciseSuggestionsCard`) with `#aiSuggestionPills`
   - Live Biomechanical Specification Preview card (`#aiExercisePreviewCard`) showing target ROM, lockout, fault, 3D Motion Pattern, tip, and "🚀 Add to Exercise Menu & Run in 3D Sim" button.
9. Create dashboard panel on the right with:
   - Unified Telemetry Card: Live angle readout hero, SVG radial dial, and real-time waveform canvas (`#waveformCanvas`).
   - Mode-Adaptive Metrics Card: Rep Counter & Target Progress (Gym mode) or Safe ROM Ceiling Slider & Protection gauge (PT mode).
   - Biomechanical Coaching Drawer: Collapsible floating coach tab with "Hey Coach" voice listener badge, ElevenLabs voice selector dropdown, chat message log, and text input with quick prompts.
10. Load main module `<script type="module" src="./js/app.js"></script>`.
```

---

## Stage 2: Glassmorphic Design System (`css/*.css`)

### AI Prompt 2:
```markdown
Generate the complete CSS suite for FlexAlign AI across 4 files:
1. `css/main.css`:
   - Design tokens: CSS variables for colors, dark mode background `#0a0b10`, surface `#13151f`, borders `rgba(255,255,255,0.08)`.
   - Dual theme classes: `.theme-gym` (emerald `#10b981`, cyber purple `#a855f7`) and `.theme-pt` (cyan `#06b6d4`, electric blue `#3b82f6`).
   - Micro-animations: `@keyframes pulse`, `@keyframes glow`, `@keyframes slideUp`, custom scrollbars.
2. `css/header.css`:
   - Flexbox top navigation bar with blur effect `backdrop-filter: blur(16px)`.
   - Mode buttons with glowing active pills and smooth gradient backgrounds.
3. `css/viewport.css`:
   - Responsive aspect-ratio viewport container.
   - Video and Canvas layering with perfect 1:1 pixel coordinate alignment.
   - 3D Avatar canvas container with subtle radial lighting vignette.
   - Glassmorphic Gemini AI Exercise Lab modal (`#aiExerciseModal`) with slide-up entry, preset chip buttons, and spec preview grid.
   - Styles for `#aiExerciseSuggestionsCard` with amber glow border, suggestion pills with hover lift, and icon tags.
4. `css/dashboard.css`:
   - High-density telemetry dashboard.
   - Radial SVG progress dial with stroke-dasharray animation.
   - Rep counter hero typography with energetic pass animations.
   - Biomechanical Coaching Drawer with glassmorphic cards, user/coach chat bubbles, speech audio indicator waves, and mic status badges.
```

---

## Stage 3: Biomechanical Math & Exercises Registry (`math.js` & `exercises.js`)

### AI Prompt 3:
```markdown
Create `js/math.js` and `js/exercises.js` for FlexAlign AI:
1. In `js/math.js`:
   - `calculateJointAngle(a, b, c)`: Compute 3D Euclidean vector angle in degrees at vertex joint B using dot product and magnitude clipping [-1, 1].
   - `calculateTorsoLean(shoulder, hip)`: Compute deviation of spine vector from vertical in degrees.
   - `calculateDistance(a, b)`: 3D Euclidean distance between landmarks.
2. In `js/exercises.js`:
   - Define `GYM_EXERCISES`:
     - `gym_squat`: Knee flexion, target <= 90°, lockout > 160°.
     - `gym_curl`: Elbow flexion, target <= 45°, lockout > 155°.
     - `gym_extension`: Triceps Pushdown, elbow extension, target >= 165°, setup < 85°.
     - `gym_press`: Overhead press, elbow extension, target > 160°, rack < 90°.
   - Define `PT_EXERCISES`:
     - `pt_raise`: Shoulder Lateral Raise, safe ceiling slider (70°-120°, default 100°).
     - `pt_knee_ext`: Seated Knee Extension, safe limit (120°-175°, default 160°).
     - `pt_elbow_ext`: Elbow Extension Lockout Rehab (140°-180°, default 165°).
     - `pt_elbow_flex`: Elbow Flexion Mobility (45°-120°, default 90°).
   - Implement `CUSTOM_EXERCISES` dynamic registry with functions:
     - `registerExercise(exDef)`: Registers or updates an exercise in `CUSTOM_EXERCISES` and respective mode catalog.
     - `modifyExerciseDefinition(id, updates)`: Applies updates to an existing exercise.
     - `getExerciseDefinition(id)`: Looks up exercise by ID across all registries.
     - `getAllExercisesForMode(mode)`: Returns dictionary of all exercises for active mode.
```

---

## Stage 4: Evaluator & Repetition State Machine (`evaluator.js`)

### AI Prompt 4:
```markdown
Create `js/evaluator.js` with class `ExerciseEvaluator`:
1. Constructor takes `audio` engine instance and initializes mode ('gym' or 'pt'), current exercise, active tracking side ('left' or 'right').
2. Maintain rep counting state machine:
   - States: `IDLE`, `INFLECTION` (approaching target), `TARGET_REACHED`, `RETURNING`, `REP_COMPLETE`.
   - Distinguish Flexion exercises (angle decreases toward target) from Extension exercises (angle increases toward target).
   - Read dynamic `motionProfile` startAngle and targetAngle for custom exercises.
3. Form Fault Detection:
   - Detect valgus knee collapse (X-coordinate knee drift toward midline).
   - Detect trunk forward lean via `calculateTorsoLean`.
   - Detect upper arm flare / sway during bicep curls and triceps pushdowns.
   - Detect safe ceiling threshold violations in Physical Therapy mode.
4. Metric Tracking:
   - Track total repetitions, peak ROM per rep, compliance score percentage, fault count, and rep history.
   - Fire audio cues: target chime when reaching target depth/lockout, and success fanfare upon valid rep completion.
5. Export methods:
   - `evaluatePose(landmarks)`: Returns evaluation payload `{ angle, target, state, isTargetMet, fault, reps, compliance }`.
   - `resetMetrics()`: Clears rep count, faults, and history.
   - `exportSessionData()`: Generates CSV string for data download.
```

---

## Stage 5: Three.js 3D Avatar & Kinematic Simulator (`avatar3d.js` & `simulator.js`)

### AI Prompt 5:
```markdown
Create `js/avatar3d.js` and `js/simulator.js`:
1. In `js/avatar3d.js`:
   - Build `Avatar3DRenderer` using Three.js with WebGLRenderer, perspective camera, ambient & directional lighting, soft shadows, and cybernetic ground grid.
   - Build stylized humanoid rig with head, neck, spine, shoulders, elbows, wrists, pelvis, hips, knees, and ankles connected by cylindrical bone mesh links and glowing spherical joint markers.
   - Implement `updateFromLandmarks(landmarks)`: Map normalized 3D landmarks into world positions, orienting torso, limbs, and joints with smooth slerp/lerp interpolation.
2. In `js/simulator.js`:
   - Build `MotionSimulator` that generates synthetic 33-landmark MediaPipe arrays running at 60 FPS using sinusoidal time cycles.
   - Built-in simulation patterns: Squat, Bicep Curl, Triceps Pushdown, Overhead Press, Lateral Raise, Knee Extension.
   - Implement Universal Kinematic Synthesizer `_synthesizeCustomMotion(customDef, cycle, isFault)`:
     - Handles 11 distinct patterns: curls, triceps pushdowns, overhead presses, lateral raises, front raises, horizontal push-ups, Romanian Deadlifts (hip hinge), Bulgarian split squats/lunges, calf raises, seated leg extensions, and bilateral squats.
     - Adapts starting angle, peak target angle, cadence, posture ('standing', 'plank', 'seated'), and kinetic fault offsets based on `customDef.motionProfile`.
   - Toggle simulated kinetic faults (e.g. knee valgus collapse, torso rounding, elbow flare) via `toggleFault()`.
```

---

## Stage 6: 2D HUD Canvas & Web Audio Telemetry (`renderer.js`, `audio.js`, `waveform.js`)

### AI Prompt 6:
```markdown
Create `js/renderer.js`, `js/audio.js`, and `js/waveform.js`:
1. In `js/renderer.js`:
   - Class `HUDRenderer`: Renders 2D visual telemetry on canvas over the video feed.
   - Draw glowing skeletal vector lines between connected landmarks.
   - Draw circular joint markers with real-time feedback colors (Green = target reached, Blue = in active range, Red = form fault).
   - Draw active angle arc dial and text label directly at the monitored vertex joint.
2. In `js/audio.js`:
   - Class `AudioEngine` using browser Web Audio API:
   - `playTargetBeep()`: Crisp two-tone harmonic chime when joint reaches target excursion.
   - `playRepSuccess()`: Ascending major triad fanfare on successful repetition.
   - `playFaultAlert()`: Low frequency pulse alert for biomechanical breakdown.
3. In `js/waveform.js`:
   - Class `WaveformChart`: Draws real-time rolling angular excursion waveform graph with target line and safe threshold boundary.
```

---

## Stage 7: Gemini AI Coach & Exercise Lab (`gemini.js`)

### AI Prompt 7:
```markdown
Create `js/gemini.js` with class `GeminiCoach`:
1. Use Google Gemini API (`gemini-3.1-flash-lite`, fallback `gemini-flash-latest`).
2. API Key management: Decode base64 stored key, read from `localStorage`, or prompt via UI.
3. Multi-Turn Conversational Coach:
   - `chat(message, context)`: System instruction grounding coach as clinical biomechanist. Include current exercise, reps, peak ROM, compliance score, and detected faults.
   - Form-aware coaching cues for posture, cadence, safety, and rehabilitation advice.
4. Robust JSON Extraction `_extractJson(rawText)`:
   - Strip markdown code fences (` ```json `) and reliably extract outermost curly braces `{ ... }` to prevent syntax parse failures.
5. Exercise Generation `generateExercise(userPrompt, preferredMode)`:
   - Reference NSCA, ACSM, ExRx kinesiology standards.
   - Unrecognized Query Detection: If prompt is unrecognized/gibberish/non-exercise, return `{ isUnrecognized: true, query, message, suggestions: [{ name, prompt }] }`.
   - For valid exercises, return complete JSON with id, name, category, mode, jointLabel, jointTitle, hudBadge, targetCriterion, lockoutCriterion, defaultTarget, isFlexion, repFooter, tip, faultMessage, faultCriteria, and `motionProfile`.
6. Exercise Modification `modifyExercise(existingDef, userInstruction)`:
   - Preserve existing exercise ID, name, and category unless user explicitly requests renaming.
   - Update target angles, fault sensitivity, coaching tips, and motionProfile based on user request.
7. Biomechanical Offline Fallback Generator `_generateFallbackExercise(userPrompt, mode)`:
   - Detects unknown/gibberish terms and returns suggestion structure.
   - Synthesizes fallback exercises for deadlifts, curls, presses, lunges, pushups, wall angels, and calf raises.
```

---

## Stage 8: Voice Engine & Main Application Controller (`elevenlabs.js`, `voice-listener.js`, `app.js`)

### AI Prompt 8:
```markdown
Create `js/elevenlabs.js`, `js/voice-listener.js`, and `js/app.js`:
1. In `js/elevenlabs.js`:
   - `ElevenLabsVoice`: Stream neural voice audio from ElevenLabs REST API with fallback to browser `window.speechSynthesis`.
2. In `js/voice-listener.js`:
   - `VoiceListener`: Hands-free "Hey Coach" wake word detection via Web Speech `SpeechRecognition`. Listens continuously and invokes callback when user speaks a question.
3. In `js/app.js`:
   - `FlexAlignApp`: Main orchestrator initializing Audio, Evaluator, Simulator, 3D Avatar, Gemini Coach, Voice Listener, and Waveform.
   - MediaPipe Pose camera loop with side auto-detection hysteresis.
   - Mode switching (`setMode('gym' | 'pt')`) updating theme classes and UI cards.
   - Exercise switching (`setExercise(id)`) updating evaluators, sliders, and HUD labels.
   - Simulation controls (`toggleSimulation()`, `toggleSimFault()`).
   - Gemini AI Lab methods:
     - `openAiExerciseModal()` and `closeAiExerciseModal()`.
     - `setAiLabTab('add' | 'modify')`: When 'modify', displays `#aiModifyExerciseSelectRow` and populates `#aiModifyExerciseSelect` with all gym, pt, and custom exercises.
     - `syncModifyExerciseSelection()`: Syncs prompt label, pre-fills textarea with target angle adjustment for selected exercise, and selects target joint & mode.
     - `applyAiPreset(presetKey)`: Populates preset prompt and auto-generates.
     - `applyAiSuggestion(promptText)`: Applies clicked suggestion pill, switches to add tab, and auto-generates.
     - `generateOrModifyAiExercise()`: Calls Gemini; handles `result.isUnrecognized` by rendering suggestion pills, or renders preview card on success.
     - `launchGeneratedExercise()`: Registers exercise, updates dropdown, selects it, and starts 3D simulator.
   - Chat drawer toggle, session export to CSV, and resilient bootloader `bootApp()`.
```
