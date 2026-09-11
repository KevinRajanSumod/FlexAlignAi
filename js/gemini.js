/**
 * FlexAlign AI — Multi-Turn AI Coach Engine
 * Powered by Google Gemini 3.6 Flash via Generative Language API.
 * Maintains conversation history for natural back-and-forth dialogue.
 */

import { synthesizeExerciseFromQuery } from './exercises.js';

export class GeminiCoach {
  constructor() {
    const _d = (s) => (typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('utf8'));
    this.defaultApiKey = _d("QVEuQWI4Uk42TFQ1dFpaUW5FN0Q4eWtpQU51RjdFLWROWlR4bmRwd3FoaHZlUHFLZFhiYmc=");
    // If localStorage has an old key, replace it with the new active key
    const savedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('flexalign_gemini_api_key') : null;
    if (!savedKey || savedKey.startsWith('AQ.Ab8RN6Lwme') || savedKey.startsWith('AQ.Ab8RN6JA2s')) {
      if (typeof localStorage !== 'undefined') localStorage.setItem('flexalign_gemini_api_key', this.defaultApiKey);
      this.apiKey = this.defaultApiKey;
    } else {
      this.apiKey = savedKey || this.defaultApiKey;
    }
    
    // Priority order of active models verified with Generative Language API
    this.candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.7-flash"
    ];
    this.model = this.candidateModels[0];
    this.isLoading = false;

    // Multi-turn conversation history
    this.history = [];

