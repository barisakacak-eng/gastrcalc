// GastroCash: visuelle Marke ohne Eingriff in Berechnungen, Speicher oder Navigation.
// Der Bot ist absichtlich standardmäßig neutral: beide Augen offen, kein widersprüchliches Zwinkern.
const states = new Set(['neutral','freundlich','nachdenklich','ernst','erfolg']);
const motions = new Set(['none','idle','thumb','turn','celebrate']);
export function mascotMarkup(state='neutral', motion='none') {
  const s=states.has(state)?state:'neutral';
  const m=motions.has(motion)?motion:'none';
  const mouths={neutral:'M69 79 Q80 82 91 79',freundlich:'M66 76 Q80 91 94 76',nachdenklich:'M73 80 H88',ernst:'M70 81 H90',erfolg:'M65 75 Q80 94 95 75'};
  const eyes=s==='nachdenklich'?'<circle cx="65" cy="64" r="5"/><circle cx="103" cy="64" r="5"/>':'<circle cx="61" cy="64" r="5"/><circle cx="99" cy="64" r="5"/>';
  return `<svg class="gc-bot gc-bot--${s} gc-motion--${m}" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g class="gc-bot-body" stroke="#22301F" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M48 102 Q80 114 112 102 L127 155 Q80 173 33 155Z" fill="#4C6B55"/><path d="M33 116 Q13 119 17 148 M127 116 Q147 119 143 148" fill="none" stroke-width="12"/><path d="M55 158 V173 M105 158 V173" stroke-width="13"/><path d="M54 111 V146 Q80 159 106 146 V111" fill="none"/><circle class="gc-bot-coin" cx="80" cy="128" r="16" fill="#E8763A"/><path d="M61 135 H99 V151 Q80 161 61 151Z" fill="#2E4034"/></g><g class="gc-bot-head" stroke="#22301F" stroke-width="5" stroke-linejoin="round"><rect x="28" y="5" width="104" height="99" rx="48" fill="#F5EDE2"/><rect x="36" y="38" width="88" height="56" rx="23" fill="#22301F"/><rect x="12" y="55" width="18" height="27" rx="8" fill="#F5EDE2"/><rect x="130" y="55" width="18" height="27" rx="8" fill="#F5EDE2"/><g class="gc-bot-eyes" fill="#FFFDF9" stroke="none">${eyes}</g><path d="${mouths[s]}" stroke="#FFFDF9" stroke-width="4" fill="none" stroke-linecap="round"/></g><g class="gc-bot-thumb" stroke="#22301F" stroke-width="5" stroke-linejoin="round"><path d="M126 119 L143 107 L145 95 Q152 88 155 96 L155 110 L158 115 L155 139 L130 138Z" fill="#4C6B55"/></g></svg>`;
}

export function mascotResultState({ aboveZero=false, delta=0, incomplete=false }={}) {
  if (incomplete) return 'nachdenklich';
  if (aboveZero) return 'erfolg';
  if (Number(delta) < 0) return 'ernst';
  if (Number(delta) > 0) return 'nachdenklich';
  return 'neutral';
}
