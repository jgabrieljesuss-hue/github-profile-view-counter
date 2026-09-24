const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function parseColor(raw) {
  if (!raw) return null;
  if (decodeURIComponent(raw).startsWith('rgba') || decodeURIComponent(raw).startsWith('rgb')) return decodeURIComponent(raw);
  return '#' + raw.replace('#', '');
}

function abbreviate(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function tw(str, fontSize) {
  return str.length * fontSize * 0.601;
}

module.exports = async (req, res) => {
  const q = req.query;

  // ─── Username (required) ──────────────────────────────────────
  const username = (q.username || '').trim().toLowerCase();
  if (!username) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(400).send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="30">
        <text x="5" y="20" font-family="monospace" font-size="13" fill="#f78166">
          ⚠ username param required
        </text>
      </svg>
    `);
  }

  // ─── Increment counter for this username ──────────────────────
  const { data, error } = await supabase.rpc('increment_counter', { uname: username });
  if (error) return res.status(500).send('Error');

  // ─── Params ──────────────────────────────────────────────────────
  const base         = parseInt(q.base)           || 0;
  const abbreviated  = q.abbreviated              === 'true';

  const showIcon     = q.icon                     !== 'false';
  const iconSize     = parseInt(q.iconSize)       || 16;
  const iconColor    = parseColor(q.iconColor)    || parseColor(q.color) || '#cccccc';

  const showLabel    = q.label                    !== 'false';
  const labelText    = (q.label && q.label !== 'false') ? q.label : 'Profile views:';
  const labelColor   = parseColor(q.labelColor)   || parseColor(q.color) || '#cccccc';

  const countColor   = parseColor(q.color)        || '#cccccc';
  const fontSize     = parseInt(q.size)           || 13;

  const style        = q.style                    || 'rounded'; // square | rounded | nobg | invisible
  const layout       = q.layout                   || 'horizontal'; // horizontal | vertical | split

  const bgColor      = parseColor(q.bgColor)      || 'rgba(0, 156, 255, 0.8)';
  const labelBgColor = parseColor(q.labelBgColor) || 'rgba(120, 120, 120, 0.8)';

  // ─── Count ───────────────────────────────────────────────────────
  const rawCount = (data || 0) + base;
  const countStr = abbreviated ? abbreviate(rawCount) : String(rawCount);

  // ─── Invisible ───────────────────────────────────────────────────
  if (style === 'invisible') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`);
  }

  // ─── Shared ──────────────────────────────────────────────────────
  const isNobg     = style === 'nobg';
  const isSplit    = layout === 'split';
  const isVertical = layout === 'vertical';
  const r          = (style === 'square' || isNobg) ? 0 : 5;
  const padX       = isNobg ? 0 : 10;
  const padY       = isNobg ? 0 : 7;
  const iconGap    = showIcon ? 5 : 0;


  const labelTW  = showLabel ? labelText : '';
  const fullText = labelTW + countStr;
  const fullTextW = tw(fullText, fontSize);
  const iconW     = showIcon ? iconSize : 0;

    // ==============================
  // VISUAL NEON DO CONTADOR
  // ==============================

  const width = 520;
  const height = 190;

  const centerX = width / 2;
  const centerY = 105;

  const segments = 12;
  const activeSegments = Math.min(segments, rawCount);

  let gauge = '';

  for (let i = 0; i < segments; i++) {
    const angle = 200 + (160 / (segments - 1)) * i;

    const rad = angle * Math.PI / 180;

    const x1 = centerX + Math.cos(rad) * 125;
    const y1 = centerY + Math.sin(rad) * 125;

    const x2 = centerX + Math.cos(rad) * 150;
    const y2 = centerY + Math.sin(rad) * 150;

    const active = i < activeSegments;

    gauge += `
      <line
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
        stroke="${active ? '#b56cff' : '#332044'}"
        stroke-width="6"
        stroke-linecap="round"
        opacity="${active ? '1' : '0.65'}"
      />`;
  }

  const svgContent = `
    <defs>

      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <linearGradient id="purpleGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%">
        <stop offset="0%" stop-color="#7a3cff"/>
        <stop offset="50%" stop-color="#c77dff"/>
        <stop offset="100%" stop-color="#7a3cff"/>
      </linearGradient>

    </defs>

    <!-- Fundo -->
    <rect
      x="2"
      y="2"
      width="${width - 4}"
      height="${height - 4}"
      rx="18"
      fill="#0d0b12"
      stroke="#29183d"
      stroke-width="2"
    />

    <!-- Linha superior -->
    <line
      x1="35"
      y1="25"
      x2="175"
      y2="25"
      stroke="url(#purpleGradient)"
      stroke-width="2"
      opacity="0.8"
    />

    <line
      x1="${width - 175}"
      y1="25"
      x2="${width - 35}"
      y2="25"
      stroke="url(#purpleGradient)"
      stroke-width="2"
      opacity="0.8"
    />

    <!-- Brilho da linha -->
    <line
      x1="35"
      y1="25"
      x2="175"
      y2="25"
      stroke="#b56cff"
      stroke-width="4"
      opacity="0.25"
      filter="url(#glow)"
    />

    <line
      x1="${width - 175}"
      y1="25"
      x2="${width - 35}"
      y2="25"
      stroke="#b56cff"
      stroke-width="4"
      opacity="0.25"
      filter="url(#glow)"
    />

    <!-- Arco segmentado -->
    <g filter="url(#glow)">
      ${gauge}
    </g>

    <!-- Olho -->
    <g transform="translate(${centerX - 18}, 55) scale(1.5)">
      <path
        d="${eyePath}"
        fill="none"
        stroke="#c77dff"
        stroke-width="1.5"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        fill="#c77dff"
      />
    </g>

    <!-- Número -->
    <text
      x="${centerX}"
      y="128"
      text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="38"
      font-weight="700"
      fill="#ffffff"
    >
      ${countStr}
    </text>

    <!-- Label -->
    <text
      x="${centerX}"
      y="153"
      text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="11"
      font-weight="600"
      letter-spacing="3"
      fill="#b56cff"
    >
      VISUALIZAÇÕES DO PERFIL
    </text>

    <!-- Linha inferior -->
    <line
      x1="115"
      y1="169"
      x2="405"
      y2="169"
      stroke="url(#purpleGradient)"
      stroke-width="1.5"
      opacity="0.7"
    />

    <!-- Pequenos detalhes laterais -->
    <circle
      cx="95"
      cy="169"
      r="2"
      fill="#b56cff"
    />

    <circle
      cx="425"
      cy="169"
      r="2"
      fill="#b56cff"
    />
  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  res.send(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
    >
      ${svgContent}
    </svg>
  `);
};
