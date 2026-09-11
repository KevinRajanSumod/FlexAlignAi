/**
 * FlexAlign AI - Biomechanical Evaluator & Repetition State Machine
 * Fixes applied:
 *  - Elbow drift: threshold raised to 45°, 1500ms fault cooldown
 *  - Rep state machine: curl inflection requires ≤ 60° (not 120°); all exercises require 300ms hold in peak zone
 *  - peakRom for curl tracks minimum (peak flexion) separately
 *  - Fault fire-rate limited globally to avoid every-frame alerts
 */

import { calculateJointAngle, calculateTorsoLean } from './math.js';

export class ExerciseEvaluator {
  constructor(audio) {
    this.audio = audio;
    this.mode = 'gym'; // 'gym' | 'pt'
    this.currentExercise = 'squat';

    // State Tracking
    this.currentAngle = 0;
    this.peakRom = 0;
    this.peakFlexRom = 999; // tracks minimum angle (max flexion) for exercises like curl
    this.repCount = 0;
    this.faultCount = 0;
    this.complianceScore = 100;
    this.lastRepTimestamp = null;
    this.repHistory = [];

    // Rep State Machine
    this.exerciseState = 'idle'; // 'idle' | 'entering' | 'inflection'
    this.inflectionEnteredAt = null; // timestamp when inflection zone was entered
    this.currentRepLowestAngle = 999;
    this.currentRepHighestAngle = 0;
    this.currentRepHadFault = false;

    // Fault cooldown — prevents every-frame fault alerts
    this.lastFaultTime = 0;
    this.FAULT_COOLDOWN_MS = 1500;

    // Prescribed Therapy Safe Thresholds
    this.therapySafeThresholds = {
      squat: 100,
      curl: 45,
      raise: 100
    };
  }

  setMode(mode) {
    this.mode = mode;
  }

  setExercise(exercise) {
    this.currentExercise = exercise;
    this.resetCycle();
  }

  resetCycle() {
    this.exerciseState = 'idle';
    this.inflectionEnteredAt = null;
    this.currentRepLowestAngle = 999;
    this.currentRepHighestAngle = 0;
    this.currentRepHadFault = false;
  }

  resetAll() {
    this.repCount = 0;
    this.faultCount = 0;
    this.peakRom = 0;
    this.peakFlexRom = 999;
    this.complianceScore = 100;
    this.repHistory = [];
    this.lastFaultTime = 0;
    this.resetCycle();
  }

  updateSafeThreshold(exercise, value) {
    this.therapySafeThresholds[exercise] = parseInt(value, 10);
  }

  /**
   * Checks if a fault is allowed to fire (cooldown guard).
   */
  _canFireFault() {
    const now = Date.now();
    if (now - this.lastFaultTime > this.FAULT_COOLDOWN_MS) {
      this.lastFaultTime = now;
      return true;
    }
    return false;
  }

  /**
   * Checks if the person has been in the inflection zone long enough for a valid rep.
   * @returns {boolean}
   */
  _inflectionHeldLongEnough() {
    if (!this.inflectionEnteredAt) return false;
    return (Date.now() - this.inflectionEnteredAt) >= 300;
  }

