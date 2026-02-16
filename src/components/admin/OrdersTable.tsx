
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Eye, Edit3, Download, Check, X, Trash2, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminOrders } from './AdminOrdersContext';
import { Order } from '@/types/admin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TablePagination } from '@/components/admin/TablePagination';
import { ordersApi } from '@/lib/api';
import { toast } from 'sonner';

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800';
    case 'ready': return 'bg-green-100 text-green-800';
    case 'shipped': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const OrdersTable: React.FC = () => {
  const {
    orders,
    orderCount,
    selectedOrders,
    setSelectedOrders,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    updateOrderStatus,
    openOrderTab,
    loading,
    deleteOrder,
    refreshOrders,
  } = useAdminOrders();

  const [reRenderingOrders, setReRenderingOrders] = useState<Set<string>>(new Set());

  const handleReRender = async (orderId: string) => {
    setReRenderingOrders(prev => new Set(prev).add(orderId));
    try {
      await ordersApi.ensureRender(orderId, true);
      toast.success('Re-render job queued');
      refreshOrders();
    } catch (e: any) {
      toast.error(e.message || 'Failed to re-render');
    } finally {
      setReRenderingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleStatusChange = (orderId: string, status: Order['status']) => {
    updateOrderStatus(orderId, status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.shipping.name}</div>
                    <div className="text-sm text-muted-foreground">{order.shipping.email}</div>
                  </div>
                </TableCell>
                <TableCell>{order.members.length}</TableCell>
                <TableCell>
                  {order.centerVariantsStatus === 'failed' ? (
                    <span className="text-sm text-destructive" title="Generation failed">Failed</span>
                  ) : order.centerVariantsStatus === 'queued' || order.centerVariantsStatus === 'processing' ? (
                    <span className="text-sm text-amber-600">
                      {order.centerVariantsDone ?? 0}/{order.centerVariantsTotal || '…'}
                    </span>
                  ) : typeof order.centerVariantsTotal === 'number' && order.centerVariantsTotal > 0 ? (
                    <span className="text-sm text-muted-foreground">
                      {order.centerVariantsDone ?? 0}/{order.centerVariantsTotal}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(value: Order['status']) => handleStatusChange(order.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <Badge className={getStatusColor(order.status)} variant="secondary">
                        <SelectValue />
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {order.paid ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className={order.paid ? 'text-green-600' : 'text-red-600'}>
                      {order.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openOrderTab(order.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Order</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReRender(order.id)}
                            disabled={reRenderingOrders.has(order.id) || order.centerVariantsStatus === 'processing' || order.centerVariantsStatus === 'queued'}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <RefreshCw className={`h-4 w-4 ${reRenderingOrders.has(order.id) ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {order.centerVariantsStatus === 'processing' || order.centerVariantsStatus === 'queued' 
                            ? 'Render in progress' 
                            : 'Re-render Variants'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Order</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete order {order.id}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the order and remove its data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteOrder(order.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        total={orderCount}
        onPageChange={(page, newPageSize) => {
          setCurrentPage(page);
          if (newPageSize != null) setPageSize(newPageSize);
        }}
        pageSizeOptions={[10, 20, 50]}
        itemLabel="orders"
      />
    </div>
  );
};
