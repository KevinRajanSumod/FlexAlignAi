# FlexAlign AI — HTML & DOM Specification

This document details the exact DOM hierarchy, element identifiers, import maps, and script bindings required in `index.html`.

---

## 1. Document Head & CDN Dependencies

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlexAlign AI — Posture & ROM Analyzer</title>
  <meta name="description" content="Clinical & athletic-grade exercise posture and Range-of-Motion analyzer powered by MediaPipe Pose with real-time visual telemetry.">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

  <!-- Modular CSS -->
  <link rel="stylesheet" href="./css/main.css">
  <link rel="stylesheet" href="./css/header.css">
  <link rel="stylesheet" href="./css/viewport.css">
  <link rel="stylesheet" href="./css/dashboard.css">

  <!-- Three.js Import Map -->
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>

  <!-- MediaPipe Pose CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>

  <!-- Early Controller Bridge to guarantee instant button responsiveness -->
  <script>
    window.app = {
      _queue: [],
      setMode: function (m) { this._forward('setMode', [m]); },
      setExercise: function (e) { this._forward('setExercise', [e]); },
      setSide: function (s) { this._forward('setSide', [s]); },
      startCamera: function () { this._forward('startCamera', []); },
      stopStreams: function () { this._forward('stopStreams', []); },
      startSimulation: function () { this._forward('startSimulation', []); },
      toggleSimulation: function () { this._forward('toggleSimulation', []); },
      toggleSimFault: function () { this._forward('toggleSimFault', []); },
      resetSession: function () { this._forward('resetSession', []); },
      exportData: function () { this._forward('exportData', []); },
      setDashboardTab: function (t) { this._forward('setDashboardTab', [t]); },
      sendChatMessage: function (msg) { this._forward('sendChatMessage', [msg]); },
      requestAutoAnalysis: function () { this._forward('requestAutoAnalysis', []); },
      toggleVoice: function () { this._forward('toggleVoice', []); },
      clearChat: function () { this._forward('clearChat', []); },
      toggleCoachSection: function () { this._forward('toggleCoachDrawer', []); },
      toggleCoachDrawer: function (f) { this._forward('toggleCoachDrawer', [f]); },
      openCoachDrawer: function () { this._forward('openCoachDrawer', []); },
      closeCoachDrawer: function () { this._forward('closeCoachDrawer', []); },
      dismissCoachTip: function (ev) { this._forward('dismissCoachTip', [ev]); },
      toggleVoiceWake: function () { this._forward('toggleVoiceWake', []); },
      toggleSound: function () { this._forward('toggleSound', []); },
      handleVideoUpload: function (ev) { this._forward('handleVideoUpload', [ev]); },
      updateSafeThreshold: function (val) { this._forward('updateSafeThreshold', [val]); },
      openAiExerciseModal: function () { this._forward('openAiExerciseModal', []); },
      closeAiExerciseModal: function () { this._forward('closeAiExerciseModal', []); },
      setAiLabTab: function (tab) { this._forward('setAiLabTab', [tab]); },
      applyAiPreset: function (preset) { this._forward('applyAiPreset', [preset]); },
      generateOrModifyAiExercise: function () { this._forward('generateOrModifyAiExercise', []); },
      launchGeneratedExercise: function () { this._forward('launchGeneratedExercise', []); },
      _forward: function (fn, args) {
        if (window._realApp && typeof window._realApp[fn] === 'function') {
          window._realApp[fn].apply(window._realApp, args);
        } else {
          this._queue.push({ fn, args });
        }
      }
    };
  </script>
</head>
```

---

## 2. Key DOM Hierarchy & Essential Element IDs

### 2.1 Top Navigation Header
- `<header class="top-bar">`:
  - Brand section with logo ⚡ and title.
  - Mode selector container:
    - `#gymModeBtn`: Gym Mode button (`onclick="window.app.setMode('gym')"`).
    - `#ptModeBtn`: Physical Therapy Mode button (`onclick="window.app.setMode('pt')"`).
  - Status section:
    - `#sessionStatusPill`: Live indicator (STANDBY, TRACKING, SIMULATING).
    - `#btnApiKey`: API Key configuration button.
    - `#btnSoundToggle`: Mute/unmute audio telemetry.

