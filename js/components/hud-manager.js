/**
 * FlexAlign AI - HUD & Telemetry Manager Component
 * Manages biomechanical HUD metrics, compliance dial progress, guidance banners,
 * post-rep coach tips, toast notifications, and 3D avatar viewport navigation controls.
 */

import { getExerciseDefinition, GYM_EXERCISES, PT_EXERCISES } from '../exercises.js';

export class HUDManager {
  constructor(options = {}) {
    this.app = options.app;
    this.postRepCoachTipTimer = null;
    this.isShowingPostRepTip = false;
    this.isGuidanceDismissed = false;
    this.dismissedGuidanceText = '';
    this._toastTimer = null;
  }

  showToast(msg, icon = 'ℹ️') {
    const toast = document.getElementById('statusToast');
    if (!toast) return;
    const iconEl = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMsg');
    if (iconEl) iconEl.textContent = icon;
    if (msgEl) msgEl.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  updateTelemetryUI(res) {
    const angleValEl = document.getElementById('liveAngleValue');
    if (angleValEl) {
      angleValEl.textContent = `${res.angle}°`;
      angleValEl.style.color = res.isFault ? '#ef4444' : (res.guidanceType === 'optimal' ? 'var(--success)' : 'var(--primary)');
    }

    // Circular Dial Progress
    const dialBar = document.getElementById('dialProgressBar');
    if (dialBar) {
      const circumference = 2 * Math.PI * 45; // 282.74
      const fraction = Math.min(1, Math.max(0, res.angle / 180));
      dialBar.style.strokeDashoffset = circumference * (1 - fraction);
      dialBar.style.stroke = res.isFault ? '#ef4444' : (res.guidanceType === 'optimal' ? 'var(--success)' : 'var(--primary)');
    }

    // Form Compliance Score
    const scoreVal = Math.round(res.complianceScore);
    const scoreTextEl = document.getElementById('complianceScoreText');
    if (scoreTextEl) {
      scoreTextEl.textContent = `${scoreVal}%`;
      scoreTextEl.style.color = res.isFault ? '#ef4444' : (scoreVal >= 80 ? 'var(--success)' : 'var(--warning)');
    }

    const fillBarEl = document.getElementById('complianceFillBar');
    if (fillBarEl) {
      fillBarEl.style.width = `${scoreVal}%`;
      fillBarEl.style.background = res.isFault ? '#ef4444' : (scoreVal >= 80 ? 'var(--success)' : 'var(--warning)');
    }

    // Four Statistics Metrics
    const repCountEl = document.getElementById('repCountVal');
    if (repCountEl) repCountEl.textContent = res.repCount;
    const peakRomEl = document.getElementById('peakRomVal');
    if (peakRomEl) peakRomEl.textContent = `${res.peakRom}°`;
    const faultCountEl = document.getElementById('faultCountVal');
    if (faultCountEl) faultCountEl.textContent = res.faultCount;

    // Viewport Fault Alert glow
    const vpContainer = document.getElementById('viewportContainer');
    if (vpContainer) {
      vpContainer.classList.toggle('has-fault', Boolean(res.isFault));
    }

    // Active Joint Badge Alert color
    const jointBadge = document.getElementById('hudActiveJointBadge');
    if (jointBadge) {
      jointBadge.style.borderColor = res.isFault ? 'rgba(239, 68, 68, 0.8)' : '';
      jointBadge.style.color = res.isFault ? '#ef4444' : '';
      jointBadge.style.boxShadow = res.isFault ? '0 0 12px rgba(239, 68, 68, 0.4)' : '';
    }

    // Live Tracking Dot and Text
    const dot = document.getElementById('hudLiveDot');
    const trackingText = document.getElementById('hudTrackingText');
    if (dot && trackingText) {
      if (res.isFault) {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = '0 0 10px #ef4444';
        trackingText.textContent = 'FAULT DETECTED';
        trackingText.style.color = '#ef4444';
      } else {
        dot.style.background = '';
        dot.style.boxShadow = '';
        const isSim = Boolean(this.app && this.app.isSimulationRunning);
        trackingText.textContent = isSim ? 'SIMULATION' : 'TRACKING';
        trackingText.style.color = '';
      }
    }

    // Dynamic Biomechanical Guidance Banner
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      const msgEl = document.getElementById('hudGuidanceText');
      const iconEl = document.getElementById('hudGuidanceIcon');
      const badgeEl = document.getElementById('hudGuidanceBadge');

      if (this.isGuidanceDismissed) {
        if (res.guidanceText && res.guidanceText !== this.dismissedGuidanceText) {
          this.isGuidanceDismissed = false;
        } else {
          return;
        }
      }

      const isSim = Boolean(this.app && this.app.isSimulationRunning);

      if (res.isFault) {
        if (this.postRepCoachTipTimer) {
          clearTimeout(this.postRepCoachTipTimer);
          this.postRepCoachTipTimer = null;
          this.isShowingPostRepTip = false;
        }
        banner.style.display = 'flex';
        banner.className = 'hud-guidance-banner fault';
        banner.classList.remove('hidden');
        if (badgeEl) badgeEl.textContent = isSim ? 'SIMULATED FAULT' : 'FORM FAULT';
        if (iconEl) iconEl.textContent = '⚠️';
        if (msgEl) msgEl.textContent = res.guidanceText;
      } else if (res.guidanceType === 'optimal') {
        banner.style.display = 'flex';
        banner.className = 'hud-guidance-banner optimal';
        banner.classList.remove('hidden');
        if (badgeEl) badgeEl.textContent = 'OPTIMAL ROM';
        if (iconEl) iconEl.textContent = '✨';
        if (msgEl) msgEl.textContent = res.guidanceText;
      } else if (res.guidanceText) {
        banner.style.display = 'flex';
        banner.className = 'hud-guidance-banner info';
        banner.classList.remove('hidden');
        const curEx = (this.app && this.app.evaluator && this.app.evaluator.currentExercise) || '';
        const exName = curEx.toUpperCase().replace(/^(GYM_|PT_)/, '').replace(/_/g, ' ') || 'TECHNIQUE';
        if (badgeEl) badgeEl.textContent = isSim ? `3D ${exName}` : `${exName} CUE`;
        if (iconEl) iconEl.textContent = '💡';
        if (msgEl) msgEl.textContent = res.guidanceText;
      } else {
        if (!this.isShowingPostRepTip) {
          banner.style.display = 'none';
        }
      }
    }
  }

