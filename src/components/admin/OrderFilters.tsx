import React from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdminOrders } from './AdminOrdersContext';
import { ordersApi } from '@/lib/api';
import { toast } from 'sonner';

export const OrderFilters: React.FC = () => {
  const {
    filters,
    setFilters,
    selectedOrders,
    setSelectedOrders,
    refreshOrders
  } = useAdminOrders();

  const handleSearchChange = (search: string) => {
    setFilters({ ...filters, search });
  };

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      const { status: _, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ ...filters, status });
    }
  };

  const handlePaidFilter = (paid: string) => {
    if (paid === 'all') {
      const { paid: _, ...rest } = filters;
      setFilters(rest);
    } else {
      setFilters({ ...filters, paid: paid === 'paid' });
    }
  };

  const handleBulkExport = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to export');
      return;
    }

    try {
      const blob = await ordersApi.exportOrders(selectedOrders);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Orders exported successfully');
      setSelectedOrders([]);
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key as keyof typeof filters] !== undefined && 
    filters[key as keyof typeof filters] !== ''
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-80"
            />
          </div>

          <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.paid === undefined ? 'all' : filters.paid ? 'paid' : 'unpaid'} 
            onValueChange={handlePaidFilter}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedOrders.length > 0 && (
            <Button onClick={handleBulkExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Selected ({selectedOrders.length})
            </Button>
          )}
          <Button onClick={refreshOrders} variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};