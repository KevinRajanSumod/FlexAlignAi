/**
 * FlexAlign AI - Main Application Controller
 * Orchestrates MediaPipe Pose stream, UI components, evaluator, HUD, and audio telemetry.
 * v2 additions:
 *  - Side auto-detect hysteresis (2s cooldown + 0.15 score gap)
 *  - 3D avatar (Avatar3DRenderer) shown during simulation mode
 */

import { AudioEngine } from './audio.js';
import { EXERCISES } from './exercises.js';
import { ExerciseEvaluator } from './evaluator.js';
import { HUDRenderer } from './renderer.js';
import { WaveformChart } from './waveform.js';
import { MotionSimulator } from './simulator.js';
import { Avatar3DRenderer } from './avatar3d.js';
import { calculateJointAngle } from './math.js';

export class FlexAlignApp {
  constructor() {
    // Core Subsystems
    this.audio = new AudioEngine();
    this.evaluator = new ExerciseEvaluator(this.audio);
    this.simulator = new MotionSimulator();
    this.avatar3d = new Avatar3DRenderer();

    // DOM Bindings
    this.video = document.getElementById('webcamVideo');
    this.canvas = document.getElementById('outputCanvas');
    this.chartCanvas = document.getElementById('angleChartCanvas');
    this.avatarCanvas = document.getElementById('avatarCanvas3D');

    this.hud = new HUDRenderer(this.canvas);
    this.waveform = new WaveformChart(this.chartCanvas);

    // Stream State
    this.pose = null;
    this.camera = null;
    this.isCameraRunning = false;
    this.isSimulationRunning = false;
    this.animFrameId = null;

    // Side Auto-Detect Hysteresis
    this.sidePreference = 'auto'; // 'auto' | 'left' | 'right'
    this._lastResolvedSide = 'left';
    this._lastSideChangeTime = 0;
    this._SIDE_CHANGE_COOLDOWN_MS = 2000;
    this._SIDE_SCORE_GAP = 0.15;

    // Initialize Subsystems & UI
    this.initMediaPipe();
    this.bindEvents();
    this.setMode('gym');
    this.setExercise('squat');

    // Handle URL query parameters for direct demo & automated test runs
    this.handleUrlParams();
  }

  initMediaPipe() {
    if (typeof Pose === 'undefined') {
      console.warn('MediaPipe Pose script loading from CDN...');
      return;
    }

    try {
      this.pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      this.pose.onResults((results) => this.onPoseResults(results));
    } catch (err) {
      console.error('Error instantiating MediaPipe Pose:', err);
      this.showToast('Could not load MediaPipe Pose. Check internet connection.', '⚠️');
    }
  }

  /**
   * Resolve which side to track with hysteresis to prevent mid-rep flipping.
   */
  resolveActiveSide(landmarks) {
    if (this.sidePreference === 'left') return 'left';
    if (this.sidePreference === 'right') return 'right';

    let leftScore = 0;
    let rightScore = 0;
    const ex = this.evaluator.currentExercise;

    if (ex === 'squat') {
      leftScore = ((landmarks[23]?.visibility || 0) + (landmarks[25]?.visibility || 0) + (landmarks[27]?.visibility || 0)) / 3;
      rightScore = ((landmarks[24]?.visibility || 0) + (landmarks[26]?.visibility || 0) + (landmarks[28]?.visibility || 0)) / 3;
    } else if (ex === 'curl') {
      // Motion-aware: prioritize the arm actively flexing in a curl
      const leftAngle = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
      const rightAngle = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
      if (leftAngle > 0 && rightAngle > 0 && Math.abs(leftAngle - rightAngle) >= 15) {
        return leftAngle < rightAngle ? 'left' : 'right';
      }
      leftScore = ((landmarks[11]?.visibility || 0) + (landmarks[13]?.visibility || 0) + (landmarks[15]?.visibility || 0)) / 3;
      rightScore = ((landmarks[12]?.visibility || 0) + (landmarks[14]?.visibility || 0) + (landmarks[16]?.visibility || 0)) / 3;
    } else {
      // Motion-aware: prioritize the arm actively abducting in a raise
      const leftAngle = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
      const rightAngle = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);
      if (leftAngle > 0 && rightAngle > 0 && Math.abs(leftAngle - rightAngle) >= 15) {
        return leftAngle > rightAngle ? 'left' : 'right';
      }
      leftScore = ((landmarks[23]?.visibility || 0) + (landmarks[11]?.visibility || 0) + (landmarks[13]?.visibility || 0)) / 3;
      rightScore = ((landmarks[24]?.visibility || 0) + (landmarks[12]?.visibility || 0) + (landmarks[14]?.visibility || 0)) / 3;
    }