  appendRepHistory(record) {
    const tbody = document.getElementById('repHistoryBody');
    const emptyRow = document.getElementById('emptyHistoryRow');
    if (emptyRow) emptyRow.remove();

    const secMetric = document.getElementById('secondaryMetricVal');
    if (secMetric) secMetric.textContent = record.duration;

    if (tbody) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${record.id}</td>
        <td style="color: #fff; font-weight: 600;">${record.exercise}</td>
        <td>${record.peakRom}</td>
        <td>${record.duration}</td>
        <td><span class="status-pill ${record.status === 'PASS' ? 'pass' : 'fault'}">${record.status}</span></td>
      `;
      tbody.prepend(tr);
    }

    const countBadge = document.getElementById('historyCountBadge');
    if (countBadge && this.app && this.app.evaluator) {
      countBadge.textContent = this.app.evaluator.repHistory.length;
    }
  }

  showPostRepCoachTip(record) {
    if (!this.app || this.app.isSimulationRunning || !this.app.isCameraRunning) {
      this.dismissCoachTip();
      return;
    }

    const banner = document.getElementById('hudGuidanceBanner');
    if (!banner) return;

    const msgEl = document.getElementById('hudGuidanceText');
    const iconEl = document.getElementById('hudGuidanceIcon');
    const badgeEl = document.getElementById('hudGuidanceBadge');

    const exId = this.app.evaluator.currentExercise;
    const exData = getExerciseDefinition(exId) || GYM_EXERCISES[exId] || PT_EXERCISES[exId];
    const rawTip = exData ? exData.tip.replace(/<[^>]+>/g, '').replace(/^[⚡💪💡]\s*/, '') : 'Maintain joint alignment throughout.';

    if (this.postRepCoachTipTimer) {
      clearTimeout(this.postRepCoachTipTimer);
    }

    this.isShowingPostRepTip = true;
    banner.style.display = 'flex';
    banner.className = 'hud-guidance-banner info';
    banner.classList.remove('hidden');

    if (badgeEl) badgeEl.textContent = `COACH TIP · REP #${record.id} DONE`;
    if (iconEl) iconEl.textContent = '💡';
    if (msgEl) msgEl.textContent = `${record.status === 'PASS' ? 'Good rep! ' : ''}${rawTip}`;

    this.postRepCoachTipTimer = setTimeout(() => {
      this.dismissCoachTip();
    }, 18000);
  }