### 2.2 Dual Viewport Area (`<section class="viewport-section">`)
- **Video / Canvas Layer:**
  - `<video id="webcam">`: Hidden native webcam video feed.
  - `<canvas id="outputCanvas">`: 2D canvas overlay drawing skeleton, vector joints, and angle badge.
  - `<div id="avatar3dContainer">`: Three.js WebGL canvas container for the 3D Avatar.
- **Top Control Bar:**
  - `#exerciseSelect`: Dropdown populated with exercises for active mode.
  - `#sideSelect`: Radio or button group (`auto`, `left`, `right`).
  - `#btnStartCam`: Start camera button.
  - `#stopCamBtn`: Stop stream button.
  - `#btnToggleSim`: Toggle 3D simulation button.
  - `#btnSimFault`: Inject biomechanical form fault toggle.
  - `#btnOpenAiLab`: Open Gemini AI Exercise Lab modal button.
  - `<input type="file" id="videoUploadInput">`: Offline MP4/WebM video analysis upload.

### 2.3 Gemini AI Exercise Lab Modal (`#aiExerciseModal`)
- `#tabAddExercise`: "➕ Add New Exercise" tab.
- `#tabModifyExercise`: "🛠️ Modify Active Exercise" tab.
- `.ai-preset-chips-wrap`: Preset buttons (`rdl`, `split_squat`, `pushup`, `wall_angels`, `lunges`).
- `#aiModifyExerciseSelectRow`: Exercise alteration dropdown container (visible in Modify tab).
- `#aiModifyExerciseSelect`: Select dropdown listing all exercises (Gym, PT, Custom).
- `#aiExercisePrompt`: Textarea description / adjustment input.
- `#aiTargetJoint`: Select for monitored vertex joint (`AUTO`, `KNEE`, `HIP`, `ELBOW`, `SHOULDER`).
- `#aiTargetMode`: Select for mode (`gym`, `pt`).
- `#btnAiGenerate`: Generate / Modify with Gemini submit button.
- `#aiExerciseSuggestionsCard`: Unrecognized exercise suggestion container:
  - `#aiSuggestionMsg`: Descriptive message explaining unrecognized input.
  - `#aiSuggestionPills`: Dynamic container for clickable suggestion buttons.
- `#aiExercisePreviewCard`: Specification preview card:
  - `#aiPreviewName`, `#aiPreviewCategory`, `#aiPreviewModeTag`, `#aiPreviewJoint`.
  - `#aiPreviewTarget`, `#aiPreviewLockout`, `#aiPreviewFault`, `#aiPreviewMotion`.
  - `#aiPreviewTip`: Biomechanical cue.
  - `#btnLaunchInSim`: "Add to Exercise Menu & Run in 3D Sim" button.

### 2.4 Right Telemetry Dashboard (`<aside class="dashboard-panel">`)
- **Telemetry Hero:**
  - `#activeJointName`: Monitored joint label.
  - `#liveAngleValue`: Real-time angle in degrees (e.g. `85°`).
  - `#angleDialProgress`: Radial SVG stroke-dashoffset circle.
  - `<canvas id="waveformCanvas">`: Rolling angle history chart.
- **Rep & Form Card (Gym Mode):**
  - `#repCountHero`: Completed rep count display.
  - `#repProgressBar`: Visual progress bar toward target excursion.
  - `#repStatusText`: Rep state ('Ready', 'Inflection', 'Rep Complete').
  - `#complianceScore`: Form compliance percentage.
  - `#faultCount`: Total detected kinetic faults.
- **Protection Card (Physical Therapy Mode):**
  - `#ptCeilingSlider`: Range input adjusting maximum allowable degrees.
  - `#ptCeilingValue`: Slider readout (e.g. `100°`).
  - `#ptSafeGauge`: Visual gauge indicating distance to safe threshold.
- **Biomechanical Coach Drawer:**
  - `#coachDrawer`: Floating slide-out coach interface.
  - `#btnVoiceWake`: Hands-free "Hey Coach" toggle button.
  - `#aiVoiceSelect`: Neural voice selector dropdown.
  - `#chatMessages`: Scrollable chat history container.
  - `#aiChatInput`: Text prompt input with quick action buttons.
  - `#btnExportCsv`: Session metric export button.
