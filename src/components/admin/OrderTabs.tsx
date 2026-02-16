import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminOrders } from './AdminOrdersContext';

export const OrderTabs: React.FC = () => {
  const { openTabs, activeTab, setActiveTab, closeOrderTab } = useAdminOrders();

  if (openTabs.length === 0) return null;

  return (
    <div className="border-b bg-muted/30">
      <div className="flex items-center space-x-1 px-4">
        {openTabs.map((orderId) => (
          <div
            key={orderId}
            className={`flex items-center space-x-2 px-3 py-2 text-sm border-b-2 cursor-pointer ${
              activeTab === orderId
                ? 'border-primary bg-background text-foreground'
                : 'border-transparent hover:bg-muted/50'
            }`}
            onClick={() => setActiveTab(orderId)}
          >
            <span>{orderId}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.stopPropagation();
                closeOrderTab(orderId);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};