  showPostSessionCoachTip() {
    if (!this.app || this.app.isSimulationRunning || !this.app.isCameraRunning) {
      this.dismissCoachTip();
      return;
    }

    const banner = document.getElementById('hudGuidanceBanner');
    if (!banner) return;

    const reps = (this.app && this.app.evaluator) ? this.app.evaluator.repCount : 0;
    if (reps === 0) {
      this.dismissCoachTip();
      return;
    }

    const msgEl = document.getElementById('hudGuidanceText');
    const iconEl = document.getElementById('hudGuidanceIcon');
    const badgeEl = document.getElementById('hudGuidanceBadge');

    const exId = this.app.evaluator.currentExercise;
    const exData = getExerciseDefinition(exId) || GYM_EXERCISES[exId] || PT_EXERCISES[exId];
    const rawTip = exData ? exData.tip.replace(/<[^>]+>/g, '').replace(/^[⚡💪💡]\s*/, '') : 'Focus on full range of motion with controlled tempo.';
    const score = Math.round(this.app.evaluator.complianceScore || 0);

    this.isShowingPostRepTip = true;
    banner.style.display = 'flex';
    banner.className = 'hud-guidance-banner info show-post-tip';
    banner.classList.remove('hidden');

    if (badgeEl) badgeEl.textContent = 'COACH TIP · EXERCISE COMPLETE';
    if (iconEl) iconEl.textContent = '💡';
    const summaryMsg = `Exercise Finished (${reps} reps · ${score}% score). Coach Tip: ${rawTip}`;
    if (msgEl) msgEl.textContent = summaryMsg;

    if (this.app && this.app.coachDrawer) {
      this.app.coachDrawer.addChatBubble('assistant', `🏁 **Exercise Completed (${reps} reps · ${score}% compliance)**\n\n💡 **Biomechanical Coach Tip:** ${rawTip}`);
    }

    if (this.postRepCoachTipTimer) clearTimeout(this.postRepCoachTipTimer);
    this.postRepCoachTipTimer = setTimeout(() => {
      this.dismissCoachTip();
    }, 20000);
  }

  dismissCoachTip(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    if (this.postRepCoachTipTimer) {
      clearTimeout(this.postRepCoachTipTimer);
      this.postRepCoachTipTimer = null;
    }
    this.isShowingPostRepTip = false;
    const msgEl = document.getElementById('hudGuidanceText');
    this.dismissedGuidanceText = msgEl ? msgEl.textContent : '';
    this.isGuidanceDismissed = true;
    const banner = document.getElementById('hudGuidanceBanner');
    if (banner) {
      banner.style.display = 'none';
      banner.classList.add('hidden');
    }
  }

  // 3D Avatar Viewport Controls
  setAvatarView(preset) {
    if (!this.app || !this.app.avatar3d) return;
    this.app.avatar3d.setViewPreset(preset);

    const btnMap = {
      front: 'btnViewFront',
      side: 'btnViewSide',
      iso: 'btnViewIso',
      top: 'btnViewTop'
    };

    Object.keys(btnMap).forEach(k => {
      const b = document.getElementById(btnMap[k]);
      if (b) b.classList.toggle('active', k === preset);
    });

    const labels = { front: 'Front (0°)', side: 'Side Sagittal (90°)', iso: '3/4 Isometric', top: 'Top Overhead' };
    this.showToast(`Camera view: ${labels[preset] || preset}`, '🎥');
  }

  panAvatar(deltaX, deltaY) {
    if (this.app && this.app.avatar3d) {
      this.app.avatar3d.pan(deltaX, deltaY);
    }
  }

  zoomAvatar(factor) {
    if (this.app && this.app.avatar3d) {
      this.app.avatar3d.zoom(factor);
    }
  }

  resetAvatarView() {
    if (this.app && this.app.avatar3d) {
      this.app.avatar3d.resetView();
      this.setAvatarView('front');
      this.showToast('Camera reset to center view.', '↺');
    }
  }

  toggleAvatarAutoOrbit() {
    if (!this.app || !this.app.avatar3d) return;
    const isOrbit = this.app.avatar3d.toggleAutoOrbit();
    const btn = document.getElementById('btnAutoOrbit');
    if (btn) btn.classList.toggle('active', isOrbit);
    const quickBtn = document.getElementById('quickOrbitBtn');
    if (quickBtn) quickBtn.classList.toggle('active', isOrbit);
    this.showToast(isOrbit ? '360° Continuous Orbit ON' : 'Orbit Stopped', '🔄');
  }

  toggleAvatarXRay() {
    if (!this.app || !this.app.avatar3d) return;
    const isXRay = this.app.avatar3d.toggleXRayMode();
    const btn = document.getElementById('btnXRayMode');
    if (btn) btn.classList.toggle('active', isXRay);
    this.showToast(isXRay ? 'Holographic Skeletal X-Ray ON' : 'Standard Suit Shading ON', '⚡');
  }
}
