# FlexAlign AI — Application Controller & Lifecycle

This document describes the primary orchestrator `FlexAlignApp` in `js/app.js`, lifecycle state machines, camera integration, side detection hysteresis, and resilient bootloader.

---

## 1. Primary Orchestrator (`FlexAlignApp`)

`FlexAlignApp` acts as the central hub connecting all subsystems:

```javascript
export class FlexAlignApp {
  constructor() {
    this.audio = new AudioEngine();
    this.evaluator = new ExerciseEvaluator(this.audio);
    this.simulator = new MotionSimulator();
    this.avatar3d = new Avatar3DRenderer();
    this.gemini = new GeminiCoach();
    this.voice = new ElevenLabsVoice();
    this.voiceListener = new VoiceListener({ ... });
    this.waveform = new WaveformChart('waveformCanvas');
    this.renderer = new HUDRenderer('outputCanvas');
    
    this.isCameraRunning = false;
    this.isSimulationRunning = false;
    this.currentMode = 'gym';
    this.aiLabTab = 'add';
    this.exerciseToModify = null;
  }
}
```

---

## 2. MediaPipe Pose Loop & Coordinate Transformation

1. **Initialization:**
   ```javascript
   this.pose = new Pose({
     locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
   });
   this.pose.setOptions({
     modelComplexity: 1,
     smoothLandmarks: true,
     enableSegmentation: false,
     minDetectionConfidence: 0.5,
     minTrackingConfidence: 0.5
   });
   this.pose.onResults((results) => this.onPoseResults(results));
   ```
2. **Camera Stream:**
   ```javascript
   this.camera = new Camera(videoElement, {
     onFrame: async () => {
       if (this.isCameraRunning) {
         await this.pose.send({ image: videoElement });
       }
     },
     width: 1280,
     height: 720
   });
   ```

---

## 3. Side Auto-Detection with Hysteresis

To prevent jittery flipping between left and right limb tracking when a user turns slightly:
- Evaluates total landmark visibility scores for left limbs (`[11, 13, 15, 23, 25, 27]`) versus right limbs (`[12, 14, 16, 24, 26, 28]`).
- Requires a **0.15 visibility score gap** and a **2.0 second cooldown period** before switching the active tracking side.

---

## 4. Mode Switching (`setMode`)

When switching between `'gym'` and `'pt'`:
- Updates body class: `.theme-gym` $\leftrightarrow$ `.theme-pt`.
- Updates header toggle buttons and status badges.
- Toggles visibility between:
  - Repetition Counter Hero & Compliance card (`Gym Mode`).
  - Safe Ceiling Range Slider & Angle Limit Protection card (`PT Mode`).
- Re-populates exercise select dropdown with mode-specific catalog.

---

## 5. Gemini AI Exercise Lab Workflow in `app.js`

1. `openAiExerciseModal()` / `closeAiExerciseModal()`: Opens or closes modal with smooth backdrop blur transitions.
2. `setAiLabTab(tab)`:
   - When `tab === 'modify'`:
     - Displays `#aiModifyExerciseSelectRow`.
     - Populates `#aiModifyExerciseSelect` with grouped gym, pt, and custom exercises.
     - Automatically selects `this.exerciseToModify || currentExercise`.
     - Invokes `syncModifyExerciseSelection()` to prefill prompt text with target angle adjustments.
   - When `tab === 'add'`:
     - Hides `#aiModifyExerciseSelectRow`.
     - Clears prompt textarea and restores add placeholder.
3. `generateOrModifyAiExercise()`:
   - Reads user prompt, selected joint, and mode.
   - When modifying: calls `gemini.modifyExercise(targetEx, prompt)`.
   - When adding: calls `gemini.generateExercise(prompt, mode)`.
   - If response contains `isUnrecognized: true`:
     - Hides preview card.
     - Displays `#aiExerciseSuggestionsCard` with interactive suggestion pills.
   - If response contains valid exercise:
     - Hides suggestions card.
     - Renders preview card with 3D motion pattern and targets.
4. `applyAiSuggestion(promptText)`:
   - Populates prompt input with suggested exercise text.
   - Switches to `'add'` tab and immediately triggers generation.
5. `launchGeneratedExercise()`:
   - Registers generated exercise in catalog.
   - Selects it in active exercise dropdown.
   - Closes modal.
   - Starts 3D simulation so user immediately observes the kinematic animation.

---

## 6. Resilient Bootloader (`bootApp`)

Guarantees button clicks made before module initialization are executed without loss:

```javascript
function bootApp() {
  try {
    const realApp = new FlexAlignApp();
    window._realApp = realApp;
    if (window.app && window.app._queue && window.app._queue.length) {
      const q = window.app._queue;
      window.app = realApp;
      q.forEach(item => {
        if (typeof realApp[item.fn] === 'function') {
          realApp[item.fn].apply(realApp, item.args);
        }
      });
    } else {
      window.app = realApp;
    }
    realApp.init();
  } catch (err) {
    console.error('Fatal error during boot:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
```