    const newSide = leftScore >= rightScore ? 'left' : 'right';
    const scoreDiff = Math.abs(leftScore - rightScore);
    const now = Date.now();

    // Only switch sides if gap is large enough AND cooldown has passed
    if (
      newSide !== this._lastResolvedSide &&
      scoreDiff >= this._SIDE_SCORE_GAP &&
      (now - this._lastSideChangeTime) >= this._SIDE_CHANGE_COOLDOWN_MS
    ) {
      this._lastResolvedSide = newSide;
      this._lastSideChangeTime = now;
    }

    return this._lastResolvedSide;
  }

  onPoseResults(results) {
    if (!results.image) return;

    this.hud.resize(results.image.width, results.image.height);
    this.hud.clear();

    const hudDot = document.getElementById('hudLiveDot');
    const hudText = document.getElementById('hudTrackingText');

    if (!results.poseLandmarks) {
      hudDot.classList.remove('active');
      hudText.textContent = 'NO POSE DETECTED';
      return;
    }

    hudDot.classList.add('active');
    hudText.textContent = 'TRACKING ACTIVE';

    const landmarks = results.poseLandmarks;
    const side = this.resolveActiveSide(landmarks);
    const sideBadge = document.getElementById('activeSideBadge');
    if (sideBadge) {
      sideBadge.textContent = `${this.sidePreference.toUpperCase()} (${side.toUpperCase()})`;
    }

    // Evaluate Biomechanics
    const evalResult = this.evaluator.evaluate(landmarks, side);

    // Update Waveform & UI Telemetry
    this.waveform.push(evalResult.angle);
    const targetDeg = this.evaluator.mode === 'gym' ? 90 : this.evaluator.therapySafeThresholds[this.evaluator.currentExercise];
    this.waveform.render(this.evaluator.mode, targetDeg);

    this.updateTelemetryUI(evalResult);

    // Render Canvas Wireframe, Arc, and Joint Badges (on 2D canvas — only when NOT in simulation)
    const isOptimal = !evalResult.isFault;
    const isMirrored = this.isCameraRunning && !this.video.classList.contains('non-mirrored');
    if (!this.isSimulationRunning) {
      this.hud.drawGrid(false);
      this.hud.renderSkeleton(landmarks, side, this.evaluator.currentExercise, evalResult.angle, isOptimal, isMirrored);
    } else {
      // In simulation mode: draw grid on 2D canvas + update 3D avatar
      this.hud.drawGrid(true);
      if (this.avatar3d.isReady) {
        this.avatar3d.updatePose(landmarks, this.evaluator.currentExercise, side);
      }
    }

    // If new rep completed, add to table
    if (evalResult.newRecord && evalResult.newRecord !== this.lastRenderedRecord) {
      this.lastRenderedRecord = evalResult.newRecord;
      this.appendRepHistory(evalResult.newRecord);
    }
  }

  updateTelemetryUI(res) {
    const angleValEl = document.getElementById('liveAngleValue');
    angleValEl.textContent = `${res.angle}°`;
    angleValEl.style.color = res.isFault ? 'var(--fault)' : (res.guidanceType === 'optimal' ? 'var(--optimal)' : 'var(--primary)');

    // Circular Dial Progress
    const dialBar = document.getElementById('dialProgressBar');
    const circumference = 2 * Math.PI * 45; // 282.74
    const fraction = Math.min(1, Math.max(0, res.angle / 180));
    dialBar.style.strokeDashoffset = circumference * (1 - fraction);
    dialBar.style.stroke = res.isFault ? 'var(--fault)' : (res.guidanceType === 'optimal' ? 'var(--optimal)' : 'var(--primary)');

    // Form Compliance Score
    document.getElementById('complianceScoreText').textContent = `${Math.round(res.complianceScore)}%`;
    document.getElementById('complianceFillBar').style.width = `${Math.round(res.complianceScore)}%`;

    // Four Statistics Metrics
    document.getElementById('repCountVal').textContent = res.repCount;
    document.getElementById('peakRomVal').textContent = `${res.peakRom}°`;
    document.getElementById('faultCountVal').textContent = res.faultCount;

    // Guidance Banner
    const banner = document.getElementById('hudGuidanceBanner');
    banner.className = `hud-guidance-banner ${res.guidanceType}`;
    document.getElementById('hudGuidanceText').textContent = res.guidanceText;
    document.getElementById('hudGuidanceIcon').textContent = res.isFault ? '⚠️' : (res.guidanceType === 'optimal' ? '✨' : 'ℹ️');
  }

  appendRepHistory(record) {
    const tbody = document.getElementById('repHistoryBody');
    const emptyRow = document.getElementById('emptyHistoryRow');
    if (emptyRow) emptyRow.remove();

    document.getElementById('secondaryMetricVal').textContent = record.duration;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${record.id}</td>
      <td style="color: #fff; font-weight: 600;">${record.exercise}</td>
      <td>${record.peakRom}</td>
      <td>${record.duration}</td>
      <td><span class="status-pill ${record.status === 'PASS' ? 'pass' : 'fail'}">${record.status}</span></td>
    `;
    tbody.prepend(tr);

    document.getElementById('historyCountBadge').textContent = `${this.evaluator.repHistory.length} Records`;
  }

  setMode(mode) {
    this.evaluator.setMode(mode);
    const gymBtn = document.getElementById('gymModeBtn');
    const ptBtn = document.getElementById('ptModeBtn');
    const modeCard = document.getElementById('modeConfigCard');
    const ptSection = document.getElementById('ptControlsSection');
    const gymSection = document.getElementById('gymControlsSection');

    if (mode === 'gym') {
      gymBtn.classList.add('active');
      ptBtn.classList.remove('active');
      modeCard.className = 'card mode-custom-card gym-mode-theme';
      ptSection.style.display = 'none';
      gymSection.style.display = 'block';
      document.getElementById('modeCardTitle').textContent = 'Gym Mode Standards & Strict Form Criteria';
      document.getElementById('modeBadgePill').textContent = 'FORM STRICT';
      document.getElementById('modeBadgePill').className = 'status-pill pass';
      this.audio.speakCoach('Switched to Fitness Gym Mode. Rep count and strict form active.', true);
      this.showToast('Switched to 🏋️ Fitness / Gym Mode', '⚡');
    } else {
      ptBtn.classList.add('active');
      gymBtn.classList.remove('active');
      modeCard.className = 'card mode-custom-card pt-mode-theme';
      ptSection.style.display = 'block';
      gymSection.style.display = 'none';
      document.getElementById('modeCardTitle').textContent = 'Physical Therapy Target Settings';
      document.getElementById('modeBadgePill').textContent = 'CLINICAL ROM';
      document.getElementById('modeBadgePill').className = 'status-pill pass';
      this.audio.speakCoach('Switched to Physical Therapy Mode. Joint range of motion and safe thresholds active.', true);
      this.showToast('Switched to 🩺 Physical Therapy Mode', '🩺');
    }

    const targetDeg = mode === 'gym' ? 90 : this.evaluator.therapySafeThresholds[this.evaluator.currentExercise];
    this.waveform.render(mode, targetDeg);
  }

  setExercise(exerciseId) {
    const ex = EXERCISES[exerciseId];
    if (!ex) return;

    this.evaluator.setExercise(exerciseId);

    const selectEl = document.getElementById('exerciseSelect');
    if (selectEl && selectEl.value !== exerciseId) {
      selectEl.value = exerciseId;
    }

    document.getElementById('activeJointName').textContent = ex.jointTitle;
    document.getElementById('hudActiveJointBadge').textContent = ex.hudBadge;

    const gymCriterionEl = document.getElementById('gymDepthCriterion');
    const gymLockoutEl = document.getElementById('gymLockoutCriterion');
    const repFooter = document.getElementById('repTargetFooter');
    if (gymCriterionEl) gymCriterionEl.textContent = ex.gymCriterion;
    if (gymLockoutEl) gymLockoutEl.textContent = ex.gymLockout;
    if (repFooter) repFooter.textContent = ex.repFooter;

    const slider = document.getElementById('safeRomSlider');
    const thresholdBadge = document.getElementById('thresholdDisplayBadge');
    slider.min = ex.ptSliderMin;
    slider.max = ex.ptSliderMax;
    slider.value = this.evaluator.therapySafeThresholds[exerciseId];
    thresholdBadge.textContent = `${this.evaluator.therapySafeThresholds[exerciseId]}°`;
    document.getElementById('thresholdSliderLabel').textContent = ex.sliderLabel;
    document.getElementById('ptClinicalTip').innerHTML = ex.ptTip;

    const targetDeg = this.evaluator.mode === 'gym' ? 90 : this.evaluator.therapySafeThresholds[exerciseId];
    this.waveform.render(this.evaluator.mode, targetDeg);
    this.showToast(`Exercise: ${ex.name.toUpperCase()}`, '🎯');
  }

  setSide(side) {
    this.sidePreference = side;
    document.querySelectorAll('.side-chip').forEach(c => c.classList.remove('active'));
    if (side === 'auto') document.getElementById('sideAuto').classList.add('active');
    if (side === 'left') document.getElementById('sideLeft').classList.add('active');
    if (side === 'right') document.getElementById('sideRight').classList.add('active');
  }

  updateSafeThreshold(value) {
    this.evaluator.updateSafeThreshold(this.evaluator.currentExercise, value);
    document.getElementById('thresholdDisplayBadge').textContent = `${value}°`;
    this.waveform.render(this.evaluator.mode, parseInt(value, 10));
  }

  toggleSound() {
    const active = this.audio.toggleSound();
    const btn = document.getElementById('soundToggleBtn');
    btn.classList.toggle('active', active);
    document.getElementById('soundIcon').textContent = active ? '🔊' : '🔇';
    this.showToast(active ? 'Audio FX Enabled' : 'Audio FX Muted', active ? '🔊' : '🔇');
  }

  toggleVoice() {
    const active = this.audio.toggleVoice();
    const btn = document.getElementById('voiceToggleBtn');
    btn.classList.toggle('active', active);
    document.getElementById('voiceIcon').textContent = active ? '🗣️' : '🤐';
    this.showToast(active ? 'Voice Coach Enabled' : 'Voice Coach Muted', active ? '🗣️' : '🤐');
  }

  async startCamera() {
    this.stopStreams();
    this.audio.init();

    document.getElementById('viewportSplash').classList.add('hidden');
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = 'inline-flex';
    this.video.classList.remove('non-mirrored');

    // Hide 3D avatar when using live camera
    this.avatar3d.hide();

    try {
      if (!this.pose) this.initMediaPipe();

      if (typeof Camera !== 'undefined') {
        this.camera = new Camera(this.video, {
          onFrame: async () => {
            if (this.isCameraRunning && this.pose) {
              await this.pose.send({ image: this.video });
            }
          },
          width: 1280,
          height: 720
        });
        await this.camera.start();
        this.isCameraRunning = true;
        this.showToast('Camera active. Step back into full view.', '📷');
        this.audio.speakCoach('Camera active. Step back into full view.');
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        this.video.srcObject = stream;
        await this.video.play();
        this.isCameraRunning = true;
        this.runVideoLoop();
        this.showToast('Camera active via WebRTC.', '📷');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      this.showToast('Could not access camera. Try Demo Simulator or Video Upload.', '⚠️');
      document.getElementById('viewportSplash').classList.remove('hidden');
      document.getElementById('startCamBtn').style.display = 'inline-flex';
      document.getElementById('stopCamBtn').style.display = 'none';
    }
  }

  runVideoLoop() {
    const step = async () => {
      if (!this.isCameraRunning) return;
      if (this.video.readyState >= 2 && this.pose) {
        await this.pose.send({ image: this.video });
      }
      this.animFrameId = requestAnimationFrame(step);
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  stopStreams() {
    this.isCameraRunning = false;
    this.isSimulationRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    if (this.camera) {
      try { this.camera.stop(); } catch (e) {}
      this.camera = null;
    }

    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
    this.video.pause();

    document.getElementById('startCamBtn').style.display = 'inline-flex';
    document.getElementById('stopCamBtn').style.display = 'none';
    document.getElementById('hudLiveDot').classList.remove('active');
    document.getElementById('hudTrackingText').textContent = 'STANDBY';

    // Hide 3D avatar
    this.avatar3d.hide();
  }

  handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.stopStreams();
    this.audio.init();

    document.getElementById('viewportSplash').classList.add('hidden');
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = 'inline-flex';
    this.video.classList.add('non-mirrored');

    // Hide 3D avatar for video upload
    this.avatar3d.hide();

    const videoURL = URL.createObjectURL(file);
    this.video.src = videoURL;
    this.video.loop = true;
    this.video.play().then(() => {
      this.isCameraRunning = true;
      this.runVideoLoop();
      this.showToast(`Analyzing video: ${file.name}`, '📁');
      this.audio.speakCoach('Processing video file stream.');
    }).catch(err => {
      console.error('Video error:', err);
      this.showToast('Could not play video.', '⚠️');
    });
  }

  startSimulation() {
    this.stopStreams();
    this.audio.init();

    document.getElementById('viewportSplash').classList.add('hidden');
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = 'inline-flex';

    this.isSimulationRunning = true;
    this.canvas.width = 1280;
    this.canvas.height = 720;

    // Initialize and show 3D avatar
    this._init3DAvatar();

    this.showToast('3D Simulation running. Drag to rotate avatar.', '🎮');
    this.audio.speakCoach('3D simulation launched.');

    const simLoop = () => {
      if (!this.isSimulationRunning) return;
      const lms = this.simulator.generateLandmarks(this.evaluator.currentExercise);
      this.onPoseResults({
        image: { width: 1280, height: 720 },
        poseLandmarks: lms
      });
      this.animFrameId = requestAnimationFrame(simLoop);
    };

    this.animFrameId = requestAnimationFrame(simLoop);
  }

  _init3DAvatar() {
    if (!this.avatarCanvas) return;

    this.avatar3d.show();

    if (!this.avatar3d.isReady) {
      // Set canvas size to match viewport
      const viewportEl = document.getElementById('viewportContainer');
      const w = viewportEl ? viewportEl.clientWidth : 1280;
      const h = viewportEl ? viewportEl.clientHeight : 720;
      this.avatarCanvas.width = w;
      this.avatarCanvas.height = h;
      this.avatar3d.init(this.avatarCanvas);
    }
  }

  toggleSimulation() {
    if (this.isSimulationRunning) {
      this.stopStreams();
      document.getElementById('viewportSplash').classList.remove('hidden');
    } else {
      this.startSimulation();
    }
  }

  resetSession() {
    this.evaluator.resetAll();
    this.waveform.reset();

    document.getElementById('repCountVal').textContent = '0';
    document.getElementById('peakRomVal').textContent = '0°';
    document.getElementById('faultCountVal').textContent = '0';
    document.getElementById('secondaryMetricVal').textContent = '--';
    document.getElementById('complianceScoreText').textContent = '100%';
    document.getElementById('complianceFillBar').style.width = '100%';
    document.getElementById('repHistoryBody').innerHTML = `
      <tr id="emptyHistoryRow">
        <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 20px;">
          Session reset. Perform repetitions to view analytics.
        </td>
      </tr>
    `;
    document.getElementById('historyCountBadge').textContent = '0 Records';

    this.showToast('Session reset successfully.', '🔄');
    this.audio.speakCoach('Session reset.');
  }

  exportData() {
    const sessionPayload = {
      application: 'FlexAlign AI',
      mode: this.evaluator.mode,
      exercise: this.evaluator.currentExercise,
      timestamp: new Date().toISOString(),
      stats: {
        reps: this.evaluator.repCount,
        peakRomDeg: this.evaluator.peakRom,
        faults: this.evaluator.faultCount,
        complianceScore: `${Math.round(this.evaluator.complianceScore)}%`
      },
      history: this.evaluator.repHistory
    };

    const blob = new Blob([JSON.stringify(sessionPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flexalign_${this.evaluator.currentExercise}_${this.evaluator.mode}_session.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Session exported to JSON file.', '📥');
  }

  showToast(message, icon = 'ℹ️') {
    const toast = document.getElementById('toastBanner');
    document.getElementById('toastMsg').textContent = message;
    document.getElementById('toastIcon').textContent = icon;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode')) this.setMode(params.get('mode'));
    if (params.get('exercise')) this.setExercise(params.get('exercise'));

    if (params.get('autosteps')) {
      this.canvas.width = 1280;
      this.canvas.height = 720;
      this.isSimulationRunning = true;
      document.getElementById('viewportSplash').classList.add('hidden');
      document.getElementById('startCamBtn').style.display = 'none';
      document.getElementById('stopCamBtn').style.display = 'inline-flex';

      const steps = parseInt(params.get('autosteps'), 10) || 300;
      const isFault = params.get('fault') === 'true';
      for (let i = 0; i < steps; i++) {
        const lms = this.simulator.generateLandmarks(this.evaluator.currentExercise, isFault);
        this.onPoseResults({ image: { width: 1280, height: 720 }, poseLandmarks: lms });
      }
    } else if (params.get('sim') === 'true' || params.get('demo') === 'true') {
      setTimeout(() => this.startSimulation(), 300);
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      const targetDeg = this.evaluator.mode === 'gym' ? 90 : this.evaluator.therapySafeThresholds[this.evaluator.currentExercise];
      this.waveform.render(this.evaluator.mode, targetDeg);

      // Resize 3D avatar if visible
      if (this.avatar3d.isReady && this.isSimulationRunning) {
        const viewportEl = document.getElementById('viewportContainer');
        if (viewportEl) {
          this.avatar3d.resize(viewportEl.clientWidth, viewportEl.clientHeight);
        }
      }
    });
  }
}

// Instantiate globally on DOM readiness
window.addEventListener('DOMContentLoaded', () => {
  window.app = new FlexAlignApp();
});
