
import React from 'react';
import { Member } from '@/context/CollageContext';
import { cn } from '@/lib/utils';

interface CircleGridProps {
  memberCount: number;
  members: Member[];
  size: 'small' | 'medium' | 'large' | 'xlarge';
}

export const CircleGrid: React.FC<CircleGridProps> = ({ 
  memberCount, 
  members, 
  size 
}) => {
  const sizeConfig = {
    small: { container: 'w-32 h-32', regular: 24, center: 48, baseRadius: 30 },
    medium: { container: 'w-48 h-48', regular: 32, center: 64, baseRadius: 45 },
    large: { container: 'w-64 h-64', regular: 40, center: 80, baseRadius: 60 },
    xlarge: { container: 'w-96 h-96', regular: 60, center: 120, baseRadius: 90 }
  };

  const config = sizeConfig[size];
  const centerIndex = Math.floor(memberCount / 2);
  const containerSize = size === 'xlarge' ? 384 : size === 'large' ? 256 : size === 'medium' ? 192 : 128;
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;

  // Calculate concentric ring positions
  const arrangeInRings = () => {
    const positions = [];
    let memberIndex = 0;
    
    // Center position
    if (memberIndex < memberCount) {
      positions.push({
        index: memberIndex,
        member: members[memberIndex],
        isCenter: true,
        x: centerX,
        y: centerY
      });
      memberIndex++;
    }
    
    // Concentric rings
    let ring = 1;
    while (memberIndex < memberCount) {
      const radius = ring * config.baseRadius;
      const remainingMembers = memberCount - memberIndex;
      const maxMembersInRing = Math.floor(2 * Math.PI * radius / (config.regular + 8));
      const membersInRing = Math.min(remainingMembers, maxMembersInRing);
      
      for (let i = 0; i < membersInRing && memberIndex < memberCount; i++) {
        const angle = (i / membersInRing) * 2 * Math.PI;
        
        positions.push({
          index: memberIndex,
          member: members[memberIndex],
          isCenter: false,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        });
        memberIndex++;
      }
      ring++;
    }
    
    return positions;
  };

  const positions = arrangeInRings();

  return (
    <div className={cn("relative bg-pink-50", config.container)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${containerSize} ${containerSize}`} className="absolute inset-0">
        {positions.map((pos, index) => (
          <g key={index}>
            <defs>
              <clipPath id={`circle-${index}`}>
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r={pos.isCenter ? config.center/2 : config.regular/2} 
                />
              </clipPath>
            </defs>
            
            <circle
              cx={pos.x}
              cy={pos.y}
              r={pos.isCenter ? config.center/2 : config.regular/2}
              fill={pos.member ? "#faf5ff" : "#f9fafb"}
              stroke={pos.member ? "#a855f7" : "#d1d5db"}
              strokeWidth="2"
              strokeDasharray={pos.member ? "none" : "5,5"}
            />
            
            {pos.member ? (
              <image
                href={pos.member.photo}
                x={pos.x - (pos.isCenter ? config.center/2 : config.regular/2)}
                y={pos.y - (pos.isCenter ? config.center/2 : config.regular/2)}
                width={pos.isCenter ? config.center : config.regular}
                height={pos.isCenter ? config.center : config.regular}
                clipPath={`url(#circle-${index})`}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                x={pos.x}
                y={pos.y}
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
