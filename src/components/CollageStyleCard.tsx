
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export type CollageStyle = 'hexagonal' | 'square' | 'circular';

interface CollageStyleCardProps {
  style: CollageStyle;
  label: string;
  isSelected: boolean;
  onSelect: (style: CollageStyle) => void;
  votes?: number;
  percentage?: number;
  showVoting?: boolean;
}

export const CollageStyleCard = ({
  style,
  label,
  isSelected,
  onSelect,
  votes = 0,
  percentage = 0,
  showVoting = false
}: CollageStyleCardProps) => {
  const renderPreview = () => {
    const baseClasses = "absolute border-2 border-primary bg-primary/5";
    
    switch (style) {
      case 'hexagonal':
        return (
          <div className="relative w-full h-32 flex items-center justify-center">
            {/* Center large hexagon */}
            <div 
              className={`${baseClasses} w-12 h-12`}
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            />
            {/* Surrounding hexagons */}
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const angle = (Math.PI / 3) * i;
              const x = 20 * Math.cos(angle);
              const y = 20 * Math.sin(angle);
              return (
                <div
                  key={i}
                  className={`${baseClasses} w-6 h-6`}
                  style={{
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                    transform: `translate(${x}px, ${y}px)`
                  }}
                />
              );
            })}
          </div>
        );
      
      case 'square':
        return (
          <div className="relative w-full h-32 flex items-center justify-center">
            <div className="grid grid-cols-4 gap-1 w-20 h-20">
              {[...Array(16)].map((_, i) => {
                const isCenter = (i === 5 || i === 6 || i === 9 || i === 10);
                if (isCenter && i === 5) {
                  return (
                    <div
                      key={i}
                      className={`${baseClasses} col-span-2 row-span-2`}
                      style={{ position: 'relative', gridColumn: '2 / 4', gridRow: '2 / 4' }}
                    />
                  );
                }
                if (isCenter) return <div key={i} />;
                return <div key={i} className={`${baseClasses} w-4 h-4`} />;
              })}
            </div>
          </div>
        );
      
      case 'circular':
        return (
          <div className="relative w-full h-32 flex items-center justify-center">
            {/* Center circle */}
            <div className={`${baseClasses} w-10 h-10 rounded-full`} />
            {/* Surrounding circles */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (Math.PI * 2 * i) / 8;
              const x = 18 * Math.cos(angle);
              const y = 18 * Math.sin(angle);
              return (
                <div
                  key={i}
                  className={`${baseClasses} w-5 h-5 rounded-full`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`
                  }}
                />
              );
            })}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md relative ${
        isSelected 
          ? 'ring-2 ring-primary bg-primary/5 border-primary' 
          : 'hover:border-primary/50'
      }`}
      onClick={() => onSelect(style)}
    >
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          {renderPreview()}
          
          <div className="space-y-1">
            <h4 className="font-medium text-sm">{label}</h4>
            
            {showVoting && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {votes} votes ({percentage}%)
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {isSelected && (
          <div className="absolute -top-2 -right-2">
            <div className="bg-primary rounded-full p-1">
              <CheckCircle className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};