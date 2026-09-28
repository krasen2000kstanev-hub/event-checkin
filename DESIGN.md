# DESIGN.md

> A calm, dark control room for fast event entry: scan once, understand the status, route the guest.

## 1. Visual Theme & Atmosphere

**Style**: Soft dark operations dashboard
**Keywords**: charcoal chrome, pale blue workspace, rounded panels, compact controls, quiet depth, clear status colors, DM Sans
**Tone**: focused and capable — NOT playful, glossy, or overly decorative
**Feel**: like a private event control desk with a calm, well-lit workspace inside a dark shell.

**Interaction Tier**: L1 — refined static
**Dependencies**: CSS transitions + native browser APIs only

The CodePen reference is treated as a design-language reference, not a clone: dark editor-like chrome, a pale blue rounded main surface, three-zone information hierarchy, compact top actions, and a strong contrast between navigation and workspace.

## 2. Color Palette & Roles

```css
:root {
  --bg: #17191f;
  --surface: #20232b;
  --surface-alt: #f1f5fd;
  --surface-hover: #2b303b;
  --workspace: #dce8fa;
  --border: #343947;
  --border-light: #d2ddec;
  --border-hover: #596274;
  --text: #f6f8fc;
  --text-secondary: #26364b;
  --text-tertiary: #8d99ab;
  --text-on-light: #132238;
  --accent: #55cf83;
  --accent-hover: #71dfa0;
  --accent-rgb: 85, 207, 131;
  --workspace-rgb: 220, 232, 250;
  --success: #37c779;
  --error: #f16363;
  --warning: #efbe5f;
  --info: #6fa2e8;
}
```

**Color Rules:**

- All component colors use variables; no hard-coded colors in component CSS.
- Dark colors belong to shell/navigation; light colors belong to workspace/content.
- Green is reserved for successful check-in and primary actions.
- Red is reserved for invalid QR/errors; amber is reserved for pending/warnings.

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| App title | DM Sans | 22px | 700 | 1.2 | -0.02em |
| Section title | DM Sans | 16px | 700 | 1.3 | -0.01em |
| Card title | DM Sans | 15px | 700 | 1.35 | 0 |
| Body | DM Sans | 15px | 400 | 1.5 | 0 |
| Label | DM Sans | 12px | 600 | 1.3 | 0.04em |
| Data/status | DM Sans | 13px | 600 | 1.3 | 0 |

**Typography Rules:**

- Use sentence case in Bulgarian UI labels.
- Use weight and color, not decorative effects, to establish hierarchy.
- **NEVER use** decorative display fonts, all-caps body copy, gradient text, or text-shadow.

**Text Decoration:**

- No gradients, shadows, or decorative underlines on headings.
- Links use color transition and a subtle underline on hover only.

## 4. Component Stylings

### Buttons

```css
.btn {
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0 14px;
  background: var(--surface);
  color: var(--text);
  font: 600 14px/1 DM Sans, sans-serif;
  transition: background .2s ease, border-color .2s ease, transform .15s ease;
}
.btn:hover { background: var(--surface-hover); border-color: var(--border-hover); }
.btn:active { transform: scale(.98); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary { background: var(--accent); color: #11251b; }
.btn-primary:hover { background: var(--accent-hover); }
```

### Cards

```css
.card {
  border: 1px solid var(--border-light);
  border-radius: 18px;
  background: rgba(var(--workspace-rgb), .72);
  color: var(--text-on-light);
  box-shadow: 0 10px 28px rgba(39, 63, 100, .10);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.card:hover { border-color: #aebed6; box-shadow: 0 14px 32px rgba(39, 63, 100, .14); }
.card:focus-within { border-color: var(--info); box-shadow: 0 0 0 3px rgba(111, 162, 232, .18); }
```

### Navigation / Shell

