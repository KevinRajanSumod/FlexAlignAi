/**
 * FlexAlign AI - Camera & Video Tracker Component
 * Manages MediaPipe Pose lifecycle, camera input streams, hysteresis-based active side tracking,
 * and uploaded video file playback analysis.
 */

import { calculateJointAngle } from '../math.js';

export class CameraTracker {
  constructor(options = {}) {
    this.app = options.app;
    this.video = options.video || document.getElementById('webcamVideo');
    this.onPoseResults = options.onPoseResults || (() => {});
    this.showToast = options.showToast || (() => {});

    this.pose = null;
    this.camera = null;
    this.isCameraRunning = false;
    this._activeStream = null;
    this.animFrameId = null;

    this.sidePreference = 'auto'; // 'auto' | 'left' | 'right'
    this._lastResolvedSide = 'left';
    this._lastSideChangeTime = 0;
    this._SIDE_CHANGE_COOLDOWN_MS = 2000;
    this._SIDE_SCORE_GAP = 0.15;
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
   * Resolve which side to track: 'both', 'left', or 'right'.
   * When limbs are actively in motion on both sides, selects 'both'.
   * When unilateral motion occurs, selects the moving limb.
   */
  resolveActiveSide(landmarks, currentExercise) {
    if (this.sidePreference === 'left') return 'left';
    if (this.sidePreference === 'right') return 'right';
    if (!landmarks || landmarks.length < 29) return 'both';

    const ex = currentExercise || (this.app && this.app.evaluator && this.app.evaluator.currentExercise) || '';

    const leftArmVis = (((landmarks[11] && landmarks[11].visibility) || 0) + ((landmarks[13] && landmarks[13].visibility) || 0) + ((landmarks[15] && landmarks[15].visibility) || 0)) / 3;
    const rightArmVis = (((landmarks[12] && landmarks[12].visibility) || 0) + ((landmarks[14] && landmarks[14].visibility) || 0) + ((landmarks[16] && landmarks[16].visibility) || 0)) / 3;
    const leftLegVis = (((landmarks[23] && landmarks[23].visibility) || 0) + ((landmarks[25] && landmarks[25].visibility) || 0) + ((landmarks[27] && landmarks[27].visibility) || 0)) / 3;
    const rightLegVis = (((landmarks[24] && landmarks[24].visibility) || 0) + ((landmarks[26] && landmarks[26].visibility) || 0) + ((landmarks[28] && landmarks[28].visibility) || 0)) / 3;

    // Squat: bilateral lower body compound movement
    if (ex === 'gym_squat' || ex === 'squat') {
      if (leftLegVis > 0.35 && rightLegVis > 0.35) return 'both';
      return leftLegVis >= rightLegVis ? 'left' : 'right';
    }

    // Overhead Press: bilateral upper body push
    if (ex === 'gym_press') {
      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // Bicep Curls:
    if (ex === 'gym_curl' || ex === 'curl' || ex === 'pt_elbow_flex') {
      if (leftArmVis > 0.5 && rightArmVis < 0.25) return 'left';
      if (rightArmVis > 0.5 && leftArmVis < 0.25) return 'right';

      const leftAngle = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
      const rightAngle = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);

      // Detect motion: check if arm is actively curling (< 150°)
      const isCurlingL = leftAngle > 0 && leftAngle < 150;
      const isCurlingR = rightAngle > 0 && rightAngle < 150;

      if (isCurlingL && isCurlingR) return 'both';
      if (isCurlingL && !isCurlingR && rightAngle > 155) return 'left';
      if (isCurlingR && !isCurlingL && leftAngle > 155) return 'right';

      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // Triceps Extension:
    if (ex === 'gym_extension' || ex === 'pt_elbow_ext') {
      if (leftArmVis > 0.5 && rightArmVis < 0.25) return 'left';
      if (rightArmVis > 0.5 && leftArmVis < 0.25) return 'right';

      const leftAngle = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
      const rightAngle = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);

      if (Math.abs(leftAngle - rightAngle) >= 30) {
        return leftAngle > rightAngle ? 'left' : 'right';
      }
      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // PT Shoulder Lateral Raise:
    if (ex === 'pt_raise' || ex === 'raise') {
      const leftAngle = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
      const rightAngle = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);

      const isRaisedL = leftAngle > 30;
      const isRaisedR = rightAngle > 30;

      if (isRaisedL && isRaisedR) return 'both';
      if (isRaisedL && !isRaisedR && rightAngle <= 25) return 'left';
      if (isRaisedR && !isRaisedL && leftAngle <= 25) return 'right';
      if (leftArmVis > 0.35 && rightArmVis > 0.35) return 'both';
      return leftArmVis >= rightArmVis ? 'left' : 'right';
    }

    // PT Knee Extension:
    if (ex === 'pt_knee_ext') {
      const leftAngle = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]);
      const rightAngle = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]);

      const isExtL = leftAngle > 110;
      const isExtR = rightAngle > 110;

      if (isExtL && isExtR) return 'both';
      if (isExtL && !isExtR) return 'left';
      if (isExtR && !isExtL) return 'right';
      if (leftLegVis > 0.35 && rightLegVis > 0.35) return 'both';
      return leftLegVis >= rightLegVis ? 'left' : 'right';
    }

    return 'both';
  }

  async startCamera() {
    if (this.app) this.app.stopStreams();
    if (this.app && this.app.audio) this.app.audio.init();

    const splash = document.getElementById('viewportSplash');
    if (splash) splash.classList.add('hidden');
    const startBtn = document.getElementById('startCamBtn');
    if (startBtn) startBtn.style.display = 'none';
    const stopBtn = document.getElementById('stopCamBtn');
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (this.video) this.video.classList.remove('non-mirrored');

    // Hide 3D avatar when using live camera
    if (this.app && this.app.avatar3d) this.app.avatar3d.hide();

    // Show guidance banner for active camera session
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.remove('hidden');
    }

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
        if (this.video.srcObject) {
          this._activeStream = this.video.srcObject;
        }
        this.isCameraRunning = true;
        this.showToast('Camera active. Step back into full view.', '📷');
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' }
        });
        this._activeStream = stream;
        this.video.srcObject = stream;
        await this.video.play();
        this.isCameraRunning = true;
        this.runVideoLoop();
        this.showToast('Camera active via WebRTC.', '📷');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      this.showToast('Could not access camera. Try Demo Simulator or Video Upload.', '⚠️');
      if (splash) splash.classList.remove('hidden');
      if (startBtn) startBtn.style.display = 'inline-flex';
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }

  runVideoLoop() {
    const step = async () => {
      if (!this.isCameraRunning) return;
      if (this.video && this.video.readyState >= 2 && this.pose) {
        await this.pose.send({ image: this.video });
      }
      this.animFrameId = requestAnimationFrame(step);
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  stopStreams() {
    this.isCameraRunning = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.camera) {
      try { this.camera.stop(); } catch (e) {}
      this.camera = null;
    }

    if (this.video && this.video.srcObject) {
      try {
        this.video.srcObject.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
      } catch (e) {}
      this.video.srcObject = null;
    }

    if (this._activeStream) {
      try {
        this._activeStream.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
      } catch(e) {}
      this._activeStream = null;
    }

    if (this.video) {
      try {
        this.video.pause();
        this.video.src = '';
        this.video.load();
      } catch(e) {}
    }
  }

  handleVideoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (this.app) this.app.stopStreams();
    if (this.app && this.app.audio) this.app.audio.init();

    const splash = document.getElementById('viewportSplash');
    if (splash) splash.classList.add('hidden');
    const startBtn = document.getElementById('startCamBtn');
    if (startBtn) startBtn.style.display = 'none';
    const stopBtn = document.getElementById('stopCamBtn');
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (this.video) this.video.classList.add('non-mirrored');

    // Show guidance banner for active video session
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.classList.remove('hidden');
    }

    if (this.app && this.app.avatar3d) this.app.avatar3d.hide();

    const videoURL = URL.createObjectURL(file);
    this.video.src = videoURL;
    this.video.loop = true;
    this.video.play().then(() => {
      this.isCameraRunning = true;
      this.runVideoLoop();
      this.showToast(`Analyzing video: ${file.name}`, '📁');
    }).catch(err => {
      console.error('Video error:', err);
      this.showToast('Could not play video.', '⚠️');
    });
  }
}
