# FlexAlign AI — Gemini AI Coach & Exercise Lab

This document specifies the Google Gemini Generative Language API integration, prompt engineering, JSON resilience, suggestion mechanisms, and exercise modification architecture in `js/gemini.js`.

---

## 1. Gemini API Endpoint & Model Priority

- **Primary Model:** `gemini-3.1-flash-lite` (fast latency, high quota resilience, and zero 429 rate-limiting).
- **Candidate Fallback Models:** `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-3.7-flash`.
- **Endpoint Structure:**
  ```
  https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}
  ```

---

## 2. Robust JSON Extraction (`_extractJson`)

Language models occasionally prepend conversational text or wrap responses in markdown code fences (` ```json `). To guarantee zero JSON parse crashes:

```javascript
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
```

---

## 3. Dynamic Exercise Generator (`generateExercise`)

### 3.1 Prompt Specification
The prompt instructs the model as a clinical sports scientist, referencing NSCA, ACSM, and ExRx kinesiology web standards.

### 3.2 Unrecognized Input Detection ("Did You Mean?")
If the query is unrecognized, vague, or misspelled (e.g. *"flump jump test"* or *"asdf"*), the model returns:
```json
{
  "isUnrecognized": true,
  "query": "flump jump test",
  "message": "We couldn't recognize 'flump jump test' as a standard physical exercise. Did you mean one of these?",
  "suggestions": [
    { "name": "Vertical Jump Test", "prompt": "Sargent Vertical Jump Test with countermovement" },
    { "name": "Broad Jump Test", "prompt": "Standing Long Jump (Broad Jump) biomechanics" },
    { "name": "Drop Jump Test", "prompt": "Drop Jump reactive strength index test" }
  ]
}
```

### 3.3 Valid Exercise Specification Schema
For recognizable exercises, Gemini returns:
```json
{
  "id": "gym_romanian_deadlift",
  "name": "Romanian Deadlift (RDL)",
  "category": "Posterior Chain / Hamstrings",
  "mode": "gym",
  "jointLabel": "HIP",
  "jointTitle": "Hip Hinge Flexion Angle",
  "hudBadge": "JOINT: HIP (SHOULDER-HIP-KNEE)",
  "targetCriterion": "≤ 75° (Deep Hinge)",
  "lockoutCriterion": "> 165° (Extension)",
  "defaultTarget": 75,
  "isFlexion": true,
  "repFooter": "Stand ➔ Push Hips Back ➔ Drive Glutes",
  "tip": "⚡ Keep a soft knee bend and push hips straight back. Maintain flat spine.",
  "faultMessage": "⚠️ Spine Rounding Detected! Push Hips Backward",
  "faultCriteria": {
    "torsoLeanThreshold": 45,
    "kneeBendThreshold": 140
  },
  "motionProfile": {
    "movementType": "hinge_deadlift",
    "posture": "standing",
    "tempoSpeed": 1.3,
    "primaryJoint": "HIP",
    "startAngle": 175,
    "targetAngle": 75,
    "faultAngle": 105,
    "faultType": "lean",
    "torsoLean": 35,
    "faultTorsoLean: 55,
    "hipDropY": 0.08,
    "hipHingeZ": -0.24,
    "kneeBendDeg": 20,
    "armPattern": "stationary"
  }
}
```

---

## 4. Exercise Modifier Engine (`modifyExercise`)

To alter an active or selected exercise:
1. Passes the **complete existing definition** as JSON context.
2. Preserves the target exercise's `id` and `name` unless the user explicitly asks to rename it.
3. Updates target excursion angle, lockout thresholds, coaching tips, and `motionProfile`.
4. If Gemini omits kinematic properties, `_inferMotionProfileFromExercise` guarantees realistic 3D simulation trajectory synthesis.

---

## 5. Multi-Turn Conversational Coach

The `chat(userMessage, context)` method injects live telemetry:
- Exercise Name & Mode (`Gym` vs `Physical Therapy`)
- Completed Repetitions
- Current Peak ROM
- Form Compliance Score (%)
- Recorded Biomechanical Faults

Enables the AI coach to answer:
- *"How is my form?"* $\rightarrow$ Analyzes recent rep consistency and faults.
- *"Why is my compliance low?"* $\rightarrow$ Identifies specific kinetic breakdown (e.g. knee valgus or excessive forward torso lean).
- *"How do I improve my depth?"* $\rightarrow$ Provides anatomical cues for mobility and joint stacking.
