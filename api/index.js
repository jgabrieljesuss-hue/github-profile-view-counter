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

    const eyePath = `M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z`;

  const labelTW  = showLabel ? labelText : '';
  const fullText = labelTW + countStr;
  const fullTextW = tw(fullText, fontSize);
  const iconW     = showIcon ? iconSize : 0;

  // ==============================
  // VISUAL NEON DO CONTADOR - V2
  // ==============================

  const width = 420;
  const height = 160;

  const centerX = width / 2;

  // Centro do arco
  const gaugeCenterY = 148;

  // Arco semicircular superior
  const segments = 14;
  const startAngle = 200;
  const endAngle = 340;

  const outerRadius = 132;
  const innerRadius = 108;

  // Quantidade de segmentos acesos
  const activeSegments = Math.min(segments, rawCount);

  let gauge = '';

  for (let i = 0; i < segments; i++) {
    const angle =
      startAngle +
      ((endAngle - startAngle) / (segments - 1)) * i;

    const rad = angle * Math.PI / 180;

    const x1 =
      centerX +
      Math.cos(rad) * innerRadius;

    const y1 =
      gaugeCenterY +
      Math.sin(rad) * innerRadius;

    const x2 =
      centerX +
      Math.cos(rad) * outerRadius;

    const y2 =
      gaugeCenterY +
      Math.sin(rad) * outerRadius;

    const active = i < activeSegments;

    gauge += `
      <line
        x1="${x1}"
        y1="${y1}"
        x2="${x2}"
        y2="${y2}"
        stroke="${active ? '#b56cff' : '#321d48'}"
        stroke-width="7"
        stroke-linecap="round"
        opacity="${active ? '1' : '0.45'}"
        ${active ? 'filter="url(#glow)"' : ''}
      />
    `;
  }

  const svgContent = `
    <defs>

      <!-- Brilho neon -->
      <filter id="glow"
              x="-100%"
              y="-100%"
              width="300%"
              height="300%">

        <feGaussianBlur
          stdDeviation="4"
          result="blur"/>

        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>

      </filter>

      <!-- Gradiente roxo -->
      <linearGradient
        id="purpleGradient"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="0%">

        <stop
          offset="0%"
          stop-color="#7a3cff"/>

        <stop
          offset="50%"
          stop-color="#d18aff"/>

        <stop
          offset="100%"
          stop-color="#7a3cff"/>

      </linearGradient>

    </defs>


    <!-- FUNDO -->

    <rect
      x="2"
      y="2"
      width="${width - 4}"
      height="${height - 4}"
      rx="20"
      fill="#0c0911"
      stroke="#321d48"
      stroke-width="2"
    />


    <!-- LINHAS SUPERIORES -->

    <line
      x1="35"
      y1="25"
      x2="180"
      y2="25"
      stroke="url(#purpleGradient)"
      stroke-width="2"
      opacity="0.8"
    />

    <line
      x1="${width - 180}"
      y1="25"
      x2="${width - 35}"
      y2="25"
      stroke="url(#purpleGradient)"
      stroke-width="2"
      opacity="0.8"
    />


    <!-- PEQUENOS DETALHES NAS EXTREMIDADES -->

    <circle
      cx="32"
      cy="25"
      r="2"
      fill="#b56cff"
      filter="url(#glow)"
    />

    <circle
      cx="${width - 32}"
      cy="25"
      r="2"
      fill="#b56cff"
      filter="url(#glow)"
    />


    <!-- ARCO NEON -->

    <g>
      ${gauge}
    </g>


    <!-- OLHO -->

    <g
      transform="
        translate(${centerX - 17}, 69)
        scale(1.4)
      "
      filter="url(#softGlow)"
    >

    <filter id="softGlow"
        x="-100%"
        y="-100%"
        width="300%"
        height="300%">

  <feGaussianBlur
    stdDeviation="2"
    result="blur"/>

  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>

</filter>

      <path
        d="${eyePath}"
        fill="none"
        stroke="#c77dff"
        stroke-width="1.6"
      />

      <circle
        cx="12"
        cy="12"
        r="3"
        fill="#c77dff"
      />

    </g>


    <!-- NÚMERO -->

    <text
      x="${centerX}"
      y="112"
      text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="36"
      font-weight="700"
      fill="#ffffff">

      ${countStr}

    </text>


    <!-- TÍTULO -->

    <text
      x="${centerX}"
      y="135"
      text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="9"
      font-weight="600"
      letter-spacing="2"
      fill="#b56cff">

      VISUALIZAÇÕES DO PERFIL

    </text>


    <!-- LINHA INFERIOR -->

    <line
      x1="120"
      y1="180"
      x2="400"
      y2="180"
      stroke="url(#purpleGradient)"
      stroke-width="1.5"
      opacity="0.75"
    />

    <circle
      cx="100"
      cy="180"
      r="2"
      fill="#b56cff"
      filter="url(#glow)"
    />

    <circle
      cx="420"
      cy="180"
      r="2"
      fill="#b56cff"
      filter="url(#glow)"
    />

  `;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader(
    'Cache-Control',
    'no-cache, no-store, must-revalidate'
  );

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
