/**
 * FlexAlign AI - AI Exercise Generator Lab Modal Component
 * Manages prompt-based exercise creation, preset variations, Gemini LLM biomechanical synthesis,
 * real-time parameter tweaking, and instant 3D simulation launch.
 */

import {
  GYM_EXERCISES,
  PT_EXERCISES,
  CUSTOM_EXERCISES,
  registerExercise,
  getExerciseDefinition,
  getAllExercisesForMode,
  synthesizeExerciseFromQuery
} from '../exercises.js';

export class AiLabModal {
  constructor(options = {}) {
    this.app = options.app;
    this.aiLabTab = 'add';
    this.exerciseToModify = null;
    this.currentGeneratedExercise = null;
  }

  openAiExerciseModal() {
    const modal = document.getElementById('aiExerciseModal');
    const labBtn = document.getElementById('btnOpenAiLab');
    if (!modal) return;

    modal.classList.remove('closing');
    modal.style.display = 'flex';
    if (labBtn) labBtn.classList.add('active');

    this.setAiLabTab(this.aiLabTab || 'add');

    const promptInput = document.getElementById('aiExercisePrompt');
    if (promptInput) {
      setTimeout(() => promptInput.focus(), 150);
    }
  }

  closeAiExerciseModal() {
    const modal = document.getElementById('aiExerciseModal');
    const labBtn = document.getElementById('btnOpenAiLab');
    if (!modal) return;

    modal.classList.add('closing');
    if (labBtn) labBtn.classList.remove('active');

    setTimeout(() => {
      if (modal.classList.contains('closing')) {
        modal.style.display = 'none';
        modal.classList.remove('closing');
      }
    }, 250);
  }

  setAiLabTab(tab) {
    this.aiLabTab = tab;
    const tabAdd = document.getElementById('tabAddExercise');
    const tabModify = document.getElementById('tabModifyExercise');
    const promptLabel = document.getElementById('aiPromptLabel');
    const promptInput = document.getElementById('aiExercisePrompt');
    const submitBtnText = document.getElementById('btnAiGenerateText');
    const modifyRow = document.getElementById('aiModifyExerciseSelectRow');
    const modifySelect = document.getElementById('aiModifyExerciseSelect');

    if (tabAdd) tabAdd.classList.toggle('active', tab === 'add');
    if (tabModify) tabModify.classList.toggle('active', tab === 'modify');

    if (tab === 'modify') {
      if (modifyRow) modifyRow.style.display = 'block';

      if (modifySelect) {
        modifySelect.innerHTML = '';

        const gymGroup = document.createElement('optgroup');
        gymGroup.label = '🏋️ Fitness / Strength Exercises';
        Object.keys(GYM_EXERCISES).forEach(id => {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = GYM_EXERCISES[id].name;
          gymGroup.appendChild(opt);
        });
        modifySelect.appendChild(gymGroup);

        const ptGroup = document.createElement('optgroup');
        ptGroup.label = '🩺 Physical Therapy Exercises';
        Object.keys(PT_EXERCISES).forEach(id => {
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = PT_EXERCISES[id].name;
          ptGroup.appendChild(opt);
        });
        modifySelect.appendChild(ptGroup);

        const customKeys = Object.keys(CUSTOM_EXERCISES).filter(id => !GYM_EXERCISES[id] && !PT_EXERCISES[id]);
        if (customKeys.length > 0) {
          const customGroup = document.createElement('optgroup');
          customGroup.label = '✨ Custom Exercises';
          customKeys.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `✨ ${CUSTOM_EXERCISES[id].name}`;
            customGroup.appendChild(opt);
          });
          modifySelect.appendChild(customGroup);
        }

        const currentEx = (this.app && this.app.evaluator) ? this.app.evaluator.currentExercise : 'gym_squat';
        const targetId = this.exerciseToModify || currentEx;
        if (targetId && modifySelect.querySelector(`option[value="${targetId}"]`)) {
          modifySelect.value = targetId;
        }

        if (!modifySelect._hasChangeListener) {
          modifySelect._hasChangeListener = true;
          modifySelect.addEventListener('change', () => {
            this.exerciseToModify = modifySelect.value;
            this.syncModifyExerciseSelection();
          });
        }
      }

