# ⚡ FlexAlign AI — Real-Time Posture & Range-of-Motion Biomechanical Analyzer

[![MediaPipe Pose](https://img.shields.io/badge/Computer_Vision-MediaPipe_Pose-00C4B4?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Three.js](https://img.shields.io/badge/3D_Kinematics-Three.js_r160-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI_Engine-Google_Gemini_3.1_Flash-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![ElevenLabs](https://img.shields.io/badge/Voice-ElevenLabs_&_Web_Speech-FF7F00)](https://elevenlabs.io/)
[![Zero Build](https://img.shields.io/badge/Build-Zero_Build_/_Native_ESM-10B981)](#-quick-start)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **FlexAlign AI** is a clinical- and athletic-grade, browser-native exercise posture and Range-of-Motion (ROM) biomechanical analyzer. Powered by MediaPipe Pose, Three.js 3D avatars, and Google Gemini AI, it delivers real-time skeletal telemetry, automated repetition counting, form fault detection, dynamic exercise synthesis, and hands-free voice coaching.

---

## 🌟 Highlights

- ⚡ **Zero-Build, Pure Web Runtime:** Built on native ES2022 modules and browser APIs—no Webpack, Vite, or npm bundler overhead required.
- 🔒 **100% Privacy-First:** Computer vision and pose estimation run entirely client-side. No camera feeds or video frames leave your device.
- 🏋️ **Dual Operational Modes:** Instant toggle between high-performance athletic rep tracking (**Gym Mode**) and safe-boundary rehabilitation monitoring (**Physical Therapy Mode**).
- ✨ **Gemini AI Exercise Lab:** Generate entirely new exercise kinematic specifications or adjust active criteria in natural language with automated 3D kinematic motion profiling.
- 🤖 **Interactive 3D Avatar & Simulation:** Integrated Three.js humanoid rig displaying real-time motion cycles with on-demand form fault injection for testing and learning.
- 🎙️ **Hands-Free "Hey Coach" Voice HUD:** Continuous wake-word listener with conversational multi-turn intelligence and neural voice feedback via ElevenLabs.

---

## 📐 System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │                  index.html                  │
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
     ┌────────────────┬────────────────┬─────────────────┬──────────┴──────────┬────────────────┬────────────────┐
     ▼                ▼                ▼                 ▼                     ▼                ▼                ▼
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌──────────────┐       ┌───────────┐    ┌───────────┐    ┌───────────┐
│ math.js │    │audio.js & │    │evaluator. │    │simulator.js &│       │renderer.js│    │ gemini.js │    │voice-*.js │
│ Vector  │    │waveform.js│    │   js      │    │ avatar3d.js  │       │ 2D Canvas │    │ AI Coach  │    │ Eleven-   │
│ Kinemat.│    │ Chimes &  │    │ Reps &    │    │ 3D Three.js  │       │ HUD & Arc │    │ & Motion  │    │ Labs &    │
│ Angles  │    │ Telemetry │    │ Faults    │    │ Kinematics   │       │ Telemetry │    │ Synthesis │    │ Wake Word │
└─────────┘    └───────────┘    └───────────┘    └──────────────┘       └───────────┘    └───────────┘    └───────────┘
```

### Biomechanical Vector Trigonometry
Joint flexion and extension angles are computed from 3D landmark vectors using the vector dot product formula:

$$\theta = \arccos\left(\frac{\vec{BA} \cdot \vec{BC}}{\|\vec{BA}\| \, \|\vec{BC}\|}\right) \times \left(\frac{180}{\pi}\right)$$

Where **$B$** is the target joint vertex (e.g., knee or elbow), and **$A$** and **$C$** are the proximal and distal adjacent joint landmarks (e.g., hip and ankle).

---

## 🚀 Key Features

### 1. 🏋️ Gym & Athletic Kinematics Mode
- **State Machine Repetition Counting:** Validates full range-of-motion transitions (`Starting Lockout` $\rightarrow$ `Peak Flexion/Extension` $\rightarrow$ `Crisp Lockout`).
- **Real-Time Form Fault Detection:** Identifies excessive torso forward lean during squats, elbow flares, hip collapse, and incomplete ROM.
- **Dynamic Compliance Meter:** Continuously updates a compliance percentage score reflecting rep execution fidelity.
- **Built-in Exercises:**
  - **Bodyweight Squats** (Knee Flexion: Target $\le 90^\circ$, Lockout $> 160^\circ$)
  - **Bicep Curls** (Elbow Flexion: Target $\le 45^\circ$, Lockout $> 155^\circ$)
  - **Triceps Pushdowns** (Elbow Extension: Lockout $\ge 165^\circ$, Return $< 85^\circ$)
  - **Overhead Press** (Elbow Lockout: Lockout $> 160^\circ$, Return $< 90^\circ$)

### 2. 🩺 Physical Therapy & Rehabilitation Mode
- **Safe ROM Ceiling Slider:** Adjust safe excursion limits (e.g., 70° to 120°) to protect compromised ligaments and post-operative repairs.
- **Visual & Audio Alarm Guard:** Displays amber and crimson warnings when approaching or breaching safe threshold limits.
- **Clinical Protocols:**
  - **Shoulder Lateral Raise** (Rotator Cuff & Impingement Protection)
  - **Seated Knee Extension** (ACL/MCL Safe Extension Calibration)
  - **Elbow Extension Lockout** (Terminal Extension Mobility Restoration)
  - **Elbow Flexion Bending** (Post-Surgical Controlled Flexion)

### 3. ✨ Gemini AI Exercise Lab
- **Natural Language Exercise Generation:** Tell the AI Coach to create any exercise (e.g., *"Create a Romanian Deadlift focusing on posterior chain hip hinge"* or *"Wall Angels for thoracic extension"*).
- **Automated Biomechanical Spec Compiler:** Powered by Google Gemini 3.1 Flash, generating:
  - Target ROM & Lockout criteria angles
  - Primary monitored joint (KNEE, HIP, ELBOW, SHOULDER)
  - Biomechanical fault rules & verbal coaching cues
  - 3D kinematic motion cycle parameters
- **Exercise Modifier Mode:** Select any existing exercise to alter its target depths or movement parameters dynamically without losing identity.
- **"Did You Mean?" Recovery System:** Automatically detects ambiguous or misspelled exercise prompts and suggests valid alternatives as interactive one-click chips.
- **Instant 3D Simulation:** Directly launch newly generated exercises into the Three.js 3D avatar rig.

### 4. 🎮 3D Kinematics Avatar & Simulation Rig
- **Realistic Anatomical Rig:** Three.js rigged humanoid avatar with head, torso, upper/lower arms, pelvis, thighs, shins, feet, dynamic ground grid, and lighting.
- **Universal Kinematic Synthesizer:** Real-time procedural motion generation for compound movements, hinges, presses, and raises.
- **Interactive Fault Injection (`F` Key):** Toggle realistic form faults during simulation to observe red HUD alerts, compliance score drops, and audio fault chimes.

### 5. 🎙️ Hands-Free "Hey Coach" Voice Telemetry
- **Continuous Wake-Word Detection:** Say *"Hey Coach"* anytime to trigger hands-free form inquiries, set summaries, or biomechanical advice.
- **Multi-Turn Contextual Dialogue:** Powered by Google Gemini with full session state context (current exercise, reps completed, peak ROM, active faults).
- **Neural Voice Synthesis:** Crisp vocal delivery via ElevenLabs (Rachel, Daniel, Antoni) with graceful fallback to browser `speechSynthesis`.
- **Web Audio API Sound Engine:** Synthesizer chimes for rep pass (high chime), target depth reached (ascending chime), and form fault alert (low buzz).

### 6. 📊 Real-Time Telemetry & Session Analytics
- **Live SVG Dial & Readout:** High-visibility digital angle readout with smooth vector arc indicators.
- **Real-Time ROM Waveform:** Live canvas graph rendering angular displacement curves over time.
- **Repetition History Log:** Granular tracking of rep number, peak ROM, duration, and pass/fault status.
- **One-Click Export:** Download comprehensive session telemetry and rep history as JSON.

---

## 📂 Project Structure

```
FlexAlignAi/
├── index.html                  # Core HTML structure, Three.js ImportMap, & Early Bridge
├── css/
│   ├── main.css                # Global design system, CSS tokens, glassmorphic themes
│   ├── header.css              # Navigation bar, brand logo, mode switch, voice wake badge
│   ├── viewport.css            # 2D/3D dual viewports, HUD overlays, AI Lab modal
│   └── dashboard.css           # Right telemetry panel, dials, rep counter, AI coach drawer
├── js/
│   ├── app.js                  # Master Application Orchestrator (FlexAlignApp) & Bootloader
│   ├── audio.js                # Web Audio API Sound Effects (rep pass, target reached, fault alert)
│   ├── avatar3d.js             # Three.js 3D Human Rig (Mesh, skeletal hierarchy, lighting)
│   ├── elevenlabs.js           # ElevenLabs Neural Voice API integration & TTS fallback
│   ├── evaluator.js            # Biomechanical State Machine (Rep counting, ROM, Faults)
│   ├── exercises.js            # Built-in Gym & PT Exercise Catalogs, Dynamic Registry
│   ├── gemini.js               # Google Gemini Generative Engine (Multi-turn Coach & Lab)
│   ├── math.js                 # 3D Vector Math (Angle between 3 landmarks, distance, torso lean)
│   ├── renderer.js             # 2D Canvas HUD Renderer (Skeleton lines, joint markers, angle arc)
│   ├── simulator.js            # Universal Kinematic Synthesizer (Simulated motion cycles)
│   ├── voice-listener.js       # Hands-Free "Hey Coach" SpeechRecognition Wake Word Engine
│   └── waveform.js             # Real-time Angle Waveform Graph
└── regeneration-instructions/  # Complete modular AI regeneration guide & architectural specs
```

---

## ⚡ Quick Start

FlexAlign AI requires **no compilation, bundler, or build step**. Simply serve the directory with any local static HTTP server.

### 1. Clone the Repository
```bash
git clone https://github.com/KevinRajanSumod/FlexAlignAi.git
cd FlexAlignAi
```

### 2. Start a Local Web Server

#### Option A: Python 3 (Recommended)
```bash
python -m http.server 8000
```

#### Option B: Node.js `npx serve`
```bash
npx serve . -p 8000
```

#### Option C: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

### 3. Launch in Browser
Open your browser and navigate to:
```
http://localhost:8000
```

> **Note on Camera Permissions:** Web browsers require `localhost` or an `https://` origin to grant access to the webcam.

---

## ⌨️ Keyboard Shortcuts & Controls

| Key / Action | Function |
|---|---|
| **Spacebar** | Toggle 3D Kinematic Simulation On / Off |
| **`F` Key** | Toggle Simulated Form Fault (inject valgus / torso lean) |
| **`Esc` Key** | Close AI Exercise Lab Modal / AI Coach Drawer |
| **"Hey Coach"** | Voice Wake-Word to prompt AI Biomechanics Coach |
| **`Auto` / `L` / `R`** | Toggle active tracked limb side (Left, Right, or Auto-detect) |

---

## 🔑 API Keys Configuration (Optional)

FlexAlign AI works out of the box with built-in configurations and local fallbacks:

- **Google Gemini API Key:** Configurable directly in the UI by clicking the **🔑 Key** button in the AI Coach Drawer. Saved to your browser's `localStorage`.
- **ElevenLabs Voice:** Supports custom API keys or falls back smoothly to the browser's native Web Speech API.

---

## 🔒 Privacy & Local Processing

- All skeletal landmark estimation is performed on the user's device using WebAssembly and WebGL through **MediaPipe Pose**.
- Camera frames are discarded immediately after inference and are **never uploaded or stored**.
- Voice transcription for *"Hey Coach"* runs locally via the browser's **Web Speech API**.
- Only text-based exercise requests and anonymized numerical telemetry stats are dispatched to the Gemini API when interacting with the AI Coach or Exercise Lab.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🤝 Acknowledgments

- [Google MediaPipe](https://developers.google.com/mediapipe) for the real-time pose estimation pipeline.
- [Three.js](https://threejs.org/) for 3D graphics and skeletal rigging.
- [Google Gemini](https://ai.google.dev/) for generative biomechanical reasoning and multi-turn coaching.
- [ElevenLabs](https://elevenlabs.io/) for realistic neural voice synthesis.