```css
.app-shell { background: var(--bg); color: var(--text); }
.topbar { min-height: 64px; background: var(--surface); border-bottom: 1px solid var(--border); }
.nav-item { color: var(--text-tertiary); border-radius: 9px; }
.nav-item:hover, .nav-item.active { color: var(--text); background: var(--surface-hover); }
.nav-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

### Inputs / Scanner

```css
input, select {
  min-height: 44px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: #fff;
  color: var(--text-on-light);
  padding: 0 12px;
  font: 400 15px DM Sans, sans-serif;
}
input:hover, select:hover { border-color: #9eafc8; }
input:focus, select:focus { border-color: var(--info); outline: 3px solid rgba(111, 162, 232, .18); }
input:disabled, select:disabled { background: #e7edf6; color: #8795a9; }
.scanner-frame { border-radius: 14px; background: var(--bg); border: 4px solid #9db6d9; }
```

### Status Tags

```css
.status { border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
.status-success { color: #126437; background: #d9f6e4; }
.status-warning { color: #7a5304; background: #fff0c7; }
.status-error { color: #8c2222; background: #ffe0e0; }
.status-neutral { color: #52647b; background: #e7edf6; }
```

## 5. Layout Principles

**Container:**

- Max width: 1180px on desktop.
- Mobile padding: 16px; desktop padding: 24px.
- The workspace sits inside a dark shell with a rounded top-level frame.

**Spacing Scale:**

- Section gap: 20px.
- Component gap: 12px.
- Card padding: 16px desktop, 14px mobile.
- Control height: minimum 44px for touch.

**Grid:**

```css
.workspace-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(280px, .85fr); gap: 16px; }
.dashboard-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
```

The scan result is the primary content. Attendee status and recommendations are secondary panels, not competing full-screen routes.

## 6. Depth & Elevation

| Level | Treatment | Use |
|------|-----------|-----|
| Flat | No shadow, 1px border | toolbar and list rows |
| Subtle | `0 6px 18px rgba(39,63,100,.08)` | normal cards |
| Elevated | `0 14px 32px rgba(39,63,100,.14)` | active result/recommendation |
| Shell | dark border + inset separation | app frame and topbar |

Avoid strong black shadows and glossy gradients.

## 7. Animation & Interaction

**Motion Philosophy**: quiet, useful feedback; no animation should delay scanning or reading a status.
**Tier**: L1

### Dependencies

```html
<!-- No animation dependency. CSS transitions and native browser APIs only. -->
```

### Entrance Animation

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.reveal { animation: fadeInUp .35s cubic-bezier(.16,1,.3,1) both; }
```

### Hover & Focus States

```css
.card, .btn, .nav-item, .attendee-row { transition: transform .2s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease; }
.attendee-row:hover { transform: translateX(2px); background: rgba(255,255,255,.54); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
```

### Special Effects

- Successful scan: a short green status transition and result reveal.
- Invalid scan: red status transition; no shaking animation.
- Primary button: subtle press scale only.
- No parallax, cursor effects, scroll-jacking, or WebGL for an operational tool.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

## 8. Do's and Don'ts

### Do

- Keep the QR action visible without scrolling on mobile.
- Show check-in status in text and color.
- Keep recommendation reasons short and specific.
- Use the pale workspace to separate data from the dark shell.
- Preserve 44px minimum touch targets.
- Use progressive disclosure for routing and recommendations.

### Don't

- ❌ Do not clone the CodePen file-sharing copy or iconography.
- ❌ Do not use gradients for headings or primary surfaces.
- ❌ Do not put personal data in a decorative dashboard area.
- ❌ Do not hide invalid QR errors in a toast only.
- ❌ Do not make the camera preview the only way to test/check a code.
- ❌ Do not use tiny icon-only controls without accessible labels.
- ❌ Do not add decorative animations during entry scanning.
- ❌ Do not use more than one accent color for an action state.

## 9. Responsive Behavior

| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 900px | two-column workspace; dashboard stats inline |
| Tablet | 601–900px | single main column; recommendations below scan result |
| Mobile | ≤ 600px | one column; compact topbar; attendee rows full width; scanner first |

**Touch Targets:** minimum 44×44px
**Collapsing Strategy:** keep scanner and result open; collapse dashboard metadata and route details behind compact sections.

```css
@media (max-width: 900px) {
  .workspace-grid, .dashboard-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .app-shell { min-height: 100dvh; }
  .topbar { min-height: 56px; }
  .workspace { padding: 14px; border-radius: 20px 20px 0 0; }
  .toolbar { gap: 8px; }
  .toolbar .btn-secondary { padding-inline: 10px; }
  .card { border-radius: 14px; padding: 14px; }
}
```