      const currentEx = (this.app && this.app.evaluator) ? this.app.evaluator.currentExercise : 'gym_squat';
      this.exerciseToModify = (modifySelect && modifySelect.value) ? modifySelect.value : (this.exerciseToModify || currentEx);
      this.syncModifyExerciseSelection();

      if (submitBtnText) submitBtnText.textContent = 'Modify with Gemini';
    } else {
      if (modifyRow) modifyRow.style.display = 'none';
      if (promptLabel) promptLabel.textContent = 'Describe Exercise or Biomechanical Adjustment:';
      if (promptInput && promptInput.value.includes('Adjust target angle to 80°')) {
        promptInput.value = '';
      }
      if (promptInput) promptInput.placeholder = 'e.g., Create a Romanian Deadlift focusing on hip hinge and hamstring depth, or Bulgarian Split Squats with vertical shin...';
      if (submitBtnText) submitBtnText.textContent = 'Generate with Gemini';
    }
  }

  syncModifyExerciseSelection() {
    const modifySelect = document.getElementById('aiModifyExerciseSelect');
    const currentEx = (this.app && this.app.evaluator) ? this.app.evaluator.currentExercise : 'gym_squat';
    const selectedId = modifySelect ? modifySelect.value : (this.exerciseToModify || currentEx);
    const ex = getExerciseDefinition(selectedId) || GYM_EXERCISES[selectedId] || PT_EXERCISES[selectedId] || CUSTOM_EXERCISES[selectedId];
    if (!ex) return;

    const promptLabel = document.getElementById('aiPromptLabel');
    const promptInput = document.getElementById('aiExercisePrompt');
    const jointSelect = document.getElementById('aiTargetJoint');
    const modeSelect = document.getElementById('aiTargetMode');

    if (promptLabel) promptLabel.textContent = `Modify Biomechanics for "${ex.name}":`;
    if (promptInput) {
      promptInput.placeholder = `e.g. Set target depth to 80 degrees, make fault sensitivity stricter, or change focus to rehab...`;
      promptInput.value = `Adjust target angle to 80° with stricter lockout form for ${ex.name}`;
    }

    if (jointSelect && ex.jointLabel) jointSelect.value = ex.jointLabel;
    if (modeSelect && ex.mode) modeSelect.value = ex.mode;
  }

  applyAiPreset(presetKey) {
    const promptInput = document.getElementById('aiExercisePrompt');
    const jointSelect = document.getElementById('aiTargetJoint');
    const modeSelect = document.getElementById('aiTargetMode');

    this.setAiLabTab('add');

    const presets = {
      goblet_squat: {
        prompt: 'Goblet Squat: Anterior anterior load variation with dumbbell or kettlebell cupped at sternum, elbows tracking inside knees at 85° depth, vertical spine.',
        joint: 'KNEE',
        mode: 'gym'
      },
      sumo_squat: {
        prompt: 'Sumo Squat: Extra-wide stance (1.5x shoulders) with toes flared 45°, deep hip crease to 90°, knees tracking over toes.',
        joint: 'KNEE',
        mode: 'gym'
      },
      arnold_press: {
        prompt: 'Arnold Press: Deltoid complex variation starting with palms facing chest, rotating 180° outward during ascent into full overhead lockout.',
        joint: 'ELBOW',
        mode: 'gym'
      },
      scaption: {
        prompt: 'Scaption Full-Can: Elevation in 30° scapular plane with thumbs pointed up, safe subacromial space clearance up to 90° ROM.',
        joint: 'SHOULDER',
        mode: 'pt'
      },
      rdl: {
        prompt: 'Romanian Deadlift (RDL): Biomechanical hip hinge targeting hamstrings & glutes. Deep hinge to 75° with soft knees and flat spine.',
        joint: 'HIP',
        mode: 'gym'
      },
      split_squat: {
        prompt: 'Bulgarian Split Squat: Unilateral quad & glute hypertrophy. Lead knee descends to 85° depth while keeping shin vertical.',
        joint: 'KNEE',
        mode: 'gym'
      },
      pushup: {
        prompt: 'Standard Push-Up: Chest to floor press with 85° elbow depth, tight 45° elbow tuck, and anti-extension plank core.',
        joint: 'ELBOW',
        mode: 'gym'
      },
      wall_angels: {
        prompt: 'Wall Angels: Scapular retraction and thoracic mobility rehab with safe abduction reach arc up to 150° without lumbar arching.',
        joint: 'SHOULDER',
        mode: 'pt'
      },
      lunges: {
        prompt: 'Walking Lunges: Dynamic unilateral knee flexion to 90° with upright posture and controlled deceleration.',
        joint: 'KNEE',
        mode: 'gym'
      },
      bird_dog: {
        prompt: 'Bird Dog Quadruped Reach: Lumbar core stabilization (McGill Big 3). Reach opposite arm and leg parallel to floor without pelvic twist.',
        joint: 'HIP',
        mode: 'pt'
      },
      cat_cow: {
        prompt: 'Cat-Cow Spinal Segmentation: Cervical, thoracic, and lumbar segmentation arc from all-fours.',
        joint: 'HIP',
        mode: 'pt'
      },
      glute_bridge: {
        prompt: 'Glute Bridge: Supine hip extension driving through heels to 175° lockout with glute contraction.',
        joint: 'HIP',
        mode: 'pt'
      },
      mckenzie: {
        prompt: 'McKenzie Extension Press-Up: Prone lumbar spine decompression press-up while keeping pelvis pinned to floor.',
        joint: 'ELBOW',
        mode: 'pt'
      },
      row: {
        prompt: 'Bent-Over Barbell Row: 45° hinged torso pulling elbows past ribcage with scapular retraction.',
        joint: 'ELBOW',
        mode: 'gym'
      }
    };

    const preset = presets[presetKey];
    if (preset) {
      if (promptInput) promptInput.value = preset.prompt;
      if (jointSelect) jointSelect.value = preset.joint;
      if (modeSelect) modeSelect.value = preset.mode;
      this.generateOrModifyAiExercise();
    }
  }

  applyAiSuggestion(promptText) {
    const promptInput = document.getElementById('aiExercisePrompt');
    if (promptInput) {
      promptInput.value = promptText;
    }
    const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
    if (suggestionsCard) suggestionsCard.style.display = 'none';

    this.setAiLabTab('add');
    this.generateOrModifyAiExercise();
  }

  async generateOrModifyAiExercise() {
    const promptInput = document.getElementById('aiExercisePrompt');
    const jointSelect = document.getElementById('aiTargetJoint');
    const modeSelect = document.getElementById('aiTargetMode');
    const submitBtn = document.getElementById('btnAiGenerate');
    const submitIcon = document.getElementById('btnAiGenerateIcon');
    const submitText = document.getElementById('btnAiGenerateText');

    const userPrompt = promptInput ? promptInput.value.trim() : '';
    if (!userPrompt) {
      if (this.app && this.app.showToast) {
        this.app.showToast('Please type an exercise description or select a preset chip', '⚠️');
      }
      if (promptInput) promptInput.focus();
      return;
    }

    const selectedMode = modeSelect ? modeSelect.value : 'gym';
    const selectedJoint = jointSelect ? jointSelect.value : 'AUTO';

    // FAST PATH: Instant 0ms Synthesis for "Add" tab
    if (this.aiLabTab === 'add') {
      const instantEx = synthesizeExerciseFromQuery(userPrompt, selectedMode);
      if (instantEx) {
        if (selectedJoint !== 'AUTO') {
          instantEx.jointLabel = selectedJoint;
        }
        instantEx.mode = selectedMode;
        this.currentGeneratedExercise = instantEx;
        registerExercise(instantEx);
        this.renderAiExercisePreview(instantEx);

        const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
        if (suggestionsCard) suggestionsCard.style.display = 'none';

        if (this.app && this.app.audio) this.app.audio.playRepSuccess();
        if (this.app && this.app.showToast) {
          this.app.showToast(`AI Lab: "${instantEx.name}" ready instantly! ⚡`, '🚀');
        }

        if (submitBtn) submitBtn.classList.remove('loading');
        if (submitIcon) submitIcon.textContent = '⚡';
        if (submitText) submitText.textContent = 'Generate with Gemini';
        return;
      }
    }

    // Network Path with Gemini
    if (submitBtn) submitBtn.classList.add('loading');
    if (submitIcon) submitIcon.textContent = '⏳';
    if (submitText) submitText.textContent = this.aiLabTab === 'modify' ? 'Gemini Modifying...' : 'Gemini Generating...';

    try {
      let result;
      if (this.aiLabTab === 'modify') {
        const modifySelect = document.getElementById('aiModifyExerciseSelect');
        const currentExId = (modifySelect && modifySelect.value) ? modifySelect.value : (this.exerciseToModify || (this.app && this.app.evaluator && this.app.evaluator.currentExercise));
        const currentEx = getExerciseDefinition(currentExId) || GYM_EXERCISES[currentExId] || PT_EXERCISES[currentExId] || CUSTOM_EXERCISES[currentExId];
        result = await this.app.gemini.modifyExercise(currentEx, userPrompt);
      } else {
        result = await this.app.gemini.generateExercise(userPrompt, selectedMode);
      }

      if (result && result.isUnrecognized) {
        const previewCard = document.getElementById('aiExercisePreviewCard');
        if (previewCard) previewCard.style.display = 'none';

        const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
        const suggestionMsg = document.getElementById('aiSuggestionMsg');
        const pillsContainer = document.getElementById('aiSuggestionPills');

        if (suggestionsCard && pillsContainer) {
          if (suggestionMsg) {
            suggestionMsg.textContent = result.message || `We couldn't recognize "${userPrompt}". Did you mean one of these exercises?`;
          }
          pillsContainer.innerHTML = '';
          const suggestions = (result.suggestions && result.suggestions.length > 0)
            ? result.suggestions
            : [
                { name: 'Romanian Deadlift (RDL)', prompt: 'Romanian Deadlift hip hinge with dumbbell or barbell' },
                { name: 'Bulgarian Split Squat', prompt: 'Bulgarian Split Squat knee flexion and glute drive' },
                { name: 'Standard Push-Up', prompt: 'Standard Push-Up chest to floor with 45-degree elbow tuck' },
                { name: 'Bird Dog Reach', prompt: 'Bird Dog quadruped reach for lumbar spine stabilization' }
              ];

          suggestions.forEach(s => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'ai-suggestion-pill';
            pill.innerHTML = `<span>✨</span> <strong>${s.name}</strong>`;
            pill.title = s.prompt || s.name;
            pill.addEventListener('click', () => {
              this.applyAiSuggestion(s.prompt || s.name);
            });
            pillsContainer.appendChild(pill);
          });

          suggestionsCard.style.display = 'block';
          suggestionsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (this.app && this.app.showToast) {
          this.app.showToast('Unrecognized exercise: select a suggestion chip', '💡');
        }
        return;
      }

      if (result && result.exercise) {
        const suggestionsCard = document.getElementById('aiExerciseSuggestionsCard');
        if (suggestionsCard) suggestionsCard.style.display = 'none';

        const ex = result.exercise;
        if (selectedJoint !== 'AUTO') {
          ex.jointLabel = selectedJoint;
        }
        ex.mode = selectedMode;

        this.currentGeneratedExercise = ex;
        registerExercise(ex);
        this.renderAiExercisePreview(ex);
        if (this.app && this.app.showToast) {
          this.app.showToast(`AI Lab: "${ex.name}" updated successfully! ✨`, '🚀');
        }

        if (this.app && this.app.audio) this.app.audio.playRepSuccess();
      } else {
        if (this.app && this.app.showToast) {
          this.app.showToast('Could not generate exercise. Please try again.', '⚠️');
        }
      }
    } catch (err) {
      console.error('Error generating AI exercise:', err);
      if (this.app && this.app.showToast) {
        this.app.showToast('AI Lab error. Using biomechanical engine.', '⚠️');
      }
    } finally {
      if (submitBtn) submitBtn.classList.remove('loading');
      if (submitIcon) submitIcon.textContent = '⚡';
      if (submitText) submitText.textContent = this.aiLabTab === 'modify' ? 'Modify with Gemini' : 'Generate with Gemini';
    }
  }

  renderAiExercisePreview(ex) {
    const previewCard = document.getElementById('aiExercisePreviewCard');
    if (!previewCard) return;

    const nameEl = document.getElementById('aiPreviewName');
    if (nameEl) nameEl.textContent = ex.name;

    const catEl = document.getElementById('aiPreviewCategory');
    if (catEl) catEl.textContent = ex.category || (ex.mode === 'pt' ? 'Physical Therapy' : 'Athletic Kinematics');

    const modeTag = document.getElementById('aiPreviewModeTag');
    if (modeTag) {
      modeTag.textContent = ex.mode === 'pt' ? 'THERAPY MODE' : 'GYM MODE';
      modeTag.className = `preview-mode-tag ${ex.mode === 'pt' ? 'pt' : 'gym'}`;
    }

    const jointEl = document.getElementById('aiPreviewJoint');
    if (jointEl) jointEl.textContent = `${ex.jointLabel || 'KNEE'} (${ex.jointTitle || 'Kinematics'})`;

    const targetEl = document.getElementById('aiPreviewTarget');
    if (targetEl) targetEl.textContent = ex.targetCriterion || `≤ ${ex.defaultTarget || 90}°`;

    const lockoutEl = document.getElementById('aiPreviewLockout');
    if (lockoutEl) lockoutEl.textContent = ex.lockoutCriterion || '> 160°';

    const faultEl = document.getElementById('aiPreviewFault');
    if (faultEl) faultEl.textContent = ex.faultMessage || '⚠️ Biomechanical Misalignment';

    const motionEl = document.getElementById('aiPreviewMotion');
    if (motionEl && ex.motionProfile) {
      const mp = ex.motionProfile;
      const typeLabel = (mp.movementType || 'Dynamic').replace(/_/g, ' ');
      motionEl.textContent = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} (${mp.startAngle !== undefined ? mp.startAngle : 165}° ➔ ${mp.targetAngle !== undefined ? mp.targetAngle : (ex.defaultTarget || 80)}°)`;
    }

    const tipBox = document.getElementById('aiPreviewTip');
    if (tipBox) {
      tipBox.innerHTML = ex.tip || `⚡ <strong>Biomechanical Standard:</strong> Smooth cadence and full active excursion.`;
    }

    previewCard.style.display = 'flex';
    previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  launchGeneratedExercise() {
    if (!this.currentGeneratedExercise) {
      if (this.app && this.app.showToast) {
        this.app.showToast('No exercise generated to launch', '⚠️');
      }
      return;
    }

    const ex = this.currentGeneratedExercise;
    this.exerciseToModify = ex.id;
    registerExercise(ex);

    if (this.app && ex.mode !== this.app.evaluator.mode) {
      this.app.setMode(ex.mode);
    } else {
      const selectEl = document.getElementById('exerciseSelect');
      const allEx = getAllExercisesForMode(ex.mode);
      if (selectEl) {
        selectEl.innerHTML = '';
        Object.keys(allEx).forEach(key => {
          const opt = document.createElement('option');
          opt.value = key;
          const prefix = allEx[key].isCustom ? '✨ ' : '';
          opt.textContent = `${prefix}${ex.mode === 'gym' ? '🏋️' : '🩺'} ${allEx[key].name}`;
          selectEl.appendChild(opt);
        });
      }
    }

    if (this.app) {
      this.app.setExercise(ex.id);
      this.closeAiExerciseModal();
      if (!this.app.isSimulationRunning) {
        this.app.startSimulation();
      }
      this.app.showToast(`🚀 Now running "${ex.name}" in 3D Simulation!`, '✨');
    }
  }
}
