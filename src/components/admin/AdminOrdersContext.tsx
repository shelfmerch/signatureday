
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminOrdersContextType, Order, OrderFilters } from '@/types/admin';
import { ordersApi } from '@/lib/api';

const AdminOrdersContext = createContext<AdminOrdersContextType | null>(null);

export const useAdminOrders = () => {
  const context = useContext(AdminOrdersContext);
  if (!context) {
    throw new Error('useAdminOrders must be used within AdminOrdersProvider');
  }
  return context;
};

export const AdminOrdersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  const fetchOrderCount = async () => {
    const result = await ordersApi.getOrderCount();
    setOrderCount(result.count);
  };

  const refreshOrders = async () => {
    setLoading(true);
    try {
      const result = await ordersApi.getOrders({
        ...filters,
        page: currentPage,
        limit: pageSize,
      });
      setOrders(result.orders as unknown as Order[]);
      if (typeof result.total === 'number') setOrderCount(result.total);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await ordersApi.deleteOrder(orderId);
      // Optimistically remove from local state
      setOrders(prev => prev.filter(o => o.id !== orderId));
      // Also remove from selections and open tabs if present
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
      setOpenTabs(prev => prev.filter(id => id !== orderId));
      if (activeTab === orderId) {
        setActiveTab(undefined);
      }
    } catch (error) {
      console.error('Failed to delete order:', error);
      // Fallback to refresh
      await refreshOrders();
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await ordersApi.updateOrder(orderId, { status });
      await refreshOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const updateOrderSettings = async (orderId: string, settings: Partial<Order['settings']>) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const updatedSettings = { ...order.settings, ...settings };
        await ordersApi.updateOrder(orderId, { settings: updatedSettings });
        
        // Update local state immediately for better UX
        setOrders(prev => prev.map(o => 
          o.id === orderId ? { ...o, settings: updatedSettings } : o
        ));
      }
    } catch (error) {
      console.error('Failed to update order settings:', error);
    }
  };

  const openOrderTab = (orderId: string) => {
    if (!openTabs.includes(orderId)) {
      setOpenTabs(prev => [...prev, orderId]);
    }
    setActiveTab(orderId);
  };

  const closeOrderTab = (orderId: string) => {
    setOpenTabs(prev => prev.filter(id => id !== orderId));
    if (activeTab === orderId) {
      const remainingTabs = openTabs.filter(id => id !== orderId);
      setActiveTab(remainingTabs[remainingTabs.length - 1]);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [filters, currentPage, pageSize]);

  const value: AdminOrdersContextType = {
    orders,
    orderCount,
    selectedOrders,
    filters,
    currentPage,
    pageSize,
    openTabs,
    activeTab,
    loading,
    setFilters,
    setSelectedOrders,
    setCurrentPage,
    setPageSize,
    updateOrderStatus,
    updateOrderSettings,
    fetchOrderCount,
    deleteOrder,
    openOrderTab,
    closeOrderTab,
    setActiveTab,
    refreshOrders
  };

  return (
    <AdminOrdersContext.Provider value={value}>
      {children}
    </AdminOrdersContext.Provider>
  );
};