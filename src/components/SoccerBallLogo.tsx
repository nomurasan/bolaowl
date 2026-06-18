import React from "react";

interface SoccerBallLogoProps {
  className?: string;
}

export default function SoccerBallLogo({ className = "w-12 h-12" }: SoccerBallLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} filter drop-shadow-[0_3px_6px_rgba(59,130,246,0.35)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Sphere base gradient */}
        <radialGradient id="sphere-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>

        {/* Glossy White Panel Gradient */}
        <radialGradient id="panel-white" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="80%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>

        {/* 3D Blue Panel Gradient */}
        <radialGradient id="panel-blue" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="65%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>

        {/* Sphere 3D shading overlay */}
        <radialGradient id="sphere-shade" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0.6" />
        </radialGradient>

        {/* Clipping path to keep ball circular */}
        <clipPath id="ball-clip">
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>

      {/* Outer border/glow */}
      <circle cx="50" cy="50" r="47" fill="#0f172a" stroke="#4e94d8" strokeWidth="1.5" />

      {/* Clipped ball panels */}
      <g clipPath="url(#ball-clip)">
        <circle cx="50" cy="50" r="47" fill="url(#sphere-grad)" />

        {/* Center Pentagon (Blue) */}
        <polygon
          points="50,38 61.5,46.5 57,59 43,59 38.5,46.5"
          fill="url(#panel-blue)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Top white hexagon */}
        <polygon
          points="50,14 62,22.5 61.5,37 50,38 38.5,37 38,22.5"
          fill="url(#panel-white)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Top-Right blue hexagon */}
        <polygon
          points="62,22.5 78,14 88,26.5 78.5,40.5 61.5,37"
          fill="url(#panel-blue)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bottom-Right white hexagon */}
        <polygon
          points="61.5,46.5 78.5,40.5 84,55 74.5,69 57,59"
          fill="url(#panel-white)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bottom blue hexagon */}
        <polygon
          points="57,59 74.5,69 68.5,85 50,87.5 31.5,85 43,59"
          fill="url(#panel-blue)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bottom-Left white hexagon */}
        <polygon
          points="43,59 31.5,85 16,85 25.5,69 38.5,46.5"
          fill="url(#panel-white)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Top-Left blue hexagon */}
        <polygon
          points="38.5,37 38,22.5 22,14 12,26.5 21.5,40.5"
          fill="url(#panel-blue)"
          stroke="#0f172a"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Exterior border fill panels (white and blue edges) */}
        <polygon points="22,14 50,2 78,14 62,22.5 50,14 38,22.5" fill="url(#panel-white)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="78,14 96,17.5 98,33.5 88,26.5" fill="url(#panel-white)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="88,26.5 98,33.5 96.5,51 78.5,40.5" fill="url(#panel-blue)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="78.5,40.5 96.5,51 89.5,71 74.5,69" fill="url(#panel-blue)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="74.5,69 89.5,71 80,87.5 68.5,85" fill="url(#panel-white)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="31.5,85 20,87.5 10.5,71 25.5,69" fill="url(#panel-white)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="21.5,40.5 10.5,71 3.5,51 12,26.5" fill="url(#panel-blue)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="22,14 12,26.5 2,33.5 4,17.5" fill="url(#panel-white)" stroke="#0f172a" strokeWidth="0.8" />
        <polygon points="22,14 4,17.5 10.5,2" fill="url(#panel-blue)" stroke="#0f172a" strokeWidth="0.8" />

        {/* 3D Glossy Light Reflection & shadow Overlay */}
        <circle cx="50" cy="50" r="47" fill="url(#sphere-shade)" pointerEvents="none" />
      </g>
    </svg>
  );
}
