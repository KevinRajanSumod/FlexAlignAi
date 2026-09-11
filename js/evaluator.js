/**
 * FlexAlign AI - Biomechanical Evaluator & Repetition State Machine
 * Clear biomechanical distinction between Bicep Curl (Flexion) and Elbow Extension (Lockout).
 * Continuous visual fault detection on every frame; throttled audio alerts.
 */

import { calculateJointAngle, calculateTorsoLean } from './math.js';
import { getExerciseDefinition } from './exercises.js';

export class ExerciseEvaluator {
  constructor(audio) {
    this.audio = audio;
    this.mode = 'gym'; // 'gym' | 'pt'
    this.currentExercise = 'gym_squat';

    // State Tracking
    this.currentAngle = 0;
    this.peakRom = 0;
    this.peakFlexRom = 999;
    this.repCount = 0;
    this.faultCount = 0;
    this.complianceScore = 100;
    this.lastRepTimestamp = null;
    this.repHistory = [];

    // Rep State Machine
    this.exerciseState = 'idle'; // 'idle' | 'entering' | 'inflection'
    this.inflectionEnteredAt = null; 
    this.currentRepLowestAngle = 999;
    this.currentRepHighestAngle = 0;
    this.currentRepHadFault = false;

    // Audio Alert Cooldown (independent from visual continuous fault state)
    this.lastFaultAudioTime = 0;
    this.FAULT_AUDIO_COOLDOWN_MS = 2000;

    // Fault Debounce: require 2 consecutive fault frames for instantaneous responsive feedback
    this._consecutiveFaultFrames = 0;
    this._FAULT_FRAME_THRESHOLD = 2;

    // Settings
    this.therapySafeThresholds = {
      pt_raise: 100,
      pt_knee_ext: 160,
      pt_elbow_ext: 165,
      pt_elbow_flex: 90
    };
    
    this.gymTargets = {
      gym_squat: 90,
      gym_curl: 45,
      gym_extension: 165,
      gym_press: 160
    };
  }

  setMode(mode) {
    this.mode = mode;
  }

  setExercise(exercise) {
    this.currentExercise = exercise;
    this.peakRom = 0;
    this.peakFlexRom = 999;
    this.resetCycle();
  }

  resetCycle() {
    this.exerciseState = 'idle';
    this.inflectionEnteredAt = null;
    this.currentRepLowestAngle = 999;
    this.currentRepHighestAngle = 0;
    this.currentRepHadFault = false;
    this._consecutiveFaultFrames = 0;
  }

  resetAll() {
    this.repCount = 0;
    this.faultCount = 0;
    this.peakRom = 0;
    this.peakFlexRom = 999;
    this.complianceScore = 100;
    this.repHistory = [];
    this.lastFaultAudioTime = 0;
    this._consecutiveFaultFrames = 0;
    this.resetCycle();
  }

  updateSafeThreshold(exercise, value) {
    this.therapySafeThresholds[exercise] = parseInt(value, 10);
  }

  _canFireFaultAudio() {
    const now = Date.now();
    if (now - this.lastFaultAudioTime > this.FAULT_AUDIO_COOLDOWN_MS) {
      this.lastFaultAudioTime = now;
      return true;
    }
    return false;
  }

  _inflectionHeldLongEnough() {
    if (!this.inflectionEnteredAt) return false;
    return (Date.now() - this.inflectionEnteredAt) >= 300;
  }

