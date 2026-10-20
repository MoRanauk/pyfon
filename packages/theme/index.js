// Colour and font tokens per brand. Change values here, never in components.
const system = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const serif = 'Georgia, "Times New Roman", serif';

export const themes = {
  mco: {
    name: 'M & Co. Brands',
    colors: { navy: '#0B1F3A', gold: '#C9A227', bg: '#FFFFFF', surface: '#F4F6F9', text: '#1B2430', muted: '#5B6675', border: '#E1E5EB', accent: '#C9A227', onAccent: '#0B1F3A' },
    fonts: { heading: system, body: system },
    radius: '8px'
  },
  prestige: {
    name: 'Pyfon Gift Hub',
    colors: { navy: '#3A2630', gold: '#C99A7A', bg: '#FBF3EC', surface: '#F5E4DA', text: '#3B2A2E', muted: '#8A7274', border: '#EBD9CE', accent: '#C4566F', onAccent: '#FFFFFF' },
    fonts: { heading: serif, body: system },
    radius: '2px'
  },
  prestigeHim: {
    name: 'Pyfon Gift Hub (for him)',
    colors: { navy: '#101827', gold: '#C8283A', bg: '#F5F2EF', surface: '#E9E4DF', text: '#15181F', muted: '#6B6F78', border: '#DDD7D0', accent: '#7A1F2E', onAccent: '#FFFFFF' },
    fonts: { heading: serif, body: system },
    radius: '2px'
  },
  trim: {
    name: 'TriM Atelier',
    colors: { navy: '#111111', gold: '#B8975A', bg: '#FAF6EE', surface: '#F0E9DA', text: '#1A1A1A', muted: '#6F6A60', border: '#E3DAC8', accent: '#111111', onAccent: '#F5EFE1' },
    fonts: { heading: '"Playfair Display", Georgia, serif', body: '"Jost", system-ui, -apple-system, "Segoe UI", sans-serif' },
    radius: '0px'
  },
  m3: {
    name: 'M3 Labs',
    colors: { navy: '#0B1F3A', gold: '#C9A227', bg: '#F4F6F9', surface: '#FFFFFF', text: '#1B2430', muted: '#5B6675', border: '#DDE2EA', accent: '#0B1F3A', onAccent: '#FFFFFF' },
    fonts: { heading: system, body: system },
    radius: '6px'
  },
  dev: {
    name: 'Dev Console',
    colors: { navy: '#0B1F3A', gold: '#C9A227', bg: '#0F172A', surface: '#1E293B', text: '#E2E8F0', muted: '#94A3B8', border: '#334155', accent: '#C9A227', onAccent: '#0B1F3A' },
    fonts: { heading: system, body: system },
    radius: '6px'
  }
};

export function themeVars(themeName) {
  const t = themes[themeName];
  if (!t) throw new Error('Unknown theme: ' + themeName);
  const vars = { '--pf-radius': t.radius, '--pf-font-heading': t.fonts.heading, '--pf-font-body': t.fonts.body };
  for (const [k, v] of Object.entries(t.colors)) vars['--pf-' + k] = v;
  return vars;
}

// Call once when an app starts: applyTheme('mco')
export function applyTheme(themeName) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeVars(themeName))) root.style.setProperty(k, v);
  document.body.style.background = 'var(--pf-bg)';
  document.body.style.color = 'var(--pf-text)';
  document.body.style.fontFamily = 'var(--pf-font-body)';
  document.body.style.margin = '0';
}
