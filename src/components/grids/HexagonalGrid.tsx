
import React from 'react';
import { Member } from '@/context/CollageContext';
import { cn } from '@/lib/utils';

interface HexagonalGridProps {
  memberCount: number;
  members: Member[];
  size: 'small' | 'medium' | 'large' | 'xlarge';
}

export const HexagonalGrid: React.FC<HexagonalGridProps> = ({ 
  memberCount, 
  members, 
  size 
}) => {
  const sizeConfig = {
    small: { container: 'w-32 h-32', regular: 24, center: 48 },
    medium: { container: 'w-48 h-48', regular: 32, center: 64 },
    large: { container: 'w-64 h-64', regular: 40, center: 80 },
    xlarge: { container: 'w-96 h-96', regular: 60, center: 120 }
  };

  const config = sizeConfig[size];
  const centerIndex = Math.floor(memberCount / 2);

  // Calculate hexagonal ring positions
  const getHexagonPosition = (index: number, ring: number, positionInRing: number) => {
    const centerX = size === 'xlarge' ? 192 : size === 'large' ? 128 : size === 'medium' ? 96 : 64;
    const centerY = size === 'xlarge' ? 192 : size === 'large' ? 128 : size === 'medium' ? 96 : 64;
    
    if (ring === 0) return { x: centerX, y: centerY };
    
    // Calculate ring spacing based on size
    const ringSpacing = size === 'xlarge' ? 20 : size === 'large' ? 16 : size === 'medium' ? 12 : 8;
    
    // Calculate radius with additional spacing between each ring
    const baseSpacing = config.regular + 8;
    const radius = (ring * baseSpacing) + (ring * ringSpacing);
    
    const angle = (positionInRing / (ring * 6)) * 2 * Math.PI;
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  // Arrange members in hexagonal pattern
  const arrangeMembers = () => {
    const positions = [];
    let memberIndex = 0;
    
    // Center position
    if (memberIndex < memberCount) {
      positions.push({
        index: memberIndex,
        member: members[memberIndex],
        isCenter: true,
        ...getHexagonPosition(memberIndex, 0, 0)
      });
      memberIndex++;
    }
    
    // Hexagonal rings
    let ring = 1;
    while (memberIndex < memberCount) {
      const membersInRing = ring * 6;
      for (let i = 0; i < membersInRing && memberIndex < memberCount; i++) {
        positions.push({
          index: memberIndex,
          member: members[memberIndex],
          isCenter: false,
          ...getHexagonPosition(memberIndex, ring, i)
        });
        memberIndex++;
      }
      ring++;
    }
    
    return positions;
  };

  const positions = arrangeMembers();

  const createHexagonPath = (isCenter: boolean) => {
    const size = isCenter ? config.center : config.regular;
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = (size / 2) * Math.cos(angle);
      const y = (size / 2) * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return `M ${points.join(' L ')} Z`;
  };

  return (
    <div className={cn(" relative bg-pink-50", config.container)}>
      <svg width="100%" height="100%" viewBox="0 0 284 284" className="absolute inset-0">
        {positions.map((pos, index) => (
          <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
            <defs>
              <clipPath id={`hexagon-${index}`}>
                <path d={createHexagonPath(pos.isCenter)} />
              </clipPath>
            </defs>
            
            <path
              d={createHexagonPath(pos.isCenter)}
              fill={pos.member ? "#faf5ff" : "#f9fafb"}
              stroke={pos.member ? "#a855f7" : "#d1d5db"}
              strokeWidth="2"
              strokeDasharray={pos.member ? "none" : "5,5"}
            />
            
            {pos.member ? (
              <image
                href={pos.member.photo}
                x={pos.isCenter ? -config.center/2 : -config.regular/2}
                y={pos.isCenter ? -config.center/2 : -config.regular/2}
                width={pos.isCenter ? config.center : config.regular}
                height={pos.isCenter ? config.center : config.regular}
                clipPath={`url(#hexagon-${index})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={pos.isCenter ? "14" : "12"}
                fill="#9ca3af"
                fontWeight="600"
              >
                {pos.index + 1}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
