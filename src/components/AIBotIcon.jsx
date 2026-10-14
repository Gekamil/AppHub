export default function AIBotIcon({
  className = "w-6 h-6",
  size = 160,
  showBackground = true,
  primaryColor = "#2563EB",
  secondaryColor = "#3B82F6",
  accentColor = "#60A5FA",
  visorFill = "#EFF6FF",
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={showBackground ? "0 0 160 160" : "20 18 120 120"}
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      <defs>
        {/* Sombra sutil y limpia para el contenedor blanco elevado */}
        <filter id="botWhiteShadow" x="-20%" y="-15%" width="140%" height="145%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.08" />
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.04" />
        </filter>

        {/* Gradiente sutil para la silueta del visor */}
        <linearGradient id="visorSilhouette" x1="45" y1="52" x2="115" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#EFF6FF" />
        </linearGradient>
      </defs>

      {/* Contenedor Base Squircle: Fondo Blanco con Silueta / Bisel Suave */}
      {showBackground && (
        <>
          <rect
            x="22"
            y="20"
            width="116"
            height="116"
            rx="34"
            fill="#FFFFFF"
            className="dark:fill-[#161b26]"
            filter="url(#botWhiteShadow)"
          />
          <rect
            x="22.5"
            y="20.5"
            width="115"
            height="115"
            rx="33.5"
            stroke="#E2E8F0"
            className="dark:stroke-slate-700/80"
            strokeWidth="1.5"
          />
        </>
      )}

      {/* Robot / AI Entity Emblem en Silueta Azul Cobalto Focus Hub - Proporción Ampliada y Destacada */}
      <g transform={showBackground ? "translate(80, 83) scale(1.3)" : "translate(80, 83) scale(1.35)"}>
        {/* Antena / Sensor Neural Superior en Azul */}
        <line x1="0" y1="-32" x2="0" y2="-21" stroke={primaryColor} strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-34" r="4" fill={primaryColor} />
        <circle cx="0" cy="-34" r="7" stroke={accentColor} strokeWidth="1.2" strokeOpacity="0.6" />

        {/* Cabeza del Bot: Silueta contorneada con trazo de precisión en Azul */}
        <rect
          x="-31"
          y="-21"
          width="62"
          height="46"
          rx="15"
          fill="#FFFFFF"
          className="dark:fill-[#1e2433]"
          stroke={primaryColor}
          strokeWidth="3.2"
        />

        {/* Auriculares / Nodos laterales del robot */}
        <rect x="-36" y="-10" width="5.5" height="18" rx="2.75" fill={secondaryColor} />
        <rect x="30.5" y="-10" width="5.5" height="18" rx="2.75" fill={secondaryColor} />

        {/* Visor Inteligente en fondo azul pálido suave con contorno cobalto */}
        <rect
          x="-23"
          y="-14"
          width="46"
          height="24"
          rx="8"
          fill="url(#visorSilhouette)"
          className="dark:fill-slate-800"
          stroke={primaryColor}
          strokeWidth="1.8"
        />

        {/* Ojos / Sensores de IA en azul profundo con brillo especular blanco */}
        {/* Ojo Izquierdo */}
        <circle cx="-11" cy="-2" r="4.5" fill={primaryColor} />
        <circle cx="-9.8" cy="-3.2" r="1.8" fill="#FFFFFF" />

        {/* Ojo Derecho */}
        <circle cx="11" cy="-2" r="4.5" fill={primaryColor} />
        <circle cx="12.2" cy="-3.2" r="1.8" fill="#FFFFFF" />

        {/* Indicador de procesamiento / sonrisa geométrica minimalista */}
        <path
          d="M-6 16 Q0 19.5 6 16"
          stroke={primaryColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  )
}
