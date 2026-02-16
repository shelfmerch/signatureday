
import React from 'react';
import { AdminOrdersProvider } from '@/components/admin/AdminOrdersContext';
import { OrdersTable } from '@/components/admin/OrdersTable';
import { OrderFilters } from '@/components/admin/OrderFilters';
import { OrderTabs } from '@/components/admin/OrderTabs';
import { OrderDetailPanel } from '@/components/admin/OrderDetailPanel';
import { useAdminOrders } from '@/components/admin/AdminOrdersContext';

const AdminOrdersContent: React.FC = () => {
  const { activeTab } = useAdminOrders();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b bg-background p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order Management</h1>
            <p className="text-muted-foreground">Manage and process customer orders</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <OrderTabs />

      {/* Main Content - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab ? (
          <OrderDetailPanel orderId={activeTab} />
        ) : (
          <div className="p-6 space-y-6">
            <OrderFilters />
            <OrdersTable />
          </div>
        )}
      </div>
    </div>
  );
};

const AdminOrders: React.FC = () => {
  return (
    <AdminOrdersProvider>
      <AdminOrdersContent />
    </AdminOrdersProvider>
  );
};

export default AdminOrders;