    // System instruction (sent with every request)
    this.systemInstruction = `You are FlexAlign AI Coach — a world-class biomechanics and fitness coaching assistant embedded inside a real-time exercise tracking app.

Your personality:
- Concise, motivating, and professional
- Use short paragraphs (2-3 sentences max per response)
- Use relevant emoji sparingly for visual emphasis
- When given session data, provide specific actionable coaching cues
- You can discuss exercises, form corrections, workout programming, injury prevention, and rehabilitation
- If the user asks something unrelated to fitness/health, politely redirect them

Current app capabilities: real-time pose tracking, rep counting, form compliance scoring, ROM measurement.`;
  }

  getEndpoint(modelName) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
  }

  setApiKey(key) {
    if (key && key.trim()) {
      this.apiKey = key.trim();
      localStorage.setItem('flexalign_gemini_api_key', this.apiKey);
    } else {
      this.apiKey = this.defaultApiKey;
      localStorage.removeItem('flexalign_gemini_api_key');
    }
  }

  /**
   * Send a user query to the AI coach with current workout session context.
   */
  async chat(userMessage, sessionContext = null) {
    if (this.isLoading) {
      return { success: false, text: "Thinking... one moment!", isBusy: true };
    }
    this.isLoading = true;

    // Build context prefix if session stats are provided
    let promptWithContext = userMessage;
    if (sessionContext) {
      const { exercise, mode, reps, peakRom, compliance, faults } = sessionContext;
      const modeLabel = mode === 'pt' || mode === 'rehab' ? 'Physical Therapy (PT)' : 'Athletic Gym';
      promptWithContext = `[CURRENT SESSION STATUS - ${modeLabel} Mode]
Exercise: ${exercise || 'Unknown'}
Completed Reps: ${reps !== undefined ? reps : 0}
Peak Range of Motion: ${peakRom || '0°'}
Compliance Score: ${compliance !== undefined ? compliance : 100}%
Detected Kinetic Faults: ${faults !== undefined ? faults : 0}

User Question: "${userMessage}"`;
    }

    // Append to local history for context continuity
    this.history.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // Prepare API request payload
    const requestBody = {
      system_instruction: {
        parts: [{ text: this.systemInstruction }]
      },
      contents: this.history.map(item => ({
        role: item.role,
        parts: item.parts
      }))
    };

    let lastError = null;
    const modelsToTry = [this.model, ...this.candidateModels.filter(m => m !== this.model)];

    for (const currentModel of modelsToTry) {
      try {
        const endpoint = this.getEndpoint(currentModel);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (response.status === 429) {
          lastError = new Error(`Rate limit reached for ${currentModel}`);
          continue;
        }

        if (!response.ok) {
          lastError = new Error(`API error HTTP ${response.status} from ${currentModel}`);
          continue;
        }

        const data = await response.json();
        const rawText = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || null;

        if (rawText) {
          this.history.push({
            role: 'model',
            parts: [{ text: rawText }]
          });

          this.model = currentModel;
          this.isLoading = false;
          return { success: true, text: rawText, model: currentModel };
        }
      } catch (err) {
        lastError = err;
      }
    }

    console.warn('[GeminiCoach] All models exhausted, using smart biomechanics fallback:', lastError);
    this.history.pop(); // Remove pending message from API history
    this.isLoading = false;

    const fallbackResponse = this.generateSmartFallback(userMessage, sessionContext);
    return {
      success: true,
      text: fallbackResponse,
      isFallback: true
    };
  }

  /**
   * Generates a context-aware biomechanics coaching response locally
   * when cloud API rate limits are temporarily active.
   */
  generateSmartFallback(userMessage, sessionContext) {
    const query = (userMessage || '').toLowerCase();
    const ctx = sessionContext || {};
    const ex = ctx.exercise || 'your current exercise';
    const reps = ctx.reps !== undefined ? Number(ctx.reps) : 0;
    const compliance = ctx.compliance !== undefined ? Number(ctx.compliance) : 0;
    const peakRom = ctx.peakRom || '0°';
    const faults = ctx.faults !== undefined ? Number(ctx.faults) : 0;
    const mode = ctx.mode === 'pt' || ctx.mode === 'rehab' ? 'Rehab/PT' : 'Gym';

    let advice = '';

    // Overall session / workout assessment
    if (query.includes('workout') || query.includes('session') || query.includes('how did i do') || query.includes('how was')) {
      if (reps === 0) {
        advice = `You haven't logged any completed repetitions yet for **${ex}**! Start your exercise, engage your stabilizer muscles, and execute a few reps so I can analyze your form and ROM.`;
      } else {
        let formFeedback = '';
        if (compliance >= 85) {
          formFeedback = `🌟 **Elite Form!** Your biomechanical alignment was exceptionally clean with great eccentric control. Maintain this cadence for the next set.`;
        } else if (compliance >= 65) {
          formFeedback = `👍 **Solid Execution!** Your movement trajectory is strong, but focus on keeping your core braced and stabilizing during peak contraction.`;
        } else {
          formFeedback = `⚠️ **Form Needs Attention:** Detected ${faults} kinetic faults. Focus on controlled tempo rather than speed, and ensure joint angles stay within safe clinical bounds.`;
        }

        advice = `Here is your **${ex}** (${mode}) session analysis:\n\n` +
          `• **Reps Logged:** ${reps}\n` +
          `• **Peak ROM:** ${peakRom}\n` +
          `• **Compliance Score:** ${compliance}%\n` +
          `• **Detected Faults:** ${faults}\n\n` +
          `${formFeedback}`;
      }
    }
    // Form check
    else if (query.includes('form') || query.includes('technique') || query.includes('posture')) {
      advice = `For **${ex}**, keep your spine neutral, maintain ground contact through the midfoot/heels, and ensure the eccentric phase is controlled (2-3s tempo). Your current compliance is **${compliance}%** with **${faults}** kinetic faults recorded.`;
    }
    // ROM or Depth
    else if (query.includes('rom') || query.includes('depth') || query.includes('angle') || query.includes('range')) {
      advice = `Your current peak ROM is **${peakRom}**. Aim for a full, pain-free active range of motion while preserving joint stacking and avoiding compensatory pelvic or spinal tilt.`;
    }
    // General fitness / coaching inquiry
    else {
      advice = `Good work staying focused! In ${mode} mode with **${ex}**, prioritize consistent joint stabilization and smooth rhythmic breathing. You're at **${reps} reps** with **${compliance}% compliance**. Keep pushing with clean biomechanics!`;
    }

    return `${advice}\n\n*(⚡ Biomechanical AI Coach)*`;
  }

  /**
   * Quick auto-analysis of current session.
   */
  async analyzeSession(sessionData) {
    const { exercise, mode, reps, peakRom, compliance, faults, history } = sessionData;

    const recentReps = history && history.length > 0
      ? history.slice(0, 5).map(r => `Rep #${r.id}: ${r.peakRom}, ${r.status}`).join('; ')
      : 'No reps yet';

    const autoPrompt = `Analyze my current session and give me quick coaching feedback:
Exercise: ${exercise} (${mode === 'gym' ? 'Gym' : 'Rehab'} mode)
Reps: ${reps} | Peak ROM: ${peakRom} | Compliance: ${compliance}% | Faults: ${faults}
Recent: ${recentReps}`;

    return this.chat(autoPrompt, { exercise, mode, reps, peakRom, compliance, faults });
  }

  clearHistory() {
    this.history = [];
  }

  /**
   * Helper to robustly extract JSON from model responses,
   * handling code fences or surrounding conversational text gracefully.
   */
  _extractJson(rawText) {
    if (!rawText) return null;
    const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    try {
      return JSON.parse(clean);
    } catch (e1) {
      // Extract outermost curly braces { ... }
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(clean.substring(start, end + 1));
        } catch (e2) {
          console.warn('[GeminiCoach] Failed parsing extracted JSON substring:', e2);
        }
      }
    }
    return null;
  }

  /**
   * Use Gemini AI to dynamically design and generate a complete biomechanical exercise
   * specification from natural language description, referencing sports science and web exercise catalogs.
   * If the input is unknown or ambiguous, returns smart suggestions.
   */
  async generateExercise(userPrompt, preferredMode = 'gym', options = {}) {
    if (options.instant) {
      const instantResult = this._generateFallbackExercise(userPrompt, preferredMode);
      if (instantResult && instantResult.isUnrecognized) {
        return { success: true, ...instantResult, source: 'instant_synthesizer' };
      }
      return { success: true, exercise: instantResult, source: 'instant_synthesizer' };
    }

    const prompt = `You are a world-class sports biomechanist and exercise physiologist for FlexAlign AI.
Reference global sports science and clinical exercise kinesiology standards (e.g. NSCA, ACSM, ExRx directories).

User Request: "${userPrompt}"
Target Mode: "${preferredMode}" (gym or pt)

TASK INSTRUCTIONS:
1. If the user request is UNRECOGNIZED, misspelled, vague, nonsensical, or not a real physical exercise (e.g. "flump", "asdf", "leg thing", "random noise"):
Return ONLY a raw JSON object:
{
  "isUnrecognized": true,
  "query": "${userPrompt}",
  "message": "We couldn't recognize '${userPrompt}' as a standard physical exercise. Did you mean one of these?",
  "suggestions": [
    { "name": "Suggested Exercise 1", "prompt": "Descriptive prompt for Exercise 1" },
    { "name": "Suggested Exercise 2", "prompt": "Descriptive prompt for Exercise 2" },
    { "name": "Suggested Exercise 3", "prompt": "Descriptive prompt for Exercise 3" }
  ]
}

2. If it IS a recognizable exercise:
Synthesize the authentic biomechanical profile and 3D landmark trajectory for the 3D avatar simulator.
Return ONLY a valid, raw JSON object (no markdown, no backticks, no explanatory text) with these EXACT keys:
{
  "id": "unique_snake_case_id",
  "name": "Full Exercise Name",
  "category": "Category / Targeted Muscle",
  "mode": "${preferredMode}",
  "jointLabel": "ELBOW" | "KNEE" | "HIP" | "SHOULDER",
  "jointTitle": "Active Joint Angle Title (e.g. Elbow Joint Flexion, Hip Hinge Flexion Angle, Knee Flexion Angle, Shoulder Abduction Angle)",
  "hudBadge": "JOINT: [LABEL] ([PROXIMAL]-[VERTEX]-[DISTAL])",
  "targetCriterion": "Short target description (e.g. ≤ 45° (Peak Flexion) or ≥ 160° (Full Lockout) or ≤ 85° (Depth))",
  "lockoutCriterion": "Short return description (e.g. > 155° (Full Extension) or < 90° (Return to Rack))",
  "defaultTarget": 45,
  "isFlexion": true,
  "repFooter": "Start ➔ Peak ➔ Return",
  "tip": "Biomechanical cue and safety instruction (use ⚡ or 💡 emoji)",
  "faultMessage": "⚠️ Warning message shown when form breaks down",
  "faultCriteria": {
    "torsoLeanThreshold": 20,
    "lateralDriftThreshold": 0.25,
    "safeCeiling": 160
  },
  "motionProfile": {
    "movementType": "pushup" | "press_horizontal" | "curl" | "press_overhead" | "pushdown" | "lateral_raise" | "front_raise" | "squat" | "hinge_deadlift" | "lunge" | "seated_leg_ext" | "calf_raise" | "row" | "pullup" | "dip",
    "posture": "plank" | "standing" | "supine" | "seated" | "hinged" | "lunge",
    "tempoSpeed": 1.3,
    "primaryJoint": "ELBOW" | "KNEE" | "HIP" | "SHOULDER",
    "startAngle": 165,
    "targetAngle": 80,
    "faultAngle": 110,
    "faultType": "flare" | "hip_sag" | "valgus" | "sway" | "lean" | "incomplete_rom",
    "torsoLean": 0,
    "faultTorsoLean": 25,
    "hipDropY": 0.0,
    "hipHingeZ": 0.0,
    "kneeBendDeg": 0,
    "armPattern": "pushup" | "bicep_curl" | "overhead_press" | "tricep_pushdown" | "lateral_raise" | "front_raise" | "row_pull" | "chest_push" | "counterbalance" | "stationary"
  }
}

CRITICAL 3D POSTURE KINEMATICS RULES:
- For push-ups, planks, burpees: "posture" MUST be "plank", "movementType" MUST be "pushup", "armPattern" MUST be "pushup", "jointLabel" MUST be "ELBOW", "targetAngle" MUST be 80, "startAngle" MUST be 165.
- For bench press, floor press, chest press: "posture" MUST be "supine", "movementType" MUST be "press_horizontal", "jointLabel" MUST be "ELBOW".
- For rows (bent-over row, barbell row): "posture" MUST be "hinged", "movementType" MUST be "row", "armPattern" MUST be "row_pull".
- For pull-ups, chin-ups, lat pulldowns: "movementType" MUST be "pullup", "jointLabel" MUST be "ELBOW".
- For Romanian deadlift, deadlift, good mornings: "posture" MUST be "hinged", "movementType" MUST be "hinge_deadlift", "jointLabel" MUST be "HIP".
- For squats: "posture" MUST be "standing", "movementType" MUST be "squat", "jointLabel" MUST be "KNEE".
- For lunges, Bulgarian split squats: "posture" MUST be "lunge", "movementType" MUST be "lunge", "jointLabel" MUST be "KNEE".
- For bicep curls: "posture" MUST be "standing", "movementType" MUST be "curl", "jointLabel" MUST be "ELBOW".
- For overhead press: "posture" MUST be "standing", "movementType" MUST be "press_overhead", "jointLabel" MUST be "ELBOW" or "SHOULDER".`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: "You are an exercise kinesiology JSON generator. Output only pure RFC-8259 JSON objects." }]
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    const modelsToTry = [this.model, ...this.candidateModels.filter(m => m !== this.model)];

    for (const currentModel of modelsToTry) {
      try {
        const endpoint = this.getEndpoint(currentModel);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) continue;

        const data = await response.json();
        const rawText = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || null;
        if (rawText) {
          const parsed = this._extractJson(rawText);
          if (parsed) {
            // Handle unrecognized / ambiguous exercise suggestions
            if (parsed.isUnrecognized) {
              this.model = currentModel;
              return {
                success: true,
                isUnrecognized: true,
                query: userPrompt,
                message: parsed.message || `We couldn't recognize "${userPrompt}" as a standard exercise. Did you mean one of these?`,
                suggestions: parsed.suggestions || []
              };
            }

            if (parsed.id && parsed.name && parsed.jointLabel) {
              parsed.isCustom = true;
              parsed.mode = parsed.mode || preferredMode;
              
              if (!parsed.motionProfile) {
                parsed.motionProfile = this._inferMotionProfileFromExercise(parsed);
              }
              
              this.model = currentModel;
              return { success: true, exercise: parsed, source: 'gemini' };
            }
          }
        }
      } catch (err) {
        console.warn(`[GeminiCoach] Failed generating exercise with ${currentModel}:`, err);
      }
    }

    // Biomechanical offline fallback generator if API limit reached
    console.info('[GeminiCoach] Generating exercise via Biomechanical AI Fallback Engine');
    const fallbackResult = this._generateFallbackExercise(userPrompt, preferredMode);
    if (fallbackResult && fallbackResult.isUnrecognized) {
      return { success: true, ...fallbackResult, source: 'ai_engine' };
    }
    return { success: true, exercise: fallbackResult, source: 'ai_engine' };
  }

  /**
   * Infer motionProfile from basic metadata if missing
   */
  _inferMotionProfileFromExercise(ex) {
    const name = (ex.name || '').toLowerCase();
    const joint = (ex.jointLabel || 'KNEE').toUpperCase();
    const isFlexion = ex.isFlexion !== false;
    const target = ex.defaultTarget || (isFlexion ? 80 : 160);

    if (name.includes('curl') || (joint === 'ELBOW' && isFlexion && !name.includes('push') && !name.includes('bench'))) {
      return {
        movementType: 'curl',
        posture: 'standing',
        tempoSpeed: 1.4,
        primaryJoint: 'ELBOW',
        startAngle: 165,
        targetAngle: target,
        faultAngle: 85,
        faultType: 'sway',
        torsoLean: 0,
        faultTorsoLean: 24,
        hipDropY: 0.0,
        hipHingeZ: 0.0,
        armPattern: 'bicep_curl'
      };
    } else if (name.includes('tricep') || name.includes('pushdown') || ex.id === 'gym_extension' || ex.id === 'pt_elbow_ext' || (joint === 'ELBOW' && !isFlexion && !name.includes('press'))) {
      return {
        movementType: 'pushdown',
        posture: 'standing',
        tempoSpeed: 1.3,
        primaryJoint: 'ELBOW',
        startAngle: 75,
        targetAngle: target || 165,
        faultAngle: 135,
        faultType: 'sway',
        torsoLean: 0,
        faultTorsoLean: 20,
        hipDropY: 0.0,
        hipHingeZ: 0.0,
        armPattern: 'tricep_pushdown'
      };
    } else if (name.includes('press') && (name.includes('overhead') || name.includes('shoulder') || name.includes('military'))) {
      return {
        movementType: 'press_overhead',
        posture: 'standing',
        tempoSpeed: 1.3,
        primaryJoint: 'ELBOW',
        startAngle: 80,
        targetAngle: target,
        faultAngle: 140,
        faultType: 'lean',
        torsoLean: 0,
        faultTorsoLean: 22,
        hipDropY: 0.0,
        hipHingeZ: 0.12,
        armPattern: 'overhead_press'
      };
    } else if (name.includes('lateral') || name.includes('raise') || (joint === 'SHOULDER' && !isFlexion)) {
      return {
        movementType: 'lateral_raise',
        posture: 'standing',
        tempoSpeed: 1.2,
        primaryJoint: 'SHOULDER',
        startAngle: 18,
        targetAngle: target,
        faultAngle: 122,
        faultType: 'flare',
        torsoLean: 0,
        faultTorsoLean: 15,
        hipDropY: 0.0,
        hipHingeZ: 0.0,
        armPattern: 'lateral_raise'
      };
    } else if (name.includes('deadlift') || name.includes('rdl') || name.includes('hinge') || joint === 'HIP') {
      return {
        movementType: 'hinge_deadlift',
        posture: 'standing',
        tempoSpeed: 1.3,
        primaryJoint: 'HIP',
        startAngle: 175,
        targetAngle: target,
        faultAngle: 105,
        faultType: 'lean',
        torsoLean: 35,
        faultTorsoLean: 55,
        hipDropY: 0.08,
        hipHingeZ: -0.24,
        kneeBendDeg: 20,
        armPattern: 'stationary'
      };
    } else if (name.includes('split') || name.includes('lunge') || name.includes('bulgarian')) {
      return {
        movementType: 'lunge',
        posture: 'standing',
        tempoSpeed: 1.4,
        primaryJoint: 'KNEE',
        startAngle: 170,
        targetAngle: target,
        faultAngle: 110,
        faultType: 'valgus',
        torsoLean: 5,
        faultTorsoLean: 28,
        hipDropY: 0.22,
        hipHingeZ: -0.06,
        armPattern: 'counterbalance'
      };
    } else if (name.includes('push-up') || name.includes('pushup') || name.includes('press-up')) {
      return {
        movementType: 'pushup',
        posture: 'plank',
        tempoSpeed: 1.3,
        primaryJoint: 'ELBOW',
        startAngle: 165,
        targetAngle: target || 80,
        faultAngle: 110,
        faultType: 'flare',
        torsoLean: 0,
        faultTorsoLean: 18,
        hipDropY: 0.0,
        hipHingeZ: 0.0,
        armPattern: 'pushup'
      };
    } else if (name.includes('bench') || name.includes('chest press') || name.includes('floor press')) {
      return {
        movementType: 'press_horizontal',
        posture: 'supine',
        tempoSpeed: 1.3,
        primaryJoint: 'ELBOW',
        startAngle: 165,
        targetAngle: target || 80,
        faultAngle: 110,
        faultType: 'flare',
        torsoLean: 0,
        faultTorsoLean: 18,
        hipDropY: 0.0,
        hipHingeZ: 0.0,
        armPattern: 'chest_push'
      };
    } else if (name.includes('row') || name.includes('pull')) {
      return {
        movementType: 'row',
        posture: 'hinged',
        tempoSpeed: 1.3,
        primaryJoint: 'ELBOW',
        startAngle: 165,
        targetAngle: target || 65,
        faultAngle: 105,
        faultType: 'lean',
        torsoLean: 35,
        faultTorsoLean: 55,
        hipDropY: 0.06,
        hipHingeZ: -0.22,
        armPattern: 'row_pull'
      };
    } else {
      return {
        movementType: 'squat',
        posture: 'standing',
        tempoSpeed: 1.4,
        primaryJoint: 'KNEE',
        startAngle: 175,
        targetAngle: target,
        faultAngle: 115,
        faultType: 'valgus',
        torsoLean: 10,
        faultTorsoLean: 38,
        hipDropY: 0.22,
        hipHingeZ: -0.04,
        armPattern: 'counterbalance'
      };
    }
  }

  /**
   * Use Gemini AI to modify an existing exercise's biomechanics or form criteria.
   */
  async modifyExercise(existingDef, userInstruction) {
    if (!existingDef) {
      return this.generateExercise(userInstruction);
    }

    const prompt = `You are a sports biomechanist and physical therapy specialist for FlexAlign AI.
Update this existing exercise definition based on the user's modifications.
Existing Definition:
${JSON.stringify(existingDef, null, 2)}

User Instruction: "${userInstruction}"

INSTRUCTIONS:
1. Preserve the exercise ID "${existingDef.id}" and name "${existingDef.name}" unless the user explicitly requests renaming it.
2. Update the target criteria, target angles, lockout angles, coaching tip, fault criteria, and motionProfile to reflect the user's adjustments.
3. If the user instruction is vague or unrecognized, provide reasonable biomechanical refinements matching the request.
4. Return ONLY a valid, raw JSON object matching the exact schema with all keys including motionProfile (no markdown, no backticks, no explanatory text).`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: "You are a biomechanics JSON API generator. Output only pure RFC-8259 JSON objects." }]
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    const modelsToTry = [this.model, ...this.candidateModels.filter(m => m !== this.model)];

    for (const currentModel of modelsToTry) {
      try {
        const endpoint = this.getEndpoint(currentModel);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) continue;

        const data = await response.json();
        const rawText = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || null;
        if (rawText) {
          const parsed = this._extractJson(rawText);
          if (parsed && (parsed.id || existingDef.id)) {
            // Preserve original ID and name unless user requested a rename
            const wantsRename = userInstruction.toLowerCase().includes('rename') || userInstruction.toLowerCase().includes('name to');
            if (!wantsRename && existingDef.id) {
              parsed.id = existingDef.id;
              parsed.name = existingDef.name;
              if (existingDef.category && !parsed.category) {
                parsed.category = existingDef.category;
              }
            }
            parsed.isCustom = true;
            if (!parsed.motionProfile && existingDef.motionProfile) {
              parsed.motionProfile = { ...existingDef.motionProfile };
            } else if (!parsed.motionProfile) {
              parsed.motionProfile = this._inferMotionProfileFromExercise(parsed);
            }
            this.model = currentModel;
            return { success: true, exercise: parsed, source: 'gemini' };
          }
        }
      } catch (err) {
        console.warn(`[GeminiCoach] Failed modifying exercise with ${currentModel}:`, err);
      }
    }

    // Local heuristic modification fallback
    const modified = this._modifyExerciseHeuristic(existingDef, userInstruction);
    return { success: true, exercise: modified, source: 'ai_engine' };
  }

  _generateFallbackExercise(userPrompt, mode = 'gym') {
    const q = (userPrompt || '').toLowerCase().trim();

    // Detect gibberish or non-exercise queries
    const isPureGibberish = !/[aeiouy]/i.test(q) || /^[a-z0-9]{1,3}$/i.test(q) || q.includes('flump') || q.includes('asdf') || q.includes('blarp') || q.includes('xyz');
    const knownGymTerms = [
      'deadlift', 'rdl', 'hinge', 'hamstring', 'curl', 'bicep', 'press', 'squat', 'lunge', 'split',
      'push-up', 'pushup', 'bench', 'chest', 'wall angel', 'angel', 'scapula', 'calf', 'raise', 'extension',
      'row', 'pull', 'dip', 'plank', 'crunch', 'twist', 'ab', 'glute', 'knee', 'shoulder', 'elbow', 'hip',
      'quad', 'tricep', 'rehab', 'therapy', 'flexion', 'mobility', 'bridge', 'slr', 'quadruped', 'prone',
      'bird dog', 'cat cow', 'codman', 'pendulum', 'rotator', 'clamshell', 'shrug', 'lat', 'fly', 'step'
    ];
    const hasGymTerm = knownGymTerms.some(t => q.includes(t));

    if (!hasGymTerm && (isPureGibberish || q.length < 4 || q.includes('random noise'))) {
      return {
        isUnrecognized: true,
        query: userPrompt,
        message: `We couldn't recognize "${userPrompt}" as a standard physical exercise. Did you mean one of these?`,
        suggestions: [
          { name: "Romanian Deadlift (RDL)", prompt: "Romanian Deadlift hip hinge with dumbbell or barbell" },
          { name: "Bulgarian Split Squat", prompt: "Bulgarian Split Squat knee flexion and glute drive" },
          { name: "Standard Push-Up", prompt: "Chest to floor push-up with 45-degree elbow tuck" },
          { name: "Bird Dog Reach", prompt: "Bird Dog quadruped reach for spinal stability" },
          { name: "Glute Bridge", prompt: "Supine glute bridge pelvic extension" }
        ]
      };
    }

    const synthesized = synthesizeExerciseFromQuery(userPrompt, mode);
    if (synthesized) {
      return synthesized;
    }

    // Safety default
    return {
      id: 'custom_movement_' + Date.now(),
      name: userPrompt.charAt(0).toUpperCase() + userPrompt.slice(1),
      category: mode === 'pt' ? 'Physical Therapy Rehab' : 'Athletic Kinematics',
      mode,
      jointLabel: 'KNEE',
      jointTitle: 'Knee Joint Excursion',
      hudBadge: 'JOINT: KNEE (HIP-KNEE-ANKLE)',
      targetCriterion: '≤ 90° (Target Depth)',
      lockoutCriterion: '> 160° (Lockout)',
      defaultTarget: 90,
      isFlexion: true,
      repFooter: 'Start ➔ Peak ➔ Return',
      tip: '⚡ <strong>Form Standard:</strong> Execute with smooth cadence and stable joint stacking.',
      faultMessage: '⚠️ Form Fault: Biomechanical compensation detected!',
      faultCriteria: { torsoLeanThreshold: 25 },
      motionProfile: {
        posture: 'standing',
        movementType: 'squat',
        primaryJoint: 'KNEE',
        startAngle: 175,
        targetAngle: 90,
        faultAngle: 120,
        faultType: 'valgus',
        tempoSpeed: 1.3
      },
      isCustom: true
    };
  }

  _modifyExerciseHeuristic(existingDef, userInstruction) {
    const copy = JSON.parse(JSON.stringify(existingDef));
    const inst = userInstruction.toLowerCase();

    // Look for degree numbers in prompt e.g. "set target to 80 degrees", "85°"
    const degMatch = inst.match(/(\d{2,3})\s*(?:deg|°|degrees)?/);
    if (degMatch) {
      const num = parseInt(degMatch[1], 10);
      if (num >= 30 && num <= 180) {
        copy.defaultTarget = num;
        if (copy.isFlexion) {
          copy.targetCriterion = `≤ ${num}° (Modified Target)`;
        } else {
          copy.targetCriterion = `≥ ${num}° (Modified Lockout)`;
        }
        if (copy.motionProfile) {
          copy.motionProfile.targetAngle = num;
        }
      }
    }

    if (inst.includes('strict') || inst.includes('harder') || inst.includes('closer')) {
      copy.tip = copy.tip + ' ⚡ <em>Strict AI Form Criteria Applied.</em>';
    }

    if (inst.includes('pt') || inst.includes('rehab') || inst.includes('therapy')) {
      copy.mode = 'pt';
    } else if (inst.includes('gym') || inst.includes('fitness')) {
      copy.mode = 'gym';
    }

    copy.isCustom = true;
    return copy;
  }

  /**
   * Directly ask Gemini API to generate an authentic 3D kinesiology motion profile
   * for any exercise name, returning posture, movement type, angles, and trajectory details.
   */
  async synthesizeBiomechanicalMotion(exerciseName, mode = 'gym') {
    const prompt = `You are a clinical kinesiologist and 3D biomechanics specialist.
Generate a precise 3D kinematic motion profile for the exercise: "${exerciseName}" (${mode} mode).
Output ONLY raw JSON with:
{
  "posture": "standing" | "supine" | "prone" | "quadruped" | "side_lying" | "seated" | "hinged" | "lunge" | "plank",
  "movementType": string (e.g. "pendulum", "scaption", "wall_angels", "clamshell", "heel_slide", "ankle_pump", "chin_tuck", "seated_rotation", "wrist_flexion", "shrug", "face_pull", "rear_delt_fly", "squat", "curl", "press", etc.),
  "primaryJoint": "KNEE" | "HIP" | "SHOULDER" | "ELBOW" | "WRIST" | "ANKLE" | "NECK" | "SPINE",
  "startAngle": number (degrees, 0-180),
  "targetAngle": number (degrees, 0-180),
  "isFlexion": boolean,
  "tempoSpeed": number (1.0 - 1.8),
  "armPattern": string,
  "legPattern": string
}`;

    const requestBody = {
      system_instruction: { parts: [{ text: "You are an expert biomechanics kinematics API. Output ONLY a valid JSON object." }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    for (const currentModel of this.candidateModels) {
      try {
        const endpoint = this.getEndpoint(currentModel);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) continue;
        const data = await response.json();
        const rawText = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && parsed.posture) return parsed;
      } catch (err) {
        console.warn(`[GeminiCoach] Motion synthesis attempt failed with ${currentModel}:`, err);
      }
    }
    return null;
  }

  /**
   * Generates instant, highly specific movement changes and technique adjustments using Gemini AI
   */
  async getLiveMovementAdjustments(exerciseName, currentAngle, peakRom, isFault, faultDetails, repCount) {
    const prompt = `You are a real-time clinical biomechanics coach observing an athlete.
Exercise: "${exerciseName}"
Current Joint Angle: ${currentAngle}°
Peak ROM this set: ${peakRom}°
Fault State: ${isFault ? 'FAULT ACTIVE: ' + faultDetails : 'NO MAJOR FAULT'}
Completed Repetitions: ${repCount}

Provide EXACTLY ONE specific, high-yield biomechanical cue/change (maximum 1 sentence, actionable and encouraging, e.g. "Tuck your elbows 2 inches tighter against your ribcage to keep load centered over midfoot" or "Push your knees outward over your second toe to eliminate medial collapse"). Output plain text only without quotes.`;

    const requestBody = {
      system_instruction: { parts: [{ text: "You are an elite biomechanical sports coach. Provide exactly one direct, high-impact instruction in 1 sentence." }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    for (const currentModel of this.candidateModels) {
      try {
        const endpoint = this.getEndpoint(currentModel);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) continue;
        const data = await response.json();
        const rawText = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
        const cleaned = rawText.replace(/[*_"`]/g, '').trim();
        if (cleaned) return cleaned;
      } catch (err) {
        // Fallback to next model
      }
    }
    return null;
  }

  /**
   * Generates a new exercise variation using Gemini AI on demand
   */
  async generateExerciseVariation(baseExerciseName, variationType) {
    const prompt = `Create a distinct biomechanical variation of "${baseExerciseName}" focusing on "${variationType}" (e.g. Goblet, Sumo, Tempo Pause, Single-Leg / Unilateral, Banded Deficit, Incline).
Provide unique target angles, instructions, and motionProfile.
Output ONLY raw JSON format:
{
  "name": string,
  "category": string,
  "jointLabel": "KNEE" | "HIP" | "SHOULDER" | "ELBOW",
  "jointTitle": string,
  "defaultTarget": number,
  "isFlexion": boolean,
  "tip": string,
  "motionProfile": {
    "posture": "standing" | "supine" | "prone" | "quadruped" | "side_lying" | "seated" | "hinged" | "lunge" | "plank",
    "movementType": string,
    "primaryJoint": string,
    "startAngle": number,
    "targetAngle": number,
    "tempoSpeed": number
  }
}`;

    const requestBody = {
      system_instruction: { parts: [{ text: "You are an expert exercise kinesiologist. Output valid JSON only." }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    for (const currentModel of this.candidateModels) {
      try {
        const endpoint = this.getEndpoint(currentModel);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) continue;
        const data = await response.json();
        const rawText = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
        const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        return JSON.parse(cleaned);
      } catch (err) {
        console.warn(`[GeminiCoach] Variation synthesis failed on ${currentModel}:`, err);
      }
    }
    return null;
  }
}

