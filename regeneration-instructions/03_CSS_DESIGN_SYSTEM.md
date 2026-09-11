# FlexAlign AI — CSS & Design System Specification

FlexAlign AI utilizes a custom **Glassmorphic Cyber-Athletic** design system built with pure Vanilla CSS, custom properties, and hardware-accelerated animations.

---

## 1. Color Tokens & CSS Variables (`css/main.css`)

```css
:root {
  /* Core Dark Canvas */
  --bg-primary: #0a0b10;
  --bg-secondary: #12141e;
  --bg-card: rgba(19, 21, 33, 0.75);
  --bg-card-hover: rgba(26, 29, 46, 0.85);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-hover: rgba(255, 255, 255, 0.16);
  --glass-glow: rgba(16, 185, 129, 0.12);

  /* Typography */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Telemetry Status Colors */
  --color-success: #10b981;  /* Target Met / Good Form */
  --color-warning: #f59e0b;  /* Approaching Limit / Suggestion */
  --color-danger: #ef4444;   /* Biomechanical Form Fault */
  --color-info: #3b82f6;     /* Active Kinematic Excursion */
  --color-accent: #a855f7;   /* AI Generative Lab Purple */
}

/* Dual Mode Themes */
body.theme-gym {
  --mode-accent: #10b981;
  --mode-accent-rgb: 16, 185, 129;
  --mode-glow: rgba(16, 185, 129, 0.25);
  --mode-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

body.theme-pt {
  --mode-accent: #06b6d4;
  --mode-accent-rgb: 6, 182, 212;
  --mode-glow: rgba(6, 182, 212, 0.25);
  --mode-gradient: linear-gradient(135deg, #06b6d4 0%, #0284c7 100%);
}
```

---

## 2. Layout Grid Structure

FlexAlign AI employs a 2-column layout on desktop:
- **Left Column (`.viewport-section`):** Flexible container hosting the video, 2D canvas overlay, 3D avatar viewport, and the AI Exercise Lab modal.
- **Right Column (`.dashboard-panel`):** Fixed width (approx 360px–420px) containing the real-time telemetry card, mode metric controls, and coaching drawer.
- **Responsive Breakpoint (<= 1024px):** Stacks into a single column with scrollable telemetry cards.

---

## 3. Gemini AI Exercise Lab & Suggestion Styles (`css/viewport.css`)

```css
/* AI Exercise Lab Modal */
.ai-exercise-modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 11, 16, 0.88);
  backdrop-filter: blur(14px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  overflow-y: auto;
  z-index: 50;
  animation: modalFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Modal Card */
.ai-exercise-modal {
  width: 100%;
  max-width: 680px;
  background: rgba(20, 22, 36, 0.95);
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(168, 85, 247, 0.15);
  padding: 24px;
}

/* Did You Mean Suggestions Card */
.ai-suggestions-card {
  margin-top: 16px;
  padding: 16px 20px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 12px;
  animation: slideInDown 0.25s ease-out;
}

.ai-suggestion-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.ai-suggestion-pill {
  background: rgba(245, 158, 11, 0.15);
  color: #fde68a;
  border: 1px solid rgba(245, 158, 11, 0.5);
  padding: 7px 14px;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.ai-suggestion-pill:hover {
  background: rgba(245, 158, 11, 0.35);
  border-color: #fbbf24;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
}

/* Biomechanical Spec Preview Card */
.ai-preview-card {
  margin-top: 20px;
  background: rgba(15, 17, 26, 0.9);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

---

## 4. Keyframe Animations
- `@keyframes pulseGlow`: Subtle breathing glow on active joint and target angles.
- `@keyframes repPassScore`: Quick energetic scale bump upon rep completion.
- `@keyframes wavePulse`: 3-dot audio listening indicator for hands-free voice engine.
- `@keyframes faultShake`: Subtle horizontal vibration when a biomechanical kinetic fault is detected.