  evaluate(landmarks, side, isSimulatedOptimal = false) {
    const isBoth = side === 'both' || side === 'auto';
    const isLeft = side === 'left';
    let mainAngle = 0;
    let isFault = false;
    let faultMessage = '';
    let faultLimb = null; // 'trunk' | 'knees' | 'elbows' | 'shoulders'
    let guidanceMessage = '';
    let guidanceType = 'info';
    const now = Date.now();

    // ────────────────────────────────────────────────────────────────
    // 1. GYM MODE: SQUAT
    // ────────────────────────────────────────────────────────────────
    if (this.currentExercise === 'gym_squat' || this.currentExercise === 'squat') {
      let torsoLeanAngle;
      let aL = 0, aR = 0;
      if (isBoth) {
        aL = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]);
        aR = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]);
        mainAngle = Math.round((aL + aR) / 2);
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );
      } else {
        const hip = isLeft ? landmarks[23] : landmarks[24];
        const knee = isLeft ? landmarks[25] : landmarks[26];
        const ankle = isLeft ? landmarks[27] : landmarks[28];
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        mainAngle = calculateJointAngle(hip, knee, ankle);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);
      }

      // Fault 1: Excessive forward trunk lean (> 34°)
      if (torsoLeanAngle > 34) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Chest Up! Excessive Trunk Lean';
      }
      // Fault 2: Knee Valgus (knees caving inward)
      else if (mainAngle < 140) {
        if (isBoth) {
          const valgusL = landmarks[25] && landmarks[27] && (landmarks[25].x - landmarks[27].x > 0.035);
          const valgusR = landmarks[26] && landmarks[28] && (landmarks[28].x - landmarks[26].x > 0.035);
          if (valgusL || valgusR) {
            isFault = true;
            faultLimb = 'knees';
            faultMessage = '⚠️ Knee Valgus! Push Knees Out';
          }
        } else {
          const knee = isLeft ? landmarks[25] : landmarks[26];
          const ankle = isLeft ? landmarks[27] : landmarks[28];
          const valgus = isLeft ? (knee.x - ankle.x > 0.035) : (ankle.x - knee.x > 0.035);
          if (valgus) {
            isFault = true;
            faultLimb = 'knees';
            faultMessage = '⚠️ Knee Valgus! Push Knees Out';
          }
        }
      }
      // Fault 3: Asymmetrical weight shift
      else if (isBoth && Math.abs(aL - aR) > 18) {
        isFault = true;
        faultLimb = 'knees';
        faultMessage = '⚠️ Asymmetrical Weight Shift! Balance Evenly';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      }

      if (mainAngle > 160) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 2.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '2.0';
          this.lastRepTimestamp = now;

          if (this.currentRepLowestAngle <= 95) {
            this.repCount++;
            if (this.currentRepHadFault) {
              this.faultCount++;
              this.complianceScore = Math.max(35, this.complianceScore - 12);
              this.audio.playFaultAlert();
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 4);
              this.audio.playRepSuccess();
            }
            this.recordRep('Squat', `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, !this.currentRepHadFault);
          } else {
            this.faultCount++;
            this.complianceScore = Math.max(30, this.complianceScore - 15);
            this.audio.playFaultAlert();
            this.recordRep('Squat', `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, false);
          }
        }
        this.resetCycle();
        if (!isFault) {
          guidanceMessage = 'Ready: Stand Tall & Initiate Descent';
          guidanceType = 'info';
        }
      } else if (mainAngle <= 90) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        if (!isFault) {
          guidanceMessage = '⚡ Excellent Depth! Drive Up!';
          guidanceType = 'optimal';
        }
      } else if (mainAngle < 140) {
        if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        if (!isFault) {
          guidanceMessage = 'Descending... Aim for ≤ 90° Parallel';
          guidanceType = 'info';
        }
      } else {
        if (!isFault) {
          guidanceMessage = 'Ready: Stand Tall & Initiate Descent';
          guidanceType = 'info';
        }
      }

      if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
        this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
        if (isFault) this.currentRepHadFault = true;
      }

    // ────────────────────────────────────────────────────────────────
    // 2. GYM MODE: BICEP CURL (FLEXION TARGET)
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'gym_curl' || this.currentExercise === 'curl') {
      let elbowDriftAngle = 0;
      let torsoLeanAngle = 0;
      let elbowOffRibs = false;
      let flare = 0;

      if (isBoth) {
        const aL = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
        const aR = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
        mainAngle = Math.round(Math.min(aL, aR));

        const shoulderWidth = Math.hypot(landmarks[11].x - landmarks[12].x, landmarks[11].y - landmarks[12].y) || 0.25;
        const flareL = Math.abs(landmarks[13].x - landmarks[23].x) / shoulderWidth;
        const flareR = Math.abs(landmarks[14].x - landmarks[24].x) / shoulderWidth;
        flare = Math.max(flareL, flareR);

        const driftL = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
        const driftR = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);
        elbowDriftAngle = Math.max(driftL, driftR);
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );

        if (elbowDriftAngle > 16 || flare > 0.28) {
          elbowOffRibs = true;
        }
      } else {
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        const elbow = isLeft ? landmarks[13] : landmarks[14];
        const wrist = isLeft ? landmarks[15] : landmarks[16];
        const hip = isLeft ? landmarks[23] : landmarks[24];
        mainAngle = calculateJointAngle(shoulder, elbow, wrist);
        elbowDriftAngle = calculateJointAngle(hip, shoulder, elbow);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);

        const otherShoulder = isLeft ? landmarks[12] : landmarks[11];
        const shoulderWidth = (shoulder && otherShoulder) ? (Math.hypot(shoulder.x - otherShoulder.x, shoulder.y - otherShoulder.y) || 0.25) : 0.25;
        flare = Math.abs(elbow.x - hip.x) / shoulderWidth;

        if (elbowDriftAngle > 16 || flare > 0.28) {
          elbowOffRibs = true;
        }
      }

      // Fault 1: Elbow drifting forward or flaring out
      if (elbowOffRibs) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = flare > 0.28 
          ? '⚠️ Elbows Flaring! Keep Elbows Tucked In' 
          : '⚠️ Form Fault: Elbow Off Ribs! Pin Elbows to Ribcage';
      }
      // Fault 2: Torso backwards cheat lean (> 14°)
      else if (mainAngle < 145 && torsoLeanAngle > 14) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Cheating Motion! Keep Torso Upright & Still';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      }

      if (mainAngle > 155) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 2.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '2.0';
          this.lastRepTimestamp = now;

          if (this.currentRepLowestAngle <= 55) {
            this.repCount++;
            if (this.currentRepHadFault) {
              this.faultCount++;
              this.complianceScore = Math.max(35, this.complianceScore - 10);
              this.audio.playFaultAlert();
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep('Bicep Curl', `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, !this.currentRepHadFault);
          } else {
            this.faultCount++;
            this.complianceScore = Math.max(30, this.complianceScore - 12);
            this.audio.playFaultAlert();
            this.recordRep('Bicep Curl', `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, false);
          }
        }
        this.resetCycle();
        if (!isFault) {
          guidanceMessage = 'Full Extension: Curl Upward to Shoulder';
          guidanceType = 'info';
        }
      } else if (mainAngle <= 48) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        if (!isFault) {
          guidanceMessage = '💪 Peak Bicep Contraction! Lower with Control';
          guidanceType = 'optimal';
        }
      } else if (mainAngle < 130) {
        if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        if (!isFault) {
          guidanceMessage = 'Curling Up... Target ≤ 45°';
          guidanceType = 'info';
        }
      } else {
        if (!isFault) {
          guidanceMessage = 'Full Extension: Curl Upward to Shoulder';
          guidanceType = 'info';
        }
      }

      if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
        this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
        if (isFault) this.currentRepHadFault = true;
      }

    // ────────────────────────────────────────────────────────────────
    // 3. GYM MODE: TRICEPS ELBOW EXTENSION (LOCKOUT TARGET)
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'gym_extension') {
      let shoulderSwingAngle = 0;
      let torsoLeanAngle = 0;
      let flare = 0;

      if (isBoth) {
        const aL = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
        const aR = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
        mainAngle = Math.round((aL + aR) / 2);
        const swingL = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
        const swingR = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);
        shoulderSwingAngle = Math.max(swingL, swingR);
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );

        const shoulderWidth = Math.hypot(landmarks[11].x - landmarks[12].x, landmarks[11].y - landmarks[12].y) || 0.25;
        flare = Math.max(
          Math.abs(landmarks[13].x - landmarks[23].x),
          Math.abs(landmarks[14].x - landmarks[24].x)
        ) / shoulderWidth;
      } else {
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        const elbow = isLeft ? landmarks[13] : landmarks[14];
        const wrist = isLeft ? landmarks[15] : landmarks[16];
        const hip = isLeft ? landmarks[23] : landmarks[24];
        mainAngle = calculateJointAngle(shoulder, elbow, wrist);
        shoulderSwingAngle = calculateJointAngle(hip, shoulder, elbow);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);

        const otherShoulder = isLeft ? landmarks[12] : landmarks[11];
        const shoulderWidth = (shoulder && otherShoulder) ? (Math.hypot(shoulder.x - otherShoulder.x, shoulder.y - otherShoulder.y) || 0.25) : 0.25;
        flare = Math.abs(elbow.x - hip.x) / shoulderWidth;
      }

      // Fault 1: Upper arm swinging forward or back (> 16°)
      if (shoulderSwingAngle > 16) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = '⚠️ Upper Arm Sway! Lock Shoulders & Elbows in Place';
      }
      // Fault 2: Elbows flaring outward (> 0.28)
      else if (flare > 0.28) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = '⚠️ Elbows Flaring! Keep Upper Arms Tucked at Sides';
      }
      // Fault 3: Torso forward slump / sway (> 20°)
      else if (torsoLeanAngle > 20) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Torso Movement! Maintain Rigid Spine';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      }

      if (mainAngle < 85) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 2.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '2.0';
          this.lastRepTimestamp = now;

          if (this.currentRepHighestAngle >= 165) {
            this.repCount++;
            if (this.currentRepHadFault) {
              this.faultCount++;
              this.complianceScore = Math.max(35, this.complianceScore - 10);
              this.audio.playFaultAlert();
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep('Triceps Pushdown', `${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, !this.currentRepHadFault);
          } else {
            this.faultCount++;
            this.complianceScore = Math.max(30, this.complianceScore - 12);
            this.audio.playFaultAlert();
            this.recordRep('Triceps Pushdown', `${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, false);
          }
        }
        this.resetCycle();
        if (!isFault) {
          guidanceMessage = 'Setup: Elbows Flexed. Drive into Full Extension';
          guidanceType = 'info';
        }
      } else if (mainAngle >= 165) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        if (!isFault) {
          guidanceMessage = '⚡ Full Triceps Lockout Reached! Smooth Return';
          guidanceType = 'optimal';
        }
      } else if (mainAngle > 105) {
        if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        if (!isFault) {
          guidanceMessage = 'Extending... Push to ≥ 165° Lockout';
          guidanceType = 'info';
        }
      } else {
        if (!isFault) {
          guidanceMessage = 'Setup: Elbows Flexed. Drive into Full Extension';
          guidanceType = 'info';
        }
      }

      if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
        this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
        if (isFault) this.currentRepHadFault = true;
      }

    // ────────────────────────────────────────────────────────────────
    // 4. GYM MODE: OVERHEAD PRESS
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'gym_press') {
      let torsoLeanAngle = 0;
      let aL = 0, aR = 0;

      if (isBoth) {
        aL = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
        aR = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
        mainAngle = Math.round((aL + aR) / 2);
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );
      } else {
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        const elbow = isLeft ? landmarks[13] : landmarks[14];
        const wrist = isLeft ? landmarks[15] : landmarks[16];
        const hip = isLeft ? landmarks[23] : landmarks[24];
        mainAngle = calculateJointAngle(shoulder, elbow, wrist);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);
      }

      // Fault 1: Lumbar hyperextension / core arching (> 15°)
      if (torsoLeanAngle > 15) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Core Arching! Squeeze Glutes & Brace Abs';
      }
      // Fault 2: Uneven press lockout
      else if (isBoth && Math.abs(aL - aR) > 16) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = '⚠️ Asymmetric Press! Drive Both Arms Simultaneously';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      }

      if (mainAngle < 90) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 2.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '2.0';
          this.lastRepTimestamp = now;

          if (this.currentRepHighestAngle >= 155) {
            this.repCount++;
            if (this.currentRepHadFault) {
              this.faultCount++;
              this.complianceScore = Math.max(35, this.complianceScore - 10);
              this.audio.playFaultAlert();
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep('Overhead Press', `${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, !this.currentRepHadFault);
          } else {
            this.faultCount++;
            this.complianceScore = Math.max(30, this.complianceScore - 12);
            this.audio.playFaultAlert();
            this.recordRep('Overhead Press', `${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, false);
          }
        }
        this.resetCycle();
        if (!isFault) {
          guidanceMessage = 'Rack Position: Press Bar Straight Overhead';
          guidanceType = 'info';
        }
      } else if (mainAngle >= 160) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        if (!isFault) {
          guidanceMessage = '⚡ Overhead Lockout! Return to Rack';
          guidanceType = 'optimal';
        }
      } else if (mainAngle > 115) {
        if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        if (!isFault) {
          guidanceMessage = 'Pressing Up... Drive to Lockout (> 160°)';
          guidanceType = 'info';
        }
      } else {
        if (!isFault) {
          guidanceMessage = 'Rack Position: Press Bar Straight Overhead';
          guidanceType = 'info';
        }
      }

      if (this.exerciseState === 'inflection' || this.exerciseState === 'entering') {
        this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
        if (isFault) this.currentRepHadFault = true;
      }

    // ────────────────────────────────────────────────────────────────
    // 5. THERAPY MODE: SHOULDER LATERAL RAISE
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'pt_raise' || this.currentExercise === 'raise') {
      let torsoLeanAngle = 0;
      let shoulderHiking = false;

      if (isBoth) {
        const aL = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
        const aR = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);
        mainAngle = Math.round(Math.max(aL, aR));
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );

        if (Math.abs(landmarks[11].y - landmarks[12].y) > 0.035) {
          shoulderHiking = true;
        }
      } else {
        const hip = isLeft ? landmarks[23] : landmarks[24];
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        const elbow = isLeft ? landmarks[13] : landmarks[14];
        mainAngle = calculateJointAngle(hip, shoulder, elbow);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);

        const otherShoulder = isLeft ? landmarks[12] : landmarks[11];
        if (otherShoulder && Math.abs(shoulder.y - otherShoulder.y) > 0.035) {
          shoulderHiking = true;
        }
      }
      const safeCeiling = this.therapySafeThresholds.pt_raise || 100;

      // Fault 1: Impingement risk (raised above clinical safe ceiling)
      if (mainAngle > safeCeiling) {
        isFault = true;
        faultLimb = 'shoulders';
        faultMessage = `⚠️ Impingement Warning! Cease Above ${safeCeiling}°`;
      }
      // Fault 2: Shoulder hiking / trapezius shrugging
      else if (shoulderHiking && mainAngle > 45) {
        isFault = true;
        faultLimb = 'shoulders';
        faultMessage = '⚠️ Shoulder Shrugging! Keep Scapula Depressed';
      }
      // Fault 3: Trunk lateral lean / swinging
      else if (torsoLeanAngle > 12) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Trunk Sway! Stay Upright, Do Not Heave';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      } else if (mainAngle >= safeCeiling - 15) {
        guidanceMessage = `Optimal Target Arc (${Math.round(mainAngle)}°)! Smooth Return`;
        guidanceType = 'optimal';
      } else if (mainAngle > 40) {
        guidanceMessage = 'Raising Arm: Smooth Controlled Abduction';
        guidanceType = 'info';
      } else {
        guidanceMessage = 'Arm at Rest: Initiate Lateral Raise';
        guidanceType = 'info';
      }

      if (mainAngle < 35) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 3.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '3.0';
          this.lastRepTimestamp = now;
          this.repCount++;
          const isCompliant = this.currentRepHighestAngle <= safeCeiling && !this.currentRepHadFault;
          if (!isCompliant) {
            this.faultCount++;
            this.complianceScore = Math.max(40, this.complianceScore - 15);
            this.audio.playFaultAlert();
          } else {
            this.complianceScore = Math.min(100, this.complianceScore + 5);
            this.audio.playRepSuccess();
          }
          this.recordRep('Lat Raise (PT)', `Peak: ${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, isCompliant);
        }
        this.resetCycle();
      } else if (mainAngle >= 65) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
      }

    // ────────────────────────────────────────────────────────────────
    // 6. THERAPY MODE: SEATED KNEE EXTENSION
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'pt_knee_ext') {
      let torsoLeanAngle = 0;
      if (isBoth) {
        const aL = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]);
        const aR = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]);
        mainAngle = Math.round(Math.max(aL, aR));
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );
      } else {
        const hip = isLeft ? landmarks[23] : landmarks[24];
        const knee = isLeft ? landmarks[25] : landmarks[26];
        const ankle = isLeft ? landmarks[27] : landmarks[28];
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        mainAngle = calculateJointAngle(hip, knee, ankle);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);
      }
      const safeLimit = this.therapySafeThresholds.pt_knee_ext || 160;

      // Fault 1: Exceeding safe clinical extension boundary
      if (mainAngle > safeLimit + 2) {
        isFault = true;
        faultLimb = 'knees';
        faultMessage = `⚠️ Extension Limit Exceeded (${Math.round(mainAngle)}° > ${safeLimit}°)`;
      }
      // Fault 2: Slumping back in chair to compensate
      else if (torsoLeanAngle > 18) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Slumping Back! Maintain Upright Seated Posture';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      } else if (mainAngle >= safeLimit - 10) {
        guidanceMessage = `Target Extension Met (${Math.round(mainAngle)}°)! Controlled Descent`;
        guidanceType = 'optimal';
      } else if (mainAngle > 115) {
        guidanceMessage = 'Extending Knee: Controlled Tempo';
        guidanceType = 'info';
      } else {
        guidanceMessage = 'Knee Flexed: Begin Smooth Extension';
        guidanceType = 'info';
      }

      if (mainAngle < 105) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 3.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '3.0';
          this.lastRepTimestamp = now;
          this.repCount++;
          const isCompliant = this.currentRepHighestAngle <= safeLimit && !this.currentRepHadFault;
          if (!isCompliant) {
            this.faultCount++;
            this.complianceScore = Math.max(40, this.complianceScore - 15);
            this.audio.playFaultAlert();
          } else {
            this.complianceScore = Math.min(100, this.complianceScore + 5);
            this.audio.playRepSuccess();
          }
          this.recordRep('Knee Ext (PT)', `Peak Ext: ${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, isCompliant);
        }
        this.resetCycle();
      } else if (mainAngle >= safeLimit - 20) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
      }

    // ────────────────────────────────────────────────────────────────
    // 7. THERAPY MODE: ELBOW EXTENSION REHAB (LOCKOUT TARGET)
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'pt_elbow_ext') {
      let shoulderSwingAngle = 0;
      let torsoLeanAngle = 0;
      let flare = 0;

      if (isBoth) {
        const aL = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
        const aR = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
        mainAngle = Math.round((aL + aR) / 2);
        shoulderSwingAngle = Math.max(
          calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]),
          calculateJointAngle(landmarks[24], landmarks[12], landmarks[14])
        );
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );
        const shoulderWidth = Math.hypot(landmarks[11].x - landmarks[12].x, landmarks[11].y - landmarks[12].y) || 0.25;
        flare = Math.max(Math.abs(landmarks[13].x - landmarks[23].x), Math.abs(landmarks[14].x - landmarks[24].x)) / shoulderWidth;
      } else {
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        const elbow = isLeft ? landmarks[13] : landmarks[14];
        const wrist = isLeft ? landmarks[15] : landmarks[16];
        const hip = isLeft ? landmarks[23] : landmarks[24];
        mainAngle = calculateJointAngle(shoulder, elbow, wrist);
        shoulderSwingAngle = calculateJointAngle(hip, shoulder, elbow);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);
        const otherShoulder = isLeft ? landmarks[12] : landmarks[11];
        const shoulderWidth = (shoulder && otherShoulder) ? (Math.hypot(shoulder.x - otherShoulder.x, shoulder.y - otherShoulder.y) || 0.25) : 0.25;
        flare = Math.abs(elbow.x - hip.x) / shoulderWidth;
      }
      const targetExt = this.therapySafeThresholds.pt_elbow_ext || 165;

      // Fault 1: Compensatory shoulder movement (> 15°)
      if (shoulderSwingAngle > 15) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = '⚠️ Shoulder Compensation! Keep Upper Arm Still';
      }
      // Fault 2: Elbow flaring out
      else if (flare > 0.26) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = '⚠️ Elbow Flaring Out! Keep Arm Stationary';
      }
      // Fault 3: Torso lean / body english
      else if (torsoLeanAngle > 14) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Body Sway! Isolate the Elbow Joint';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      } else if (mainAngle >= targetExt - 5) {
        guidanceMessage = `Target Extension Achieved (${Math.round(mainAngle)}°)! Smooth Return`;
        guidanceType = 'optimal';
      } else if (mainAngle > 115) {
        guidanceMessage = 'Extending Arm: Smooth Terminal Arc';
        guidanceType = 'info';
      } else {
        guidanceMessage = 'Elbow Flexed: Begin Gentle Extension';
        guidanceType = 'info';
      }

      if (mainAngle < 95) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 3.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '3.0';
          this.lastRepTimestamp = now;
          this.repCount++;
          const isCompliant = !this.currentRepHadFault && this.currentRepHighestAngle >= (targetExt - 10);
          if (!isCompliant) {
            this.faultCount++;
            this.complianceScore = Math.max(40, this.complianceScore - 12);
            this.audio.playFaultAlert();
          } else {
            this.complianceScore = Math.min(100, this.complianceScore + 5);
            this.audio.playRepSuccess();
          }
          this.recordRep('Elbow Ext (PT)', `Ext: ${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, isCompliant);
        }
        this.resetCycle();
      } else if (mainAngle >= targetExt - 15) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
      }

    // ────────────────────────────────────────────────────────────────
    // 8. THERAPY MODE: ELBOW FLEXION REHAB
    // ────────────────────────────────────────────────────────────────
    } else if (this.currentExercise === 'pt_elbow_flex') {
      let shoulderSwingAngle = 0;
      let torsoLeanAngle = 0;
      let flare = 0;

      if (isBoth) {
        const aL = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
        const aR = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
        mainAngle = Math.round((aL + aR) / 2);
        shoulderSwingAngle = Math.max(
          calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]),
          calculateJointAngle(landmarks[24], landmarks[12], landmarks[14])
        );
        torsoLeanAngle = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );
        const shoulderWidth = Math.hypot(landmarks[11].x - landmarks[12].x, landmarks[11].y - landmarks[12].y) || 0.25;
        flare = Math.max(Math.abs(landmarks[13].x - landmarks[23].x), Math.abs(landmarks[14].x - landmarks[24].x)) / shoulderWidth;
      } else {
        const shoulder = isLeft ? landmarks[11] : landmarks[12];
        const elbow = isLeft ? landmarks[13] : landmarks[14];
        const wrist = isLeft ? landmarks[15] : landmarks[16];
        const hip = isLeft ? landmarks[23] : landmarks[24];
        mainAngle = calculateJointAngle(shoulder, elbow, wrist);
        shoulderSwingAngle = calculateJointAngle(hip, shoulder, elbow);
        torsoLeanAngle = calculateTorsoLean(shoulder, hip);
        const otherShoulder = isLeft ? landmarks[12] : landmarks[11];
        const shoulderWidth = (shoulder && otherShoulder) ? (Math.hypot(shoulder.x - otherShoulder.x, shoulder.y - otherShoulder.y) || 0.25) : 0.25;
        flare = Math.abs(elbow.x - hip.x) / shoulderWidth;
      }
      const targetFlex = this.therapySafeThresholds.pt_elbow_flex || 90;

      // Fault 1: Elbow off ribs / forward drift (> 15° or flare > 0.26)
      if (shoulderSwingAngle > 15 || flare > 0.26) {
        isFault = true;
        faultLimb = 'elbows';
        faultMessage = '⚠️ Form Fault: Elbow Off Ribs! Keep Elbow Pinned to Torso';
      }
      // Fault 2: Torso backwards lean (> 14°)
      else if (torsoLeanAngle > 14) {
        isFault = true;
        faultLimb = 'trunk';
        faultMessage = '⚠️ Torso Leaning Back! Maintain Neutral Spine';
      }

      if (isFault) {
        guidanceType = 'fault';
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      } else if (mainAngle <= targetFlex + 10) {
        guidanceMessage = `Target Flexion Achieved (${Math.round(mainAngle)}°)! Smooth Return`;
        guidanceType = 'optimal';
      } else if (mainAngle < 140) {
        guidanceMessage = 'Flexing Elbow: Smooth Controlled Pacing';
        guidanceType = 'info';
      } else {
        guidanceMessage = 'Relaxed Arm: Begin Controlled Flexion';
        guidanceType = 'info';
      }

      if (mainAngle > 150) {
        if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
          const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 3.0;
          const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '3.0';
          this.lastRepTimestamp = now;
          this.repCount++;
          const isCompliant = !this.currentRepHadFault;
          if (!isCompliant) {
            this.faultCount++;
            this.complianceScore = Math.max(40, this.complianceScore - 12);
            this.audio.playFaultAlert();
          } else {
            this.complianceScore = Math.min(100, this.complianceScore + 5);
            this.audio.playRepSuccess();
          }
          this.recordRep('Elbow Flex (PT)', `Flex: ${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, isCompliant);
        }
        this.resetCycle();
      } else if (mainAngle < targetFlex + 20) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 9. DYNAMIC AI-GENERATED / CUSTOM EXERCISES
    // ────────────────────────────────────────────────────────────────
    const customDef = getExerciseDefinition(this.currentExercise);
    if (customDef) {
      let joint = (customDef.jointLabel || 'KNEE').toUpperCase();
      if (joint.includes('GLENOHUMERAL') || joint.includes('DELTOID') || joint.includes('SHOULDER')) joint = 'SHOULDER';
      else if (joint.includes('BICEP') || joint.includes('TRICEP') || joint.includes('ELBOW')) joint = 'ELBOW';
      else if (joint.includes('HIP') || joint.includes('HAMSTRING') || joint.includes('GLUTE') || joint.includes('PELVIS')) joint = 'HIP';
      else if (joint.includes('KNEE') || joint.includes('QUAD') || joint.includes('CALF') || joint.includes('ANKLE')) joint = 'KNEE';
      const isFlexion = customDef.isFlexion !== false;
      const mp = customDef.motionProfile || {};
      const targetAngle = customDef.defaultTarget || mp.targetAngle || (isFlexion ? 80 : 160);
      const startAngle = mp.startAngle !== undefined ? mp.startAngle : (isFlexion ? 165 : 75);

      if (joint === 'HIP') {
        // Shoulder - Hip - Knee
        if (isBoth) {
          const aL = calculateJointAngle(landmarks[11], landmarks[23], landmarks[25]);
          const aR = calculateJointAngle(landmarks[12], landmarks[24], landmarks[26]);
          mainAngle = Math.round((aL + aR) / 2);
        } else {
          const s = isLeft ? landmarks[11] : landmarks[12];
          const h = isLeft ? landmarks[23] : landmarks[24];
          const k = isLeft ? landmarks[25] : landmarks[26];
          mainAngle = calculateJointAngle(s, h, k);
        }
        const isHorizontalPosture = mp.posture === 'supine' || mp.posture === 'prone' || mp.posture === 'quadruped' || mp.posture === 'side_lying' || mp.posture === 'plank' || (customDef.name && (customDef.name.toLowerCase().includes('bridge') || customDef.name.toLowerCase().includes('thrust') || customDef.name.toLowerCase().includes('crunch') || customDef.name.toLowerCase().includes('tilt')));
        if (!isHorizontalPosture) {
          const torsoLean = Math.max(
            calculateTorsoLean(landmarks[11], landmarks[23]),
            calculateTorsoLean(landmarks[12], landmarks[24])
          );
          const isHinge = (mp.movementType === 'rdl' || mp.movementType === 'deadlift' || mp.movementType === 'good_morning' || mp.movementType === 'row' || (customDef.name && customDef.name.toLowerCase().includes('hinge')));
          const defaultLean = isHinge ? 82 : 45;
          const maxLean = (customDef.faultCriteria && customDef.faultCriteria.torsoLeanThreshold) || defaultLean;
          if (torsoLean > maxLean) {
            isFault = true;
            faultLimb = 'trunk';
            faultMessage = customDef.faultMessage || '⚠️ Torso Rounding / Excessive Spinal Flexion!';
          }
        }
      } else if (joint === 'ELBOW') {
        // Shoulder - Elbow - Wrist
        if (isBoth) {
          const aL = calculateJointAngle(landmarks[11], landmarks[13], landmarks[15]);
          const aR = calculateJointAngle(landmarks[12], landmarks[14], landmarks[16]);
          mainAngle = Math.round((aL + aR) / 2);
        } else {
          const s = isLeft ? landmarks[11] : landmarks[12];
          const e = isLeft ? landmarks[13] : landmarks[14];
          const w = isLeft ? landmarks[15] : landmarks[16];
          mainAngle = calculateJointAngle(s, e, w);
        }
        const isPlankPosture = (mp.posture === 'plank' || (customDef.name || '').toLowerCase().includes('push') || (customDef.id || '').toLowerCase().includes('push') || (customDef.name || '').toLowerCase().includes('plank'));
        
        if (isPlankPosture) {
          // Plank Spine Alignment: Shoulder - Hip - Ankle straight line (160° - 180°)
          const spineL = calculateJointAngle(landmarks[11], landmarks[23], landmarks[27] || landmarks[25]);
          const spineR = calculateJointAngle(landmarks[12], landmarks[24], landmarks[28] || landmarks[26]);
          const spineAngle = Math.round((spineL + spineR) / 2);

          // Sagging hips or excessive pike:
          if (spineAngle < 150) {
            isFault = true;
            faultLimb = 'trunk';
            faultMessage = '⚠️ Sagging Hips / Broken Plank! Squeeze Core & Glutes';
          }
          // Flare check:
          const elbowFlare = Math.abs(landmarks[13].x - landmarks[11].x) + Math.abs(landmarks[14].x - landmarks[12].x);
          if (elbowFlare > 0.32) {
            isFault = true;
            faultLimb = 'elbows';
            faultMessage = '⚠️ Excessive Elbow Flare! Tuck Elbows 45°';
          }
        } else {
          const shoulderWidth = Math.hypot(landmarks[11].x - landmarks[12].x, landmarks[11].y - landmarks[12].y) || 0.25;
          const flare = Math.max(Math.abs(landmarks[13].x - landmarks[23].x), Math.abs(landmarks[14].x - landmarks[24].x)) / shoulderWidth;
          const flareThresh = (customDef.faultCriteria && customDef.faultCriteria.lateralDriftThreshold) || 0.28;
          if (flare > flareThresh) {
            isFault = true;
            faultLimb = 'elbows';
            faultMessage = customDef.faultMessage || '⚠️ Elbow Flare! Keep Forearms Aligned';
          }
          const isHorizontalPosture = mp.posture === 'supine' || mp.posture === 'prone' || mp.posture === 'quadruped' || mp.posture === 'side_lying' || (customDef.name && (customDef.name.toLowerCase().includes('press') || customDef.name.toLowerCase().includes('bench') || customDef.name.toLowerCase().includes('floor')));
          if (!isHorizontalPosture) {
            const torsoLean = Math.max(
              calculateTorsoLean(landmarks[11], landmarks[23]),
              calculateTorsoLean(landmarks[12], landmarks[24])
            );
            const maxLean = (customDef.faultCriteria && customDef.faultCriteria.torsoLeanThreshold) || 20;
            if (torsoLean > maxLean) {
              isFault = true;
              faultLimb = 'trunk';
              faultMessage = customDef.faultMessage || '⚠️ Torso Momentum / Cheating with Spine!';
            }
          }
        }
      } else if (joint === 'SHOULDER') {
        // Hip - Shoulder - Elbow
        if (isBoth) {
          const aL = calculateJointAngle(landmarks[23], landmarks[11], landmarks[13]);
          const aR = calculateJointAngle(landmarks[24], landmarks[12], landmarks[14]);
          mainAngle = Math.round((aL + aR) / 2);
        } else {
          const h = isLeft ? landmarks[23] : landmarks[24];
          const s = isLeft ? landmarks[11] : landmarks[12];
          const e = isLeft ? landmarks[13] : landmarks[14];
          mainAngle = calculateJointAngle(h, s, e);
        }
        const safeLimit = (customDef.faultCriteria && customDef.faultCriteria.safeCeiling) || (customDef.mode === 'pt' ? 105 : 175);
        if (customDef.mode === 'pt' && mainAngle > safeLimit) {
          isFault = true;
          faultLimb = 'shoulders';
          faultMessage = customDef.faultMessage || `⚠️ Above Safe Limit (${safeLimit}°)! Avoid Impingement`;
        }
        const torsoLean = Math.max(
          calculateTorsoLean(landmarks[11], landmarks[23]),
          calculateTorsoLean(landmarks[12], landmarks[24])
        );
        const maxLean = (customDef.faultCriteria && customDef.faultCriteria.torsoLeanThreshold) || 16;
        if (torsoLean > maxLean) {
          isFault = true;
          faultLimb = 'trunk';
          faultMessage = customDef.faultMessage || '⚠️ Torso Sway / Compensation!';
        }
      } else {
        // KNEE: Hip - Knee - Ankle
        if (isBoth) {
          const aL = calculateJointAngle(landmarks[23], landmarks[25], landmarks[27]);
          const aR = calculateJointAngle(landmarks[24], landmarks[26], landmarks[28]);
          mainAngle = Math.round((aL + aR) / 2);
        } else {
          const h = isLeft ? landmarks[23] : landmarks[24];
          const k = isLeft ? landmarks[25] : landmarks[26];
          const a = isLeft ? landmarks[27] : landmarks[28];
          mainAngle = calculateJointAngle(h, k, a);
        }
        const isHorizontalPosture = mp.posture === 'supine' || mp.posture === 'prone' || mp.posture === 'quadruped' || mp.posture === 'side_lying' || mp.posture === 'seated' || (customDef.name && (customDef.name.toLowerCase().includes('pump') || customDef.name.toLowerCase().includes('clamshell') || customDef.name.toLowerCase().includes('tke')));
        if (!isHorizontalPosture) {
          const torsoLean = Math.max(
            calculateTorsoLean(landmarks[11], landmarks[23]),
            calculateTorsoLean(landmarks[12], landmarks[24])
          );
          const maxLean = (customDef.faultCriteria && customDef.faultCriteria.torsoLeanThreshold) || 35;
          if (torsoLean > maxLean) {
            isFault = true;
            faultLimb = 'trunk';
            faultMessage = customDef.faultMessage || '⚠️ Excessive Forward Torso Collapse!';
          }
        }
        if (mainAngle < 145) {
          const valgusL = landmarks[25] && landmarks[27] && (landmarks[25].x - landmarks[27].x > 0.038);
          const valgusR = landmarks[26] && landmarks[28] && (landmarks[28].x - landmarks[26].x > 0.038);
          if (valgusL || valgusR) {
            isFault = true;
            faultLimb = 'knees';
            faultMessage = customDef.faultMessage || '⚠️ Knee Valgus! Push Knees Out';
          }
        }
      }

      if (isSimulatedOptimal) {
        isFault = false;
        faultMessage = '';
        faultLimb = null;
        this.currentRepHadFault = false;
        this._consecutiveFaultFrames = 0;
      }

      if (isFault) {
        guidanceType = 'fault';
        guidanceMessage = faultMessage;
        this.currentRepHadFault = true;
        if (this._canFireFaultAudio()) this.audio.playFaultAlert();
      } else if (isFlexion ? (mainAngle <= targetAngle + 10) : (mainAngle >= targetAngle - 10)) {
        if (this.exerciseState !== 'inflection') {
          this.exerciseState = 'inflection';
          this.inflectionEnteredAt = now;
        }
        guidanceMessage = this._getSpecificMovementCue(customDef, mainAngle, targetAngle, isFlexion, 'inflection');
        guidanceType = 'optimal';
      } else if (isFlexion ? (mainAngle < startAngle - 15) : (mainAngle > startAngle + 15)) {
        if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        guidanceMessage = this._getSpecificMovementCue(customDef, mainAngle, targetAngle, isFlexion, 'entering');
        guidanceType = 'info';
      } else {
        guidanceMessage = this._getSpecificMovementCue(customDef, mainAngle, targetAngle, isFlexion, 'setup');
        guidanceType = 'info';
      }

      // Repetition counting state machine
      if (isFlexion) {
        const returnAngle = Math.max(140, startAngle - 15);
        const inflectionAngle = targetAngle + 12;

        if (mainAngle >= returnAngle) {
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 2.5;
            const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '2.5';
            this.lastRepTimestamp = now;
            this.repCount++;
            const isCompliant = isSimulatedOptimal || (!this.currentRepHadFault && (this.currentRepLowestAngle <= targetAngle + 10));
            if (!isCompliant) {
              this.faultCount++;
              this.complianceScore = Math.max(30, this.complianceScore - 12);
              this.audio.playFaultAlert();
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep(customDef.name, `${Math.round(this.currentRepLowestAngle)}°`, `${repDuration}s`, isCompliant);
          }
          this.resetCycle();
        } else if (mainAngle <= inflectionAngle) {
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          this.currentRepLowestAngle = Math.min(this.currentRepLowestAngle, mainAngle);
        } else if (mainAngle < returnAngle - 15) {
          if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        }
      } else {
        const returnAngle = Math.min(startAngle + 16, targetAngle - 15);
        const inflectionAngle = targetAngle - 10;

        if (mainAngle <= returnAngle) {
          if (this.exerciseState === 'inflection' && this._inflectionHeldLongEnough()) {
            const rawDur = this.lastRepTimestamp ? (now - this.lastRepTimestamp) / 1000 : 2.5;
            const repDuration = (rawDur > 0 && !isNaN(rawDur)) ? rawDur.toFixed(1) : '2.5';
            this.lastRepTimestamp = now;
            this.repCount++;
            const isCompliant = isSimulatedOptimal || (!this.currentRepHadFault && (this.currentRepHighestAngle >= targetAngle - 10));
            if (!isCompliant) {
              this.faultCount++;
              this.complianceScore = Math.max(30, this.complianceScore - 12);
              this.audio.playFaultAlert();
            } else {
              this.complianceScore = Math.min(100, this.complianceScore + 5);
              this.audio.playRepSuccess();
            }
            this.recordRep(customDef.name, `${Math.round(this.currentRepHighestAngle)}°`, `${repDuration}s`, isCompliant);
          }
          this.resetCycle();
        } else if (mainAngle >= inflectionAngle) {
          if (this.exerciseState !== 'inflection') {
            this.exerciseState = 'inflection';
            this.inflectionEnteredAt = now;
          }
          this.currentRepHighestAngle = Math.max(this.currentRepHighestAngle, mainAngle);
        } else if (mainAngle > returnAngle + 15) {
          if (this.exerciseState === 'idle') this.exerciseState = 'entering';
        }
      }
    }

    this.currentAngle = Math.round(mainAngle * 10) / 10;

    // Peak ROM metric display: flexion moves focus on lowest angle, extension/raise focus on highest angle
    const isFlexionExercise = (customDef && customDef.isCustom)
      ? (customDef.isFlexion !== false)
      : (this.currentExercise === 'gym_curl' || this.currentExercise === 'gym_squat' || this.currentExercise === 'pt_elbow_flex' || this.currentExercise === 'squat' || this.currentExercise === 'curl');
    
    if (isFlexionExercise) {
      if (mainAngle < this.peakFlexRom && mainAngle > 5) {
        this.peakFlexRom = Math.round(mainAngle);
      }
      this.peakRom = this.peakFlexRom === 999 ? 0 : this.peakFlexRom;
    } else {
      this.peakRom = Math.max(this.peakRom, Math.round(mainAngle));
    }

    // Fault debounce: require 2 consecutive frames
    if (isSimulatedOptimal) {
      isFault = false;
      faultLimb = null;
      faultMessage = '';
      this.currentRepHadFault = false;
      this._consecutiveFaultFrames = 0;
      this.faultCount = 0;
      this.complianceScore = 100;
    } else if (isFault) {
      this._consecutiveFaultFrames++;
    } else {
      this._consecutiveFaultFrames = 0;
    }
    const debouncedFault = isSimulatedOptimal ? false : (this._consecutiveFaultFrames >= this._FAULT_FRAME_THRESHOLD);

    return {
      angle: this.currentAngle,
      peakRom: this.peakRom,
      isFault: debouncedFault,
      faultLimb: debouncedFault ? faultLimb : null,
      guidanceText: debouncedFault ? (faultMessage || guidanceMessage) : (guidanceMessage || faultMessage || (customDef ? this._getSpecificMovementCue(customDef, mainAngle, 90, true, 'entering') : 'Ready')),
      guidanceType: debouncedFault ? 'fault' : guidanceType,
      repCount: this.repCount,
      faultCount: this.faultCount,
      complianceScore: this.complianceScore,
      newRecord: this.latestRecord
    };
  }

  recordRep(exercise, peakRom, duration, isCompliant) {
    const rawDur = parseFloat(duration);
    const validDur = (!isNaN(rawDur) && rawDur > 0) ? `${rawDur.toFixed(1)}s` : '2.0s';
    const record = {
      id: this.repCount,
      time: new Date().toLocaleTimeString(),
      exercise,
      peakRom,
      duration: validDur,
      status: isCompliant ? 'PASS' : 'FAULT'
    };
    this.repHistory.unshift(record);
    this.latestRecord = record;
  }

  /**
   * Generates specific biomechanical movement cues and form changes based on active exercise and motion phase
   */
  _getSpecificMovementCue(def, mainAngle, targetAngle, isFlexion, phase) {
    const name = (def && def.name) || '';
    const id = (def && def.id) || '';
    const mType = (def && def.motionProfile && def.motionProfile.movementType) || '';
    const lower = (name + ' ' + id + ' ' + mType).toLowerCase();

    // 1. Goblet Squat
    if (lower.includes('goblet')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ Parallel Crease Achieved! Drive up through midfoot';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Descent: Keep load glued to sternum, track elbows inside knees';
      } else {
        return '⚡ Goblet Setup: Rack weight tight to sternum, elbows tucked';
      }
    }
    // 2. Sumo Squat
    if (lower.includes('sumo')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ Deep Sumo Crease! Squeeze glutes and adductors to rise';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Wide Stance: Drive knees wide over 45° toes, keep pelvis under ribs';
      } else {
        return '⚡ Sumo Stance: Feet 1.5x shoulders, toes flared 45° outward';
      }
    }
    // 3. Romanian Deadlift (RDL)
    if (lower.includes('rdl') || lower.includes('romanian')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 10 : mainAngle >= targetAngle - 10)) {
        return '✨ Hamstrings Loaded! Squeeze glutes and drive hips forward';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 155 : mainAngle > 100)) {
        return '💡 Hip Hinge: Push hips back like closing a door — soft knees, bar skims thighs';
      } else {
        return '⚡ RDL Setup: Soft knee unlock, lats packed, neutral spine';
      }
    }
    // 4. Conventional Deadlift
    if (lower.includes('deadlift')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 10 : mainAngle >= targetAngle - 10)) {
        return '✨ Powerful Floor Setup! Leg drive through midfoot';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Pull Phase: Push floor away, chest and hips rise at same rate';
      } else {
        return '⚡ Deadlift Lockout: Squeeze glutes tall without hyperextending back';
      }
    }
    // 5. Bulgarian Split Squat
    if (lower.includes('split squat')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ Single-Leg Depth! Drive 80% through front heel';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Elevator Drop: Sink rear knee straight down, front shin vertical';
      } else {
        return '⚡ Split Squat: Square hips, rear foot elevated, chest tall';
      }
    }
    // 6. Walking / Forward Lunge
    if (lower.includes('walking lunge') || (lower.includes('lunge') && !lower.includes('reverse'))) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ 90° Lunge Depth! Drive off lead foot to stand';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Forward Step: Decelerate through front heel, keep front knee centered';
      } else {
        return '⚡ Lunge Setup: Stand tall, prepare for controlled forward stride';
      }
    }
    // 7. Reverse Lunge
    if (lower.includes('reverse lunge')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ Reverse Depth! Drive through front heel to return';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Step Back: Soft ball-of-foot contact, front shin stays vertical';
      } else {
        return '⚡ Reverse Lunge: Feet hip-width, prepare to step backward';
      }
    }
    // 8. Arnold Press
    if (lower.includes('arnold')) {
      if (phase === 'inflection' || (!isFlexion ? mainAngle >= targetAngle - 10 : mainAngle <= targetAngle + 10)) {
        return '✨ Overhead Lockout! Palms facing forward, biceps by ears';
      } else if (phase === 'entering' || (!isFlexion ? mainAngle > 100 : mainAngle < 145)) {
        return '💡 Arnold Rotation: Rotate wrists 180° outward as elbows flare into press';
      } else {
        return '⚡ Arnold Setup: Dumbbells at chin, palms facing face';
      }
    }
    // 9. Hammer Curl
    if (lower.includes('hammer')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 10 : mainAngle >= targetAngle - 10)) {
        return '✨ Peak Contraction! Thumbs pointed straight up';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 90)) {
        return '💡 Neutral Tracking: Keep elbows pinned to ribcage, 2-sec eccentric';
      } else {
        return '⚡ Hammer Setup: Palms facing each other in handshake grip';
      }
    }
    // 10. Diamond Push-Up
    if (lower.includes('diamond')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ Chest to Diamond! Drive through palms for tricep lockout';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 140 : mainAngle > 100)) {
        return '💡 Diamond Descent: Thumbs & index touching, elbows skim ribs';
      } else {
        return '⚡ Diamond Plank: Rigid plank line, hands centered under sternum';
      }
    }
    // 11. Floor Press
    if (lower.includes('floor press')) {
      if (phase === 'inflection' || (isFlexion ? mainAngle <= targetAngle + 8 : mainAngle >= targetAngle - 8)) {
        return '✨ Triceps Paused on Floor! Explode upward to lockout';
      } else if (phase === 'entering' || (isFlexion ? mainAngle < 145 : mainAngle > 100)) {
        return '💡 Floor Lowering: Rest upper arms lightly at 90°, avoid bounce';
      } else {
        return '⚡ Floor Setup: Knees bent, feet planted, arms extended';
      }
    }
    // 12. Scaption / Full Can
    if (lower.includes('scaption') || lower.includes('full can')) {
      if (phase === 'inflection' || (!isFlexion ? mainAngle >= targetAngle - 8 : mainAngle <= targetAngle + 8)) {
        return '✨ 90° Scapular Height! Hold peak contraction, neck relaxed';
      } else if (phase === 'entering' || (!isFlexion ? mainAngle > 40 : mainAngle < 80)) {
        return '💡 Scaption Plane: Thumbs up, elevate 30° anterior to body — avoid shrugging';
      } else {
        return '⚡ Scaption Setup: Arms at sides, thumbs pointing upward';
      }
    }
    // 13. Wall Angels
    if (lower.includes('wall angel')) {
      if (phase === 'inflection' || (!isFlexion ? mainAngle >= targetAngle - 10 : mainAngle <= targetAngle + 10)) {
        return '✨ Overhead Y Position! Keep wrists glued to wall';
      } else if (phase === 'entering' || (!isFlexion ? mainAngle > 95 : mainAngle < 140)) {
        return '💡 Wall Slide: Slide elbows from W to Y without arching lower back';
      } else {
        return '⚡ Wall Setup: Back flat to wall, elbows and wrists in contact';
      }
    }
    // 14. Clamshell
    if (lower.includes('clamshell')) {
      if (phase === 'inflection' || (mainAngle >= targetAngle - 5)) {
        return '✨ Peak Hip Abduction! Squeeze outer glute, keep pelvis stacked';
      } else {
        return '💡 Clamshell: Rotate top knee upward without rocking pelvis backward';
      }
    }
    // 15. Pelvic Tilt
    if (lower.includes('pelvic tilt')) {
      return '💡 Pelvic Tilt: Contract lower abdominals to press lumbar spine flat into mat';
    }
    // 16. Straight Leg Raise (SLR)
    if (lower.includes('slr') || lower.includes('straight leg')) {
      if (phase === 'inflection') {
        return '✨ 45° Elevation! Knee locked straight, quad contracted';
      } else {
        return '💡 Straight Leg Raise: Lock working knee firmly, raise heel to opposite knee';
      }
    }
    // 17. Codman's Pendulum
    if (lower.includes('pendulum')) {
      return '💡 Pendulum: Let arm dangle passively, initiate gentle circles from hips & torso';
    }
    // 18. Terminal Knee Extension (TKE)
    if (lower.includes('tke') || lower.includes('terminal knee')) {
      if (phase === 'inflection') {
        return '✨ Terminal Lockout! Hold quad contraction 2 seconds against band';
      } else {
        return '💡 TKE: Drive working knee backward against band resistance to full lockout';
      }
    }
    // 19. Mini Squat
    if (lower.includes('mini squat')) {
      if (phase === 'inflection') {
        return '✨ Functional 35° Depth! Press evenly through both feet';
      } else {
        return '💡 Mini Squat: Shallow controlled dip, keep knees aligned over toes';
      }
    }
    // 20. Barbell Good Morning
    if (lower.includes('good morning')) {
      if (phase === 'inflection') {
        return '✨ Horizontal Torso Hinge! Drive hips forward to stand';
      } else {
        return '💡 Good Morning: Hinge hips back with neutral spine, keep lats packed';
      }
    }
    // Default fallback
    if (phase === 'inflection') {
      return `✨ Target Depth Achieved (${Math.round(mainAngle)}°)! Smooth Return`;
    } else if (phase === 'entering') {
      return `💡 In Motion: Control cadence toward ${targetAngle}°`;
    } else {
      return `⚡ ${name}: Setup & Prepare for Movement`;
    }
  }
}
