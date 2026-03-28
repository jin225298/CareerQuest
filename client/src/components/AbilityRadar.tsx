import { useMemo } from 'react';

interface AbilityRadarProps {
  dimensions: {
    expression: number;
    logic: number;
    professional: number;
    adaptability: number;
    emotion: number;
  };
  size?: number;
}

const LABELS = ['表达能力', '逻辑思维', '专业能力', '应变能力', '情绪管理'];

export function AbilityRadar({ dimensions, size = 200 }: AbilityRadarProps) {
  const values = useMemo(() => [
    dimensions.expression,
    dimensions.logic,
    dimensions.professional,
    dimensions.adaptability,
    dimensions.emotion,
  ], [dimensions]);

  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size / 2 - 30;
  
  const getPoint = (index: number, value: number) => {
    const angle = (index * 72 - 90) * (Math.PI / 180);
    const radius = (value / 100) * maxRadius;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  const points = values.map((v, i) => getPoint(i, v));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} className="mx-auto">
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
          <stop offset="100%" stopColor="rgba(147, 51, 234, 0.3)" />
        </linearGradient>
      </defs>

      {[20, 40, 60, 80, 100].map((level) => {
        const radius = (level / 100) * maxRadius;
        return (
          <circle
            key={level}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="rgba(75, 85, 99, 0.3)"
            strokeWidth="1"
          />
        );
      })}

      {values.map((_, i) => {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        const endX = centerX + maxRadius * Math.cos(angle);
        const endY = centerY + maxRadius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={endX}
            y2={endY}
            stroke="rgba(75, 85, 99, 0.3)"
            strokeWidth="1"
          />
        );
      })}

      <path
        d={pathD}
        fill="url(#radarGradient)"
        stroke="rgb(59, 130, 246)"
        strokeWidth="2"
      />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="rgb(59, 130, 246)"
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {LABELS.map((label, i) => {
        const angle = (i * 72 - 90) * (Math.PI / 180);
        const labelRadius = maxRadius + 20;
        const x = centerX + labelRadius * Math.cos(angle);
        const y = centerY + labelRadius * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-gray-300 text-xs"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
