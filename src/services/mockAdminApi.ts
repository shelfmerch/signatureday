import { Order, AdminMember, OrderFilters } from '@/types/admin';

// Mock data generator
const generateMockOrder = (id: string): Order => {
  const statuses = ['new', 'in_progress', 'ready', 'shipped'] as const;
  const templates = ['square', 'hexagonal'] as const;
  
  const memberCount = Math.floor(Math.random() * 40) + 10; // 10-50 members
  const members: AdminMember[] = Array.from({ length: memberCount }, (_, i) => ({
    id: `member-${id}-${i}`,
    name: `Student ${i + 1}`,
    memberRollNumber: `${new Date().getFullYear()}CS${String(i + 1).padStart(3, '0')}`,
    photo: `https://picsum.photos/200/200?random=${id}-${i}`,
    vote: templates[Math.floor(Math.random() * templates.length)],
    joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));

  return {
    id,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    paid: Math.random() > 0.3,
    paymentId: Math.random() > 0.3 ? `pay_${Math.random().toString(36).substr(2, 9)}` : undefined,
    paidAt: Math.random() > 0.3 ? new Date().toISOString() : undefined,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    description: `Batch of ${new Date().getFullYear()} Computer Science Department`,
    gridTemplate: templates[Math.floor(Math.random() * templates.length)],
    members,
    shipping: {
      name: `John Doe ${id}`,
      phone: '+91 9876543210',
      email: `customer${id}@example.com`,
      line1: `${Math.floor(Math.random() * 999) + 1} Main Street`,
      line2: 'Apt 2B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India'
    },
    settings: {
      widthPx: 2550, // 8.5" at 300 DPI
      heightPx: 3300, // 11" at 300 DPI
      keepAspect: true,
      gapPx: 4,
      cellScale: 1.0,
      dpi: 300
    }
  };
};

// Generate mock orders
const mockOrders: Order[] = Array.from({ length: 25 }, (_, i) => 
  generateMockOrder(`ORD-${String(i + 1).padStart(4, '0')}`)
);

export const mockAdminApi = {
  async getOrders(filters: OrderFilters = {}, page = 1, pageSize = 10): Promise<{ orders: Order[], total: number }> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    let filteredOrders = [...mockOrders];
    
    // Apply filters
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }
    
    if (filters.paid !== undefined) {
      filteredOrders = filteredOrders.filter(order => order.paid === filters.paid);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.id.toLowerCase().includes(search) ||
        order.shipping.name.toLowerCase().includes(search) ||
        order.shipping.email?.toLowerCase().includes(search)
      );
    }
    
    // Pagination
    const start = (page - 1) * pageSize;
    const paginatedOrders = filteredOrders.slice(start, start + pageSize);
    
    return {
      orders: paginatedOrders,
      total: filteredOrders.length
    };
  },

  async getOrder(id: string): Promise<Order | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockOrders.find(order => order.id === id) || null;
  },

  async createOrder(order: Order): Promise<Order> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Prepend to list for visibility
    mockOrders.unshift(order);
    return order;
  },

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const orderIndex = mockOrders.findIndex(order => order.id === id);
    if (orderIndex === -1) return null;
    
    mockOrders[orderIndex] = { ...mockOrders[orderIndex], ...updates, updatedAt: new Date().toISOString() };
    return mockOrders[orderIndex];
  },

  async exportOrders(orderIds: string[]): Promise<Blob> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const orders = mockOrders.filter(order => orderIds.includes(order.id));
    const csvContent = [
      'Order ID,Customer Name,Status,Paid,Created At,Member Count',
      ...orders.map(order => 
        `${order.id},${order.shipping.name},${order.status},${order.paid},${order.createdAt},${order.members.length}`
      )
    ].join('\n');
    
    return new Blob([csvContent], { type: 'text/csv' });
  }
};