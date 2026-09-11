# FlexAlign AI — System Overview & Architecture

## 1. Project Mission & Identity
**FlexAlign AI** is a clinical- and athletic-grade, browser-native exercise posture and Range-of-Motion (ROM) biomechanical analyzer. Powered by MediaPipe Pose, Three.js 3D avatars, and Google Gemini AI, it provides real-time vector telemetry, automated repetition counting, form fault detection, dynamic exercise synthesis, and hands-free voice coaching.

---

## 2. Technology Stack & Zero-Build Runtime
FlexAlign AI is architected to run with **zero build step** (no bundler, webpack, or npm build required). It runs entirely via native ES Modules and modern browser APIs:
- **Core:** HTML5 Semantic Structure, Vanilla CSS3 (Custom Properties & Glassmorphism), Vanilla JavaScript (ES2022 Modules).
- **Computer Vision:** MediaPipe Pose 0.5+ (`@mediapipe/pose`, `@mediapipe/camera_utils`) via CDN.
- **3D Graphics:** Three.js 0.160.0 (via native `<script type="importmap">`).
- **Telemetry HUD:** Canvas 2D overlay with vectors, arc dials, and real-time bounding boxes.
- **Artificial Intelligence:** Google Gemini API (`gemini-3.1-flash-lite`, `gemini-flash-latest`).
- **Voice & Telemetry Audio:** Web Audio API (Synthesizer Chimes), Web Speech API (`SpeechRecognition`, `speechSynthesis`), ElevenLabs REST API.
- **Local Server:** Any static web server (e.g. `python -m http.server 8000`, VS Code Live Server, or Nginx).

---

## 3. High-Level Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │                 index.html                   │
                               │   Early Bridge + Dual Viewport + Dashboard   │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                           ┌──────────┴──────────┐
                                           ▼                     ▼
                                  ┌─────────────────┐   ┌─────────────────┐
                                  │   css/*.css     │   │    js/app.js    │
                                  │ Modular Styling │   │ Main Controller │
                                  └─────────────────┘   └────────┬────────┘
                                                                 │
    ┌────────────────┬────────────────┬─────────────────┬────────┴────────┬────────────────┬────────────────┐
    ▼                ▼                ▼                 ▼                 ▼                ▼                ▼
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────────┐   ┌───────────┐    ┌───────────┐    ┌───────────┐
│ math.js │    │audio.js & │    │evaluator. │    │simulator.js &│   │renderer.js│    │ gemini.js │    │voice-*.js │
│ Vector  │    │waveform.js│    │   js      │    │ avatar3d.js  │   │ 2D Canvas │    │ AI Coach  │    │ Eleven-   │
│ Kinemat.│    │ Chimes &  │    │ Reps &    │    │ 3D Three.js  │   │ HUD & Arc │    │ & Motion  │    │ Labs &    │
│ Angles  │    │ Telemetry │    │ Faults    │    │ Kinematics   │   │ Telemetry │    │ Synthesis │    │ Wake Word │
└─────────┘    └───────────┘    └───────────┘    └──────────────┘   └───────────┘    └───────────┘    └───────────┘
```

---

## 4. Key Feature Matrix

| Module | Feature | Implementation Details |
|---|---|---|
| **Dual Modes** | Gym / Strength vs Physical Therapy | Switch between explosive repetition counting and safe ROM ceiling clamping. |
| **Real-Time CV** | 33 MediaPipe Landmarks | 30–60 FPS extraction of joints: shoulders, elbows, wrists, hips, knees, ankles. |
| **Telemetry HUD** | Vector skeleton + Angle Arc | Canvas 2D overlay with color coding: Green (Target), Blue (In-Range), Red (Fault). |
| **3D Sim Avatar** | Three.js Joint Skeleton & Mesh | Live simulated 3D model with realistic anatomical joints, lighting, and grid floor. |
| **Motion Synthesizer** | Universal Kinematic Engine | Dynamic generation of 3D motion for squats, hinges, curls, presses, lunges, and calf raises. |
| **AI Exercise Lab** | Gemini 3.1 Flash Generation | Natural language prompt to full biomechanical spec with automatic motion profile. |
| **Modify Lab** | Specific Exercise Selection | Explicit dropdown to alter any exercise without overwriting names or IDs. |
| **Smart Suggestions**| "Did You Mean?" Chips | Detects unrecognized/misspelled input and provides interactive suggestion pills. |
| **Hands-Free Coach**| "Hey Coach" Voice Wake-Word | Continuous Web Speech listener with instant query execution and voice responses. |
| **Audio Feedback** | Web Audio API + ElevenLabs | Dual audio: custom harmonic chimes for reps/faults + neural voice coaching. |
| **Session Analytics**| CSV Export & Metric Logs | Comprehensive tracking of compliance score, peak ROM, velocity, and faults. |

---

## 5. Directory Structure
```
FlexAlignAi/
├── index.html                  # Core application HTML, ImportMap, and Early Controller Bridge
├── css/
│   ├── main.css                # Base reset, CSS variables, glassmorphic themes (Gym/PT)
│   ├── header.css              # Header navigation, brand logo, mode switch, telemetry stats
│   ├── viewport.css            # Video/Canvas container, 3D avatar viewport, AI modal, HUD overlays
│   └── dashboard.css           # Right telemetry panel, dials, rep counter, fault log, coach drawer
├── js/
│   ├── app.js                  # Main Application Orchestrator (FlexAlignApp) & Bootloader
│   ├── audio.js                # Web Audio API Sound Effects (rep pass, target reached, fault alert)
│   ├── avatar3d.js             # Three.js 3D Human Rig (Head, Torso, Arms, Legs, Grid, Shadows)
│   ├── elevenlabs.js           # ElevenLabs API Integration & Web Speech Fallback TTS
│   ├── evaluator.js            # Biomechanical State Machine (Reps, Peak ROM, Fault Detection)
│   ├── exercises.js            # Built-in Gym & PT Exercise Catalog, Dynamic Registry
│   ├── gemini.js               # Google Gemini Generative Language Engine (Chat & Exercise Lab)
│   ├── math.js                 # 3D Vector Math (Angle between 3 landmarks, Torso Lean, Distance)
│   ├── renderer.js             # 2D Canvas HUD Renderer (Skeleton lines, joint markers, angle dials)
│   ├── simulator.js            # Universal Kinematic Synthesizer (Simulated motion cycles)
│   ├── voice-listener.js       # Hands-Free "Hey Coach" SpeechRecognition Wake Word Engine
│   └── waveform.js             # Real-time SVG/Canvas Angle Waveform Graph
└── regeneration-instructions/  # Step-by-step modular AI regeneration guide & prompt playbook
```