  /**
   * Evaluate pose landmarks against active exercise standards
   */
  evaluate(landmarks, side) {
    const isLeft = side === 'left';
    let mainAngle = 0;
    let isFault = false;
    let faultMessage = '';
    let guidanceMessage = '';
    let guidanceType = 'optimal';
    const now = Date.now();

    // 1. BODYWEIGHT SQUAT
    if (this.currentExercise === 'squat') {
      const hip = isLeft ? landmarks[23] : landmarks[24];
      const knee = isLeft ? landmarks[25] : landmarks[26];
      const ankle = isLeft ? landmarks[27] : landmarks[28];
      const shoulder = isLeft ? landmarks[11] : landmarks[12];

      mainAngle = calculateJointAngle(hip, knee, ankle);
      const torsoLeanAngle = calculateTorsoLean(shoulder, hip);

      if (this.mode === 'gym') {
        if (torsoLeanAngle > 42 && this._canFireFault()) {
          isFault = true;
          faultMessage = 'Chest Up! Excessive Trunk Lean';
          guidanceType = 'fault';
        }

        if (mainAngle > 160) {
          // Return to standing
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const repDuration = this.lastRepTimestamp ? ((now - this.lastRepTimestamp) / 1000).toFixed(1) : '2.0';
            this.lastRepTimestamp = now;

            if (this.currentRepLowestAngle <= 95) {
              this.repCount++;
              if (this.currentRepHadFault) {
                this.faultCount++;
                this.complianceScore = Math.max(40, this.complianceScore - 12);
                this.audio.playFaultAlert();
                this.audio.speakCoach('Rep completed with forward trunk lean');
              } else {
                this.complianceScore = Math.min(100, this.complianceScore + 4);
                this.audio.playRepSuccess();
                this.audio.speakCoach('Good depth, strong rep!');
              }
              this.recordRep('Squat', `${Math.round(this.currentRepLowestAngle)}° (Flex)`, `${repDuration}s`, !this.currentRepHadFault);
            } else {
              this.faultCount++;
              this.complianceScore = Math.max(30, this.complianceScore - 15);
              this.audio.playFaultAlert();
              this.audio.speakCoach('Incomplete depth. Descend below parallel.');
              this.recordRep('Squat', `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, false);
            }
          }
          this.resetCycle();
          guidanceMessage = 'Ready: Stand Tall & Initiate Descent';
        } else if (mainAngle <= 90) {
          // Full depth reached — this is the valid inflection zone
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          guidanceMessage = '⚡ Excellent Depth! Drive Up!';
          guidanceType = 'optimal';
        } else if (mainAngle < 140) {
          // Descending — mark as "entering" but not yet at valid inflection
          if (this.exerciseState === 'idle') {
            this.exerciseState = 'entering';
          }
          guidanceMessage = 'Descending... Aim for 90° or below';
        }

        if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
          this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
          if (isFault) this.currentRepHadFault = true;
        }

      } else {
        // PT Mode
        const safeLimit = this.therapySafeThresholds.squat;
        if (mainAngle < safeLimit && this._canFireFault()) {
          isFault = true;
          faultMessage = `Safe Limit Exceeded! Current: ${Math.round(mainAngle)}° (Safe: ${safeLimit}°)`;
          guidanceType = 'fault';
          this.audio.playFaultAlert();
          this.audio.speakCoach(`Stop descent. Safe limit is ${safeLimit} degrees.`);
        } else if (mainAngle <= safeLimit + 8) {
          guidanceMessage = 'Target Safe ROM Reached! Hold & Return Gently';
          guidanceType = 'optimal';
          this.audio.playSafeTargetTone();
        } else if (mainAngle < 155) {
          guidanceMessage = `Controlled Flexion: Target is ${safeLimit}°`;
        } else {
          guidanceMessage = 'Standing Rest: Begin Gentle Flexion';
        }

        if (mainAngle > 155) {
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const repDuration = this.lastRepTimestamp ? ((now - this.lastRepTimestamp) / 1000).toFixed(1) : '2.5';
            this.lastRepTimestamp = now;
            this.repCount++;
            const isCompliant = this.currentRepLowestAngle >= safeLimit - 3;
            if (!isCompliant) {
              this.faultCount++;
              this.complianceScore = Math.max(40, this.complianceScore - 15);
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep('Squat (PT)', `Peak Flex: ${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, isCompliant);
          }
          this.resetCycle();
        } else if (mainAngle <= safeLimit + 12) {
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
        }
      }

    // 2. BICEP CURL
    } else if (this.currentExercise === 'curl') {
      const shoulder = isLeft ? landmarks[11] : landmarks[12];
      const elbow = isLeft ? landmarks[13] : landmarks[14];
      const wrist = isLeft ? landmarks[15] : landmarks[16];
      const hip = isLeft ? landmarks[23] : landmarks[24];

      mainAngle = calculateJointAngle(shoulder, elbow, wrist);
      const elbowDriftAngle = calculateJointAngle(hip, shoulder, elbow);

      if (this.mode === 'gym') {
        // Raised threshold 28° → 45° + cooldown guard
        if (elbowDriftAngle > 45 && this._canFireFault()) {
          isFault = true;
          faultMessage = 'Elbow Drift! Pin Elbows to Ribcage';
          guidanceType = 'fault';
        }

        if (mainAngle > 155) {
          // Full extension — return position
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const repDuration = this.lastRepTimestamp ? ((now - this.lastRepTimestamp) / 1000).toFixed(1) : '2.0';
            this.lastRepTimestamp = now;

            if (this.currentRepLowestAngle <= 65) {
              this.repCount++;
              if (this.currentRepHadFault) {
                this.faultCount++;
                this.complianceScore = Math.max(35, this.complianceScore - 10);
                this.audio.playFaultAlert();
                this.audio.speakCoach('Keep elbow pinned during curl');
              } else {
                this.complianceScore = Math.min(100, this.complianceScore + 5);
                this.audio.playRepSuccess();
                this.audio.speakCoach('Clean curl! Squeeze at peak.');
              }
              this.recordRep('Bicep Curl', `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, !this.currentRepHadFault);
            } else {
              this.faultCount++;
              this.complianceScore = Math.max(35, this.complianceScore - 12);
              this.audio.playFaultAlert();
              this.audio.speakCoach('Partial rep. Curl all the way up.');
              this.recordRep('Bicep Curl', `${Math.round(this.currentRepLowestAngle)}° (Partial)`, `${repDuration}s`, false);
            }
          }
          this.resetCycle();
          guidanceMessage = 'Full Extension: Begin Concentric Curl';
        } else if (mainAngle <= 60) {
          // Valid peak contraction zone — must reach HERE for inflection to count
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          guidanceMessage = '💪 Peak Contraction Reached! Lower with Control';
          guidanceType = 'optimal';
        } else if (mainAngle < 130) {
          // Mid-curl — mark as entering but not yet valid inflection
          if (this.exerciseState === 'idle') {
            this.exerciseState = 'entering';
          }
          guidanceMessage = 'Curling up... Target ≤ 60°';
        } else {
          guidanceMessage = 'Full Extension: Begin Concentric Curl';
        }

        if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
          this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
          if (isFault) this.currentRepHadFault = true;
        }

      } else {
        // PT Mode
        const targetFlex = this.therapySafeThresholds.curl;
        if (mainAngle <= targetFlex + 10) {
          guidanceMessage = `Target Flexion Achieved (${Math.round(mainAngle)}°)! Smooth Extension`;
          guidanceType = 'optimal';
          this.audio.playSafeTargetTone();
        } else if (mainAngle < 140) {
          guidanceMessage = 'Flexing Elbow: Smooth Arc Pacing';
        } else {
          guidanceMessage = 'Relaxed Arm: Begin Controlled Flexion';
        }

        if (mainAngle > 150) {
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const repDuration = this.lastRepTimestamp ? ((now - this.lastRepTimestamp) / 1000).toFixed(1) : '3.0';
            this.lastRepTimestamp = now;
            this.repCount++;
            this.complianceScore = Math.min(100, this.complianceScore + 5);
            this.audio.playRepSuccess();
            this.recordRep('Elbow Flexion (PT)', `Flex: ${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, true);
          }
          this.resetCycle();
        } else if (mainAngle < 75) {
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
        }
      }

    // 3. SHOULDER LATERAL RAISE / ABDUCTION
    } else if (this.currentExercise === 'raise') {
      const hip = isLeft ? landmarks[23] : landmarks[24];
      const shoulder = isLeft ? landmarks[11] : landmarks[12];
      const elbow = isLeft ? landmarks[13] : landmarks[14];

      mainAngle = calculateJointAngle(hip, shoulder, elbow);

      if (this.mode === 'gym') {
        if (mainAngle > 105 && this._canFireFault()) {
          isFault = true;
          faultMessage = 'Over-Elevation! Stop at Shoulder Height (90°)';
          guidanceType = 'fault';
        }

        if (mainAngle < 25) {
          // Return to rest
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const repDuration = this.lastRepTimestamp ? ((now - this.lastRepTimestamp) / 1000).toFixed(1) : '2.0';
            this.lastRepTimestamp = now;

            if (this.currentRepHighestAngle >= 80 && this.currentRepHighestAngle <= 105) {
              this.repCount++;
              if (this.currentRepHadFault) {
                this.faultCount++;
                this.complianceScore = Math.max(30, this.complianceScore - 12);
                this.audio.playFaultAlert();
              } else {
                this.complianceScore = Math.min(100, this.complianceScore + 5);
                this.audio.playRepSuccess();
                this.audio.speakCoach('Great lateral raise!');
              }
              this.recordRep('Lateral Raise', `${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, !this.currentRepHadFault);
            } else if (this.currentRepHighestAngle > 105) {
              this.faultCount++;
              this.complianceScore = Math.max(30, this.complianceScore - 15);
              this.audio.playFaultAlert();
              this.audio.speakCoach('Over-elevation. Stop at parallel.');
              this.recordRep('Lateral Raise', `${Math.round(this.currentRepHighestAngle)}° (High)`, `${repDuration}s`, false);
            } else {
              this.faultCount++;
              this.recordRep('Lateral Raise', `${Math.round(this.currentRepHighestAngle)}° (Low)`, `${repDuration}s`, false);
            }
          }
          this.resetCycle();
          guidanceMessage = 'Arms at Side: Raise Laterally to Parallel';
        } else if (mainAngle >= 80 && mainAngle <= 100) {
          // Valid peak zone for lateral raise
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          guidanceMessage = '🦅 Parallel Reached (85°–95°)! Lower Slowly';
          guidanceType = 'optimal';
        } else if (mainAngle > 30) {
          if (this.exerciseState === 'idle') {
            this.exerciseState = 'entering';
          }
          guidanceMessage = 'Abducting Shoulder... Target 90°';
        }

        if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
          this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
          if (isFault) this.currentRepHadFault = true;
        }

      } else {
        // PT Mode
        if (mainAngle > 110 && this._canFireFault()) {
          isFault = true;
          faultMessage = '⚠️ Impingement Warning: Lower Below 100°';
          guidanceType = 'fault';
          this.audio.playFaultAlert();
          this.audio.speakCoach('Impingement warning. Lower arm immediately.');
        } else if (mainAngle >= 80 && mainAngle <= 100) {
          guidanceMessage = 'Safe Rehabilitation ROM Reached! Hold Gently';
          guidanceType = 'optimal';
          this.audio.playSafeTargetTone();
        } else if (mainAngle > 30) {
          guidanceMessage = 'Gradual Abduction in Progress';
        } else {
          guidanceMessage = 'Arm Resting at Side';
        }

        if (mainAngle < 25) {
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const repDuration = this.lastRepTimestamp ? ((now - this.lastRepTimestamp) / 1000).toFixed(1) : '3.0';
            this.lastRepTimestamp = now;
            this.repCount++;
            const isCompliant = this.currentRepHighestAngle <= 105;
            if (!isCompliant) {
              this.faultCount++;
              this.complianceScore = Math.max(35, this.complianceScore - 15);
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep('Shoulder Abduction (PT)', `Peak ROM: ${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, isCompliant);
          }
          this.resetCycle();
        } else if (mainAngle > 60) {
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
        }
      }
    }

    this.currentAngle = Math.round(mainAngle * 10) / 10;

    // peakRom: for curl track minimum (peak flexion); for others track maximum (peak extension/abduction)
    if (this.currentExercise === 'curl') {
      if (mainAngle < this.peakFlexRom && mainAngle > 5) {
        this.peakFlexRom = Math.round(mainAngle);
      }
      this.peakRom = this.peakFlexRom === 999 ? 0 : this.peakFlexRom;
    } else {
      this.peakRom = Math.max(this.peakRom, Math.round(mainAngle));
    }

    return {
      angle: this.currentAngle,
      peakRom: this.peakRom,
      isFault,
      guidanceText: isFault ? faultMessage : guidanceMessage,
      guidanceType,
      repCount: this.repCount,
      faultCount: this.faultCount,
      complianceScore: this.complianceScore,
      newRecord: this.latestRecord
    };
  }

  recordRep(exercise, peakRom, duration, isCompliant) {
    const record = {
      id: this.repCount,
      time: new Date().toLocaleTimeString(),
      exercise,
      peakRom,
      duration,
      status: isCompliant ? 'PASS' : 'FAULT'
    };
    this.repHistory.unshift(record);
    this.latestRecord = record;
  }
}
