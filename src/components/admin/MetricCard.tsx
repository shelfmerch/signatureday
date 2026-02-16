import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  percentChange?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  loading?: boolean;
  subtitle?: string;
}

export const MetricCard = ({
  title,
  value,
  unit = '',
  percentChange,
  trend,
  icon: Icon,
  loading = false,
  subtitle,
}: MetricCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' && unit === '₹'
            ? `₹${value.toLocaleString('en-IN')}`
            : typeof value === 'number'
            ? value.toLocaleString('en-IN')
            : value}
          {unit && unit !== '₹' && <span className="text-lg ml-1">{unit}</span>}
        </div>
        {(percentChange !== undefined || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {percentChange !== undefined && TrendIcon && (
              <>
                <TrendIcon className={`h-3 w-3 ${getTrendColor()}`} />
                <span className={`text-xs font-medium ${getTrendColor()}`}>
                  {percentChange > 0 ? '+' : ''}
                  {percentChange.toFixed(1)}%
                </span>
              </>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
