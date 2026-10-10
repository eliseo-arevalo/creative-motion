// Generic defaults. Projects set their brand in scene.composition.theme (accent is the emphasis colour
// for click frames, ripples, callouts and keycaps; pick one that contrasts with the app's own palette).
export const DEFAULT_THEME = {
  accent: '#2563EB',
  accentInk: '#ffffff',
  ink: '#141414',
  font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  monoFont: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;
