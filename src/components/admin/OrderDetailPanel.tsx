import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Edit3, Save, Download, Package, User, CreditCard, Users, Eye, Settings, Grid, Edit, Upload, Layers, Type, Palette, ZoomIn, ZoomOut, Download as DownloadIcon, Hexagon, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CanvasElement } from '@/types/canvas';
import { Order } from '@/types/admin';
import { ordersApi } from '@/lib/api';
import { OrderGridPreview } from './OrderGridPreview';
import { EditorControls } from './EditorControls';
import { CenterVariantsModal } from './CenterVariantsModal';
import { useAdminOrders } from './AdminOrdersContext';
import { canGenerateVariants } from '@/utils/gridCenterUtils';
import { generateGridVariants } from '@/utils/gridVariantGenerator';
import { toast } from 'sonner';
import { CollageEditor } from './CollageEditor';
interface OrderDetailPanelProps {
  orderId: string;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({ orderId }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [preloadedVariants, setPreloadedVariants] = useState<any[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);
  const [fetchedVariants, setFetchedVariants] = useState<any[] | null>(null);
  const [fetchedRenderedImages, setFetchedRenderedImages] = useState<Record<string, string> | null>(null);
  const [fetchedHexagonalVariants, setFetchedHexagonalVariants] = useState<any[] | null>(null);
  const [fetchedHexagonalRenderedImages, setFetchedHexagonalRenderedImages] = useState<Record<string, string> | null>(null);
  const { updateOrderSettings, orders, refreshOrders } = useAdminOrders();
  const [activeSection, setActiveSection] = useState('text');
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  // Print at 300 DPI: 8.5" × 12" = 2550 × 3600 px (canvas); display scaled to 816×1152 for editing
  const CANVAS_DPI = 300;
  const [canvasSize, setCanvasSize] = useState({
    width: Math.round(8.5 * CANVAS_DPI),
    height: Math.round(12 * CANVAS_DPI),
  });
  const DISPLAY_SCALE = 96 / CANVAS_DPI; // scale 300-DPI canvas down for on-screen editing
  const [canvasHistory, setCanvasHistory] = useState<CanvasElement[][]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < canvasHistory.length - 1;

  // Tabs control
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'preview' | 'editor' | 'settings'>('overview');

  // Grid type toggle for preview
  const [previewGridType, setPreviewGridType] = useState<'square' | 'hexagonal'>('square');

  // Text editing helpers/state
  const [textContent, setTextContent] = useState('');
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const [textPresets, setTextPresets] = useState<{ id: string; name: string; style: Partial<CanvasElement['style']> & { fontSize?: number } }[]>(() => {
    try {
      const raw = localStorage.getItem('text-presets');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const selectedFirst = canvasElements.find(e => selectedElements.includes(e.id));

  useEffect(() => {
    if (!isTyping && selectedFirst?.type === 'text') {
      setTextContent(selectedFirst.content || '');
    }
  }, [selectedFirst?.id, selectedFirst?.content, isTyping]);

  const persistPresets = (items: typeof textPresets) => {
    setTextPresets(items);
    try { localStorage.setItem('text-presets', JSON.stringify(items)); } catch { }
  };

  const updateSelectedElements = (mutator: (el: CanvasElement) => CanvasElement) => {
    setCanvasElements(prev => prev.map(el => (selectedElements.includes(el.id) ? mutator(el) : el)));
  };

  const updateSelectedStyle = (style: Partial<CanvasElement['style']>) => {
    updateSelectedElements(el => ({ ...el, style: { ...el.style, ...style } }));
  };


  // Dragging state for canvas elements
  const [dragging, setDragging] = useState<{
    id: string;
    startMouse: { x: number; y: number };
    startPos: { x: number; y: number };
  } | null>(null);

  // Resizing state for canvas elements
  const [resizing, setResizing] = useState<{
    id: string;
    startMouse: { x: number; y: number };
    startSize: { w: number; h: number };
    startStyle: {
      fontSize?: number;
      letterSpacing?: number;
      lineHeight?: number;
    };
    handle: 'e' | 's' | 'se';
  } | null>(null);

  // Track whether the last mouse interaction moved enough to be considered a drag
  const dragMovedRef = React.useRef(false);

  const zoomRef = React.useRef(zoomLevel);
  useEffect(() => { zoomRef.current = zoomLevel; }, [zoomLevel]);

  // Ref to capture the rendered canvas DOM
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  // Start server-side render as soon as order is viewed, so images are ready when user clicks "Show Variants"
  const ensureRenderStartedRef = useRef<Set<string>>(new Set());
  // Ref to the inner design wrapper (only the elements area, excluding borders/toolbars)
  const designWrapperRef = useRef<HTMLDivElement | null>(null);

  // Draw roll-card elements with Canvas 2D so export matches editor exactly (no html2canvas).
  const drawRollCardToCanvas = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    elements: CanvasElement[],
  ) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);

    const isRollCard = (id: string) =>
      id.startsWith('el-name-') || id.startsWith('el-group-') || id.startsWith('el-roll-');
    const sorted = [...elements].filter((el) => isRollCard(el.id)).sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
      if (el.type !== 'text') continue;
      const content = (el.content || '').trim() || '';
      const text = el.style?.textTransform === 'uppercase' ? content.toUpperCase() : content;
      const lines = text.split('\n');
      const fontFamily = el.style?.fontFamily || 'Arial';
      const fontSize = (el.style?.fontSize ?? 16) as number;
      const fontWeight = el.style?.fontWeight || 'bold';
      const lineHeightVal = (el.style?.lineHeight ?? 1) as number;
      const align = (el.style?.textAlign || 'center') as CanvasTextAlign;
      const cx = el.x + el.width / 2;

      ctx.fillStyle = el.style?.color || '#000000';
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = align;
      ctx.globalAlpha = el.opacity ?? 1;

      const isRoll = el.id.startsWith('el-roll-');
      if (isRoll) {
        const lineCount = Math.max(lines.length, 1);
        const baseTextHeight = fontSize * lineCount * lineHeightVal;
        const sy = baseTextHeight > 0 ? (el.height / baseTextHeight) * 0.88 : 1;
        const sx = 1.25;
        ctx.save();
        ctx.translate(cx, el.y);
        ctx.scale(sx, sy);
        ctx.textBaseline = 'top';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], 0, i * fontSize * lineHeightVal);
        }
        ctx.restore();
      } else {
        ctx.textBaseline = 'middle';
        const totalBlockHeight = fontSize * lineHeightVal * lines.length;
        const startY = el.y + (el.height - totalBlockHeight) / 2 + (fontSize * lineHeightVal) / 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], cx, startY + i * fontSize * lineHeightVal);
        }
      }
      ctx.globalAlpha = 1;
    }
  };

  // Download: canvas is already 300 DPI; draw at canvas size and set PNG to 300 DPI.
  const handleDownload300DPI = () => {
    const w = canvasSize.width;
    const h = canvasSize.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawRollCardToCanvas(ctx, w, h, canvasElements);

    const addDpiToPng = (pngBlob: Blob, dpiVal: number): Promise<Blob> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as ArrayBuffer;
          const data = new Uint8Array(result);
          const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
          for (let i = 0; i < 8; i++) if (data[i] !== PNG_SIGNATURE[i]) { resolve(pngBlob); return; }
          const ppu = Math.round(dpiVal * 39.3701);
          const chunkType = new TextEncoder().encode('pHYs');
          const chunkData = new Uint8Array(9);
          const dv = new DataView(chunkData.buffer);
          dv.setUint32(0, ppu);
          dv.setUint32(4, ppu);
          chunkData[8] = 1;
          const lengthBytes = new Uint8Array(4);
          new DataView(lengthBytes.buffer).setUint32(0, 9);
          const crc32 = (buf: Uint8Array): number => {
            let c = 0xffffffff;
            for (let i = 0; i < buf.length; i++) {
              c ^= buf[i];
              for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
            }
            return (c ^ 0xffffffff) >>> 0;
          };
          const crcInput = new Uint8Array(4 + chunkData.length);
          crcInput.set(chunkType, 0);
          crcInput.set(chunkData, 4);
          const crcBytes = new Uint8Array(4);
          new DataView(crcBytes.buffer).setUint32(0, crc32(crcInput));
          const offset = 8;
          const length = new DataView(result, offset, 4).getUint32(0);
          const ihdrTotal = 4 + 4 + length + 4;
          const insertPos = 8 + ihdrTotal;
          const before = data.slice(0, insertPos);
          const after = data.slice(insertPos);
          const assembled = new Uint8Array(before.length + 4 + 4 + 9 + 4 + after.length);
          let p = 0;
          assembled.set(before, p); p += before.length;
          assembled.set(lengthBytes, p); p += 4;
          assembled.set(chunkType, p); p += 4;
          assembled.set(chunkData, p); p += 9;
          assembled.set(crcBytes, p); p += 4;
          assembled.set(after, p);
          resolve(new Blob([assembled], { type: 'image/png' }));
        };
        reader.readAsArrayBuffer(pngBlob);
      });
    };

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const withDpi = await addDpiToPng(blob, CANVAS_DPI);
      const url = URL.createObjectURL(withDpi);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'roll-card-300dpi.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // Guard to prevent history push during Undo/Redo programmatic sets
  const skipHistoryPushRef = useRef(false);

  // Seed history once on mount so first change enables Undo
  const historySeededRef = useRef(false);
  useEffect(() => {
    if (historySeededRef.current) return;
    const snapshot: CanvasElement[] = JSON.parse(JSON.stringify(canvasElements));
    setCanvasHistory([snapshot]);
    setHistoryIndex(0);
    historySeededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push canvas state to history on every change (unless skipped)
  useEffect(() => {
    if (skipHistoryPushRef.current) {
      skipHistoryPushRef.current = false;
      return;
    }
    const snapshot: CanvasElement[] = JSON.parse(JSON.stringify(canvasElements));
    setCanvasHistory((prev) => {
      // If we undid to a previous point then made a change, drop future history
      const trimmed = prev.slice(0, historyIndex + 1);
      const next = [...trimmed, snapshot];
      // Update index atomically with the history push
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [canvasElements]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (ev: MouseEvent) => {
      const viewScale = zoomRef.current * DISPLAY_SCALE;
      const dx = (ev.clientX - dragging.startMouse.x) / viewScale;
      const dy = (ev.clientY - dragging.startMouse.y) / viewScale;
      const nx = dragging.startPos.x + dx;
      const ny = dragging.startPos.y + dy;
      if (!dragMovedRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        dragMovedRef.current = true;
      }
      setCanvasElements(prev => prev.map(el => el.id === dragging.id ? { ...el, x: nx, y: ny } : el));
    };
    const handleUp = () => {
      setDragging(null);
      // allow container click to know a drag just occurred
      setTimeout(() => { dragMovedRef.current = false; }, 0);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp as any);
    };
  }, [dragging]);

  // Resizing handlers
  useEffect(() => {
    if (!resizing) return;
    const handleMove = (ev: MouseEvent) => {
      const viewScale = zoomRef.current * DISPLAY_SCALE;
      const dx = (ev.clientX - resizing.startMouse.x) / viewScale;
      const dy = (ev.clientY - resizing.startMouse.y) / viewScale;
      const sx = (resizing.startSize.w + dx) / Math.max(1, resizing.startSize.w);
      const sy = (resizing.startSize.h + dy) / Math.max(1, resizing.startSize.h);
      const scale = resizing.handle === 'e' ? sx : resizing.handle === 's' ? sy : Math.max(sx, sy);
      setCanvasElements(prev => prev.map(el => {
        if (el.id !== resizing.id) return el;
        let w = el.width;
        let h = el.height;
        if (resizing.handle === 'e' || resizing.handle === 'se') {
          w = Math.max(20, resizing.startSize.w + dx);
        }
        if (resizing.handle === 's' || resizing.handle === 'se') {
          h = Math.max(20, resizing.startSize.h + dy);
        }
        // Scale font properties proportionally for text elements
        const style = { ...(el.style || {}) } as any;
        if (typeof style.fontSize === 'number' || el.type === 'text') {
          const baseFont = resizing.startStyle.fontSize ?? style.fontSize ?? 16;
          const newFont = Math.max(6, Math.round(baseFont * scale));
          style.fontSize = newFont;
          if (resizing.startStyle.letterSpacing !== undefined || style.letterSpacing !== undefined) {
            const baseLS = resizing.startStyle.letterSpacing ?? (typeof style.letterSpacing === 'number' ? style.letterSpacing : 0);
            style.letterSpacing = Math.round(baseLS * scale * 100) / 100;
          }
          if (resizing.startStyle.lineHeight !== undefined || style.lineHeight !== undefined) {
            const baseLH = resizing.startStyle.lineHeight ?? (typeof style.lineHeight === 'number' ? style.lineHeight : undefined);
            if (typeof baseLH === 'number') {
              style.lineHeight = Math.round(baseLH * scale * 100) / 100;
            }
          }
        }
        return { ...el, width: w, height: h, style };
      }));
    };
    const handleUp = () => {
      setResizing(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp as any);
    };
  }, [resizing]);

  useEffect(() => {
    setLoading(true);
    const existing = orders.find(o => o.id === orderId) || null;
    if (existing) {
      setOrder(existing);
      setDescription(existing.description || '');
      setLoading(false);
      // Start render job immediately when order is loaded (so "Show Variants" has images ready)
      if (!ensureRenderStartedRef.current.has(existing.id)) {
        const { canGenerate } = canGenerateVariants(existing);
        if (canGenerate) {
          ensureRenderStartedRef.current.add(existing.id);
          ordersApi.ensureRender(existing.id).catch(() => { });
        }
      }
      // Preload variants only when order is paid
      if (existing.paid) preloadVariants(existing);
    } else {
      // Ensure orders are fetched; OrderDetailPanel relies on the shared context list
      Promise.resolve(refreshOrders()).finally(() => {
        const updated = orders.find(o => o.id === orderId) || null;
        if (updated) {
          setOrder(updated);
          setDescription(updated.description || '');
          // Start render job immediately when order is loaded
          if (!ensureRenderStartedRef.current.has(updated.id)) {
            const { canGenerate } = canGenerateVariants(updated);
            if (canGenerate) {
              ensureRenderStartedRef.current.add(updated.id);
              ordersApi.ensureRender(updated.id).catch(() => { });
            }
          }
          // Preload variants only when order is paid
          if (updated.paid) preloadVariants(updated);
        }
        setLoading(false);
      });
    }
  }, [orderId, orders]);

  // Preload variants in the background (only for paid orders)
  const preloadVariants = async (orderData: Order) => {
    if (!orderData || !orderData.paid || isPreloading) return;

    const { canGenerate } = canGenerateVariants(orderData);
    if (!canGenerate) return;

    try {
      setIsPreloading(true);
      const variants = await generateGridVariants(orderData);
      setPreloadedVariants(variants);
    } catch (error) {
      console.error('Failed to preload variants:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  const handleSaveDescription = async () => {
    if (order) {
      try {
        await ordersApi.updateOrder(order.id, { description });
        setOrder({ ...order, description });
        setEditingDescription(false);
        toast.success('Description updated successfully');
      } catch (error) {
        toast.error('Failed to update description');
      }
    }
  };

  const handleDownload = () => {
    // Trigger the existing download mechanism
    window.dispatchEvent(new CustomEvent('grid-template-download'));
  };

  const handleGenerateVariants = async () => {
    if (!order) return;

    const { canGenerate, reason } = canGenerateVariants(order);
    if (!canGenerate) {
      toast.error(reason || 'Cannot generate variants');
      return;
    }

    try {
      const res = await ordersApi.getCenterVariants(order.id);
      const hasSquare = res.variants?.length > 0 && res.renderedImages && Object.keys(res.renderedImages).length > 0;
      const hasHex = res.hexagonalVariants?.length > 0 && res.hexagonalRenderedImages && Object.keys(res.hexagonalRenderedImages).length > 0;
      
      if (hasSquare || hasHex) {
        setFetchedVariants(res.variants || []);
        setFetchedRenderedImages(res.renderedImages || {});
        setFetchedHexagonalVariants(res.hexagonalVariants || []);
        setFetchedHexagonalRenderedImages(res.hexagonalRenderedImages || {});
        setShowVariantsModal(true);
        return;
      }
    } catch (_) {
      // API may return empty or fail
    }

    if (order.paid) {
      toast.info('Variants are being generated. Check the Variants column for progress, or try again in a moment.');
      return;
    }

    setFetchedVariants(null);
    setFetchedRenderedImages(null);
    setFetchedHexagonalVariants(null);
    setFetchedHexagonalRenderedImages(null);
    setShowVariantsModal(true);
  };

  const handleVariantsSavedToBackend = () => {
    refreshOrders();
    if (order) {
      ordersApi.getOrder(order.id).then((o) => setOrder(o)).catch(() => { });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Order not found
      </div>
    );
  }

  const variantGenerationStatus = canGenerateVariants(order);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.id}</h1>
          <p className="text-muted-foreground">
            Created {format(new Date(order.createdAt), 'PPP')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={order.paid ? 'default' : 'destructive'}>
            {order.paid ? 'Paid' : 'Unpaid'}
          </Badge>
          <Badge variant="outline">{order.status}</Badge>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'overview' | 'members' | 'preview' | 'editor' | 'settings')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Members ({order.members.length})</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center space-x-2">
            <Edit className='h-4 w-4' />
            <span>Editor</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>

        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer & Shipping */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Customer Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{order.shipping.name}</h4>
                  <p className="text-sm text-muted-foreground">{order.shipping.email}</p>
                  <p className="text-sm text-muted-foreground">{order.shipping.phone}</p>
                </div>
                <div>
                  <h5 className="font-medium mb-1">Shipping Address</h5>
                  <address className="text-sm not-italic text-muted-foreground">
                    {order.shipping.line1}<br />
                    {order.shipping.line2 && <>{order.shipping.line2}<br /></>}
                    {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}<br />
                    {order.shipping.country}
                  </address>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Payment ID:</span>
                    <span className="font-mono text-sm">{order.paymentId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid At:</span>
                    <span>{order.paidAt ? format(new Date(order.paidAt), 'PPp') : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={order.paid ? 'default' : 'destructive'}>
                      {order.paid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>Order Description</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDescription(!editingDescription)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Order description..."
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleSaveDescription}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDescription(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm">{order.description || 'No description provided'}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Members ({order.members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Photo</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.members.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => {
                        // Navigate to editor
                        setActiveTab('editor');
                        setActiveSection('text');
                        // Layout at 300 DPI: name full width at top; group below; roll number fills rest of page (consistent heights for print)
                        const cw = canvasSize.width;
                        const ch = canvasSize.height;
                        const s = CANVAS_DPI / 96; // 300 DPI scale from 96-DPI design values
                        const marginH = Math.round(48 * s);
                        const fullW = cw - 2 * marginH;
                        const ts = Date.now();
                        const nameId = `el-name-${member.id}-${ts}`;
                        const rollId = `el-roll-${member.id}-${ts}`;
                        const groupId = `el-group-${member.id}-${ts}`;
                        const isMemberText = (el: CanvasElement) =>
                          el.id.startsWith('el-name-') || el.id.startsWith('el-roll-') || el.id.startsWith('el-group-');
                        setCanvasElements(p => {
                          const rest = p.filter(el => !isMemberText(el));
                          const baseZ = rest.length;
                          // Name: full width, large font (300 DPI)
                          const nameY = Math.round(72 * s);
                          let nameH = Math.round(100 * s);
                          const rawName = (member.name || 'Name').trim() || 'Name';
                          const compactLen = rawName.replace(/\s+/g, '').length;
                          let nameContent = rawName;
                          let nameFontSize: number;

                          if (compactLen > 18) {
                            const parts = rawName.split(/\s+/);
                            if (parts.length > 1) {
                              const splitAt = Math.ceil(parts.length / 2);
                              const firstLine = parts.slice(0, splitAt).join(' ');
                              const secondLine = parts.slice(splitAt).join(' ');
                              nameContent = `${firstLine}\n${secondLine}`;
                            }
                            nameFontSize = Math.round(56 * s);
                            nameH = Math.round(140 * s);
                          } else if (compactLen > 13) {
                            const nameBaseSize = Math.round(88 * s);
                            nameFontSize = Math.max(Math.round(56 * s), Math.floor(nameBaseSize * 13 / compactLen));
                          } else {
                            nameFontSize = Math.round(88 * s);
                          }
                          const gapAfterName = Math.round(36 * s);
                          const groupY = nameY + nameH + gapAfterName;
                          const groupH = Math.round(40 * s);
                          const gapAfterGroup = Math.round(1 * s);
                          const rollY = groupY + groupH + gapAfterGroup;
                          const rollH = ch - rollY - Math.round(8 * s); // rest of page for roll number (no cut-off)
                          const nameEl: CanvasElement = {
                            id: nameId,
                            type: 'text',
                            x: 0,
                            y: nameY,
                            width: cw,
                            height: nameH,
                            rotation: 0,
                            opacity: 1,
                            content: nameContent,
                            style: {
                              fontFamily: 'Arial',
                              fontSize: nameFontSize,
                              fontWeight: 'bold',
                              color: '#000000',
                              textAlign: 'center',
                              textTransform: 'uppercase',
                              letterSpacing: 0,
                            },
                            zIndex: baseZ,
                          };
                          const groupEl: CanvasElement = {
                            id: groupId,
                            type: 'text',
                            x: marginH,
                            y: groupY,
                            width: fullW,
                            height: groupH,
                            rotation: 0,
                            opacity: 1,
                            content: order.groupName || 'Group Name',
                            style: {
                              fontFamily: 'Arial',
                              fontSize: Math.round(56 * s),
                              fontWeight: 'bold',
                              color: '#000000',
                              textAlign: 'center',
                              textTransform: 'uppercase',
                              lineHeight: 1,
                            },
                            zIndex: baseZ + 1,
                          };
                          const rollRaw = (member.memberRollNumber || 'Roll No').trim() || 'Roll No';
                          let rollContent = rollRaw;
                          if (rollRaw.length > 4) {
                            const mid = Math.ceil(rollRaw.length / 2);
                            rollContent = `${rollRaw.slice(0, mid)}\n${rollRaw.slice(mid)}`;
                          }
                          const rollEl: CanvasElement = {
                            id: rollId,
                            type: 'text',
                            x: marginH,
                            y: rollY,
                            width: fullW,
                            height: rollH,
                            rotation: 0,
                            opacity: 1,
                            content: rollContent,
                            style: {
                              fontFamily: 'Arial',
                              fontSize: Math.round(160 * s),
                              fontWeight: 'bold',
                              color: '#000000',
                              textAlign: 'center',
                              textTransform: 'uppercase',
                              lineHeight: 1,
                            },
                            zIndex: baseZ + 2,
                          };
                          return [...rest, nameEl, groupEl, rollEl];
                        });
                        setSelectedElements([nameId, groupId, rollId]);
                        setTextContent(member.name || '');
                      }}
                    >
                      <TableCell>
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.memberRollNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{order.groupName ?? '—'}</TableCell>
                      <TableCell className="uppercase">{member.size ? member.size : '-'}</TableCell>
                      <TableCell>
                        {member.phone ? (
                          <span className="text-sm font-mono">{member.phone}</span>
                        ) : (
                          <span className="text-xs text-gray-400">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(member.joinedAt), 'MMM dd')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span>Grid Preview ({previewGridType})</span>
                  <div className="flex items-center rounded-lg border p-1">
                    <Button
                      variant={previewGridType === 'square' ? 'default' : 'ghost'}
                      size="sm"
                      className="flex items-center gap-1.5 px-3"
                      onClick={() => setPreviewGridType('square')}
                    >
                      <Square className="h-4 w-4" />
                      <span className="text-xs">Square</span>
                    </Button>
                    <Button
                      variant={previewGridType === 'hexagonal' ? 'default' : 'ghost'}
                      size="sm"
                      className="flex items-center gap-1.5 px-3"
                      onClick={() => setPreviewGridType('hexagonal')}
                    >
                      <Hexagon className="h-4 w-4" />
                      <span className="text-xs">Hexagon</span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Show render status indicator */}
                  {order.centerVariantsStatus === 'processing' && (
                    <span className="text-sm text-amber-600 flex items-center">
                      <span className="animate-pulse mr-1">●</span>
                      Rendering {order.centerVariantsDone ?? 0}/{order.centerVariantsTotal ?? '...'}
                    </span>
                  )}
                  {order.centerVariantsStatus === 'queued' && (
                    <span className="text-sm text-blue-600">Queued</span>
                  )}
                  {order.centerVariantsStatus === 'failed' && (
                    <span className="text-sm text-destructive flex items-center space-x-2">
                      <span>Failed</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await ordersApi.ensureRender(order.id, true);
                            toast.success('Render job re-queued');
                            refreshOrders();
                          } catch (e: any) {
                            toast.error(e.message || 'Failed to retry');
                          }
                        }}
                      >
                        Retry
                      </Button>
                    </span>
                  )}
                  {order.centerVariantsStatus === 'completed' && (order.centerVariantsDone ?? 0) > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await ordersApi.ensureRender(order.id, true);
                          toast.success('Re-render job queued');
                          refreshOrders();
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to re-render');
                        }
                      }}
                    >
                      Re-render
                    </Button>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            variant="outline"
                            onClick={handleGenerateVariants}
                            disabled={!variantGenerationStatus.canGenerate}
                            className="flex items-center space-x-2"
                          >
                            <Grid className="h-4 w-4" />
                            <span>Show Variants</span>
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!variantGenerationStatus.canGenerate && (
                        <TooltipContent>
                          <p>{variantGenerationStatus.reason}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <Button onClick={handleDownload}>
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderGridPreview order={order} gridType={previewGridType} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="space-y-6">
          <div className="h-[600px] grid lg:grid-cols-4 gap-3">
            {/* Left Sidebar */}
            <div className="lg:col-span-1 h-[calc(100vh-100px)] bg-background border-2 rounded-lg flex">
              {/* Navigation */}
              <div className="w-1/4 bg-muted/20 border-r border-border p-2">
                <div className="space-y-4">
                  {[
                    { id: 'uploads', label: 'Uploads', icon: Upload },
                    { id: 'elements', label: 'Elements', icon: Layers },
                    { id: 'text', label: 'Text', icon: Type },
                    { id: 'background', label: 'Background', icon: Palette },
                    { id: 'tools', label: 'Tools', icon: Settings },
                  ].map(({ id, label, icon: Icon }) => {
                    const isActive = activeSection === id;
                    return (
                      <Button
                        key={id}
                        variant={isActive ? 'default' : 'ghost'}
                        onClick={() => setActiveSection(id)}
                        className={`w-full mt-5 h-25 flex flex-col items-center gap-1 p-2 relative ${isActive ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white' : ''
                          }`}
                      >
                        <Icon className="w-16 h-16" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4">
                <div className="mb-4">
                  <h3 className="text-md font-semibold capitalize">{activeSection}</h3>
                </div>
                {(() => {
                  switch (activeSection) {
                    case 'uploads':
                      return (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Upload Media</h4>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Drag files here or click to browse</p>
                              <Button size="sm" className="mt-2">Choose Files</Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">File Types</h4>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">Images</Button>
                              <Button variant="outline" size="sm">SVGs</Button>
                              <Button variant="outline" size="sm">Videos</Button>
                            </div>
                          </div>
                        </div>
                      );

                    case 'text':
                      return (
                        <div className="space-y-5 overflow-y-auto h-[calc(100vh-200px)]">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Add Text</h4>
                            <div className="grid grid-cols-1 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  const el: CanvasElement = {
                                    id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'text',
                                    x: 500,
                                    y: 250,
                                    width: 320,
                                    height: 60,
                                    rotation: 0,
                                    opacity: 1,
                                    content: 'Add Name',
                                    style: {
                                      fontFamily: 'Arial',
                                      fontSize: 32,
                                      fontWeight: 'bold',
                                      color: '#111111',
                                      textAlign: 'left',
                                    },
                                    zIndex: canvasElements.length,
                                  };
                                  setCanvasElements(p => [...p, el]);
                                  setSelectedElements([el.id]);
                                }}
                              >
                                <span className="mr-2">T</span> Add Heading
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  const el: CanvasElement = {
                                    id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'text',
                                    x: 120,
                                    y: 160,
                                    width: 280,
                                    height: 48,
                                    rotation: 0,
                                    opacity: 1,
                                    content: 'Add Roll No',
                                    style: {
                                      fontFamily: 'Arial',
                                      fontSize: 24,
                                      fontWeight: '600',
                                      color: '#222222',
                                      textAlign: 'left',
                                    },
                                    zIndex: canvasElements.length,
                                  };
                                  setCanvasElements(p => [...p, el]);
                                  setSelectedElements([el.id]);
                                }}
                              >
                                <span className="mr-2">T</span> Add Subheading
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  const el: CanvasElement = {
                                    id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                    type: 'text',
                                    x: 140,
                                    y: 220,
                                    width: 360,
                                    height: 48,
                                    rotation: 0,
                                    opacity: 1,
                                    content: 'Add Body Text',
                                    style: {
                                      fontFamily: 'Arial',
                                      fontSize: 16,
                                      fontWeight: 'normal',
                                      color: '#333333',
                                      textAlign: 'left',
                                    },
                                    zIndex: canvasElements.length,
                                  };
                                  setCanvasElements(p => [...p, el]);
                                  setSelectedElements([el.id]);
                                }}
                              >
                                <span className="mr-2">T</span> Add Body Text
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Text Content</h4>
                            <div className="flex gap-2 items-center flex-nowrap">
                              <Input
                                className="flex-1 min-w-0"
                                placeholder="Enter your text..."
                                value={textContent}
                                onFocus={() => setIsTyping(true)}
                                onBlur={() => setIsTyping(false)}
                                onChange={(e) => setTextContent(e.target.value)}
                                ref={textInputRef}
                              />
                              <Button
                                className="shrink-0"
                                variant="outline"
                                size="sm"
                                onMouseDown={(e) => {
                                  // Prevent input blur before click, so isTyping stays true and textContent isn't reset
                                  e.preventDefault();
                                }}
                                onClick={() => {
                                  if (!selectedFirst) return;
                                  setCanvasElements(prev => prev.map(el => (
                                    el.id === selectedFirst.id ? { ...el, content: textContent } : el
                                  )));
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Font</div>
                              <select
                                className="w-full p-2 border rounded text-sm"
                                value={selectedFirst?.style?.fontFamily || 'Arial'}
                                onChange={(e) => updateSelectedStyle({ fontFamily: e.target.value })}
                              >
                                <option>Arial</option>
                                <option>Helvetica</option>
                                <option>Times New Roman</option>
                                <option>Montserrat</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Font Size</span>
                                <span>{selectedFirst?.style?.fontSize || 16}px</span>
                              </div>
                              <input
                                type="range"
                                min={8}
                                max={96}
                                value={selectedFirst?.style?.fontSize || 16}
                                onChange={(e) => updateSelectedStyle({ fontSize: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Styles</div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const active = selectedFirst?.style?.fontWeight === 'bold';
                                  updateSelectedStyle({ fontWeight: active ? 'normal' : 'bold' });
                                }}
                              >
                                B
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const active = selectedFirst?.style?.fontStyle === 'italic';
                                  updateSelectedStyle({ fontStyle: active ? 'normal' : 'italic' });
                                }}
                              >
                                I
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const active = selectedFirst?.style?.textDecoration === 'underline';
                                  updateSelectedStyle({ textDecoration: active ? 'none' : 'underline' });
                                }}
                              >
                                U
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Alignment</div>
                            <div className="grid grid-cols-4 gap-2">
                              {(['left', 'center', 'right', 'justify'] as const).map(al => (
                                <Button
                                  key={al}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSelectedStyle({ textAlign: al })}
                                >
                                  {al}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Color</div>
                            <div className="flex flex-wrap gap-2">
                              {['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#e11d48', '#10b981', '#f97316', '#111827']
                                .map(c => (
                                  <button
                                    key={c}
                                    className="w-6 h-6 rounded-full border"
                                    style={{ backgroundColor: c }}
                                    onClick={() => updateSelectedStyle({ color: c })}
                                  />
                                ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Letter Spacing</span>
                                <span>{selectedFirst?.style?.letterSpacing ?? 0}px</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={20}
                                step={0.5}
                                value={selectedFirst?.style?.letterSpacing ?? 0}
                                onChange={(e) => updateSelectedStyle({ letterSpacing: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Line Height</span>
                                <span>{selectedFirst?.style?.lineHeight ?? 1.2}</span>
                              </div>
                              <input
                                type="range"
                                min={0.8}
                                max={3}
                                step={0.1}
                                value={selectedFirst?.style?.lineHeight ?? 1.2}
                                onChange={(e) => updateSelectedStyle({ lineHeight: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Transform</div>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSelectedStyle({ textTransform: "uppercase" })}
                              >
                                AA
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSelectedStyle({ textTransform: "capitalize" })}
                              >
                                Aa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateSelectedStyle({ textTransform: "lowercase" })}
                              >
                                aa
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Effects</div>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const exists = !!selectedFirst?.style?.shadow;
                                  updateSelectedStyle(
                                    exists
                                      ? { shadow: undefined }
                                      : { shadow: { x: 1, y: 1, blur: 3, color: '#00000055' } }
                                  );
                                }}
                              >
                                Shadow
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const exists = !!selectedFirst?.style?.outline;
                                  updateSelectedStyle(
                                    exists ? { outline: undefined } : { outline: { width: 2, color: '#000000' } }
                                  );
                                }}
                              >
                                Outline
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const exists = !!selectedFirst?.style?.gradient;
                                  updateSelectedStyle(
                                    exists
                                      ? { gradient: undefined }
                                      : { gradient: { type: 'linear', colors: ['#9333ea', '#f472b6'], direction: 45 } }
                                  );
                                }}
                              >
                                Gradient
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const exists = !!selectedFirst?.style?.curve;
                                  updateSelectedStyle(
                                    exists ? { curve: undefined } : { curve: { radius: 150, direction: 'up' } }
                                  );
                                }}
                              >
                                Curve
                              </Button>
                            </div>
                            {selectedFirst?.style?.curve && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Fit To Width</div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={!!selectedFirst.style.curve.fitToWidth}
                                        onChange={(e) => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), fitToWidth: e.target.checked } })}
                                      />
                                      <span className="text-xs">Derive radius from element width + sweep</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Direction</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {(['up', 'down'] as const).map(dir => (
                                        <Button
                                          key={dir}
                                          variant={selectedFirst.style.curve?.direction === dir ? 'default' : 'outline'}
                                          size="sm"
                                          onClick={() => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), direction: dir } })}
                                        >
                                          {dir}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {!selectedFirst.style.curve.fitToWidth && (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Radius</span>
                                      <span>{selectedFirst.style.curve.radius ?? 150}px</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={50}
                                      max={1000}
                                      value={selectedFirst.style.curve.radius ?? 150}
                                      onChange={(e) => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), radius: Number(e.target.value) } })}
                                      className="w-full"
                                    />
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Curve Extent</span>
                                      <span>{selectedFirst.style.curve.sweepAngleDeg ?? 180}°</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={10}
                                      max={360}
                                      value={selectedFirst.style.curve.sweepAngleDeg ?? 180}
                                      onChange={(e) => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), sweepAngleDeg: Number(e.target.value) } })}
                                      className="w-full"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Start Angle</span>
                                      <span>{selectedFirst.style.curve.startAngleDeg ?? 0}°</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={-180}
                                      max={180}
                                      value={selectedFirst.style.curve.startAngleDeg ?? 0}
                                      onChange={(e) => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), startAngleDeg: Number(e.target.value) } })}
                                      className="w-full"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Reverse</div>
                                    <div>
                                      <Button
                                        variant={selectedFirst.style.curve.reverse ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), reverse: !selectedFirst.style.curve.reverse } })}
                                      >
                                        {selectedFirst.style.curve.reverse ? 'On' : 'Off'}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      <span>Baseline Offset</span>
                                      <span>{selectedFirst.style.curve.baselineOffset ?? 0}px</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={-200}
                                      max={200}
                                      value={selectedFirst.style.curve.baselineOffset ?? 0}
                                      onChange={(e) => updateSelectedStyle({ curve: { ...(selectedFirst.style.curve!), baselineOffset: Number(e.target.value) } })}
                                      className="w-full"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium">Templates</div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (!selectedFirst || selectedFirst.type !== 'text') return;
                                  const name = window.prompt('Preset name');
                                  if (!name) return;
                                  const preset = { id: `preset-${Date.now()}`, name, style: { ...selectedFirst.style } };
                                  persistPresets([...textPresets, preset]);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {textPresets.length === 0 && (
                                <div className="text-xs text-muted-foreground">No templates saved</div>
                              )}
                              {textPresets.map(p => (
                                <div key={p.id} className="flex items-center justify-between border rounded p-2">
                                  <div>
                                    <div className="text-sm">{p.name}</div>
                                    <div className="text-xs text-muted-foreground">{p.style.fontFamily} · {p.style.fontSize || ''} {p.style.fontWeight || ''}</div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateSelectedStyle({ ...p.style })}
                                    >
                                      Apply
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => persistPresets(textPresets.filter(x => x.id !== p.id))}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );

                    case 'background':
                      return (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Background</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280'].map(color => (
                                <div
                                  key={color}
                                  className="w-8 h-8 rounded border cursor-pointer"
                                  style={{ backgroundColor: color }}
                                  onClick={() => {
                                    // Update canvas background
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      );

                    case 'tools':
                      return (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Quick Actions</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (historyIndex > 0) {
                                    setHistoryIndex(prev => prev - 1);
                                    setCanvasElements(canvasHistory[historyIndex - 1]);
                                  }
                                }}
                                disabled={!canUndo}
                              >
                                Undo
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (historyIndex < canvasHistory.length - 1) {
                                    setHistoryIndex(prev => prev + 1);
                                    setCanvasElements(canvasHistory[historyIndex + 1]);
                                  }
                                }}
                                disabled={!canRedo}
                              >
                                Redo
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setZoomLevel(1);
                                  setSelectedElements([]);
                                }}
                              >
                                Reset
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const canvasData = {
                                    elements: canvasElements,
                                    zoomLevel,
                                    canvasSize,
                                    timestamp: new Date().toISOString(),
                                  };
                                  localStorage.setItem(`canvas-${orderId}`, JSON.stringify(canvasData));
                                  toast.success('Canvas saved successfully');
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      );

                    default:
                      return (
                        <div className="space-y-4">
                          <div className="text-sm font-medium">Welcome</div>
                          <p className="text-xs text-gray-500">Select a section from the sidebar to get started</p>
                        </div>
                      );
                  }
                })()}
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="lg:col-span-3 flex-1 bg-white border rounded-lg p-6 min-h-0 overflow-auto">
              <div className="min-h-full flex flex-col">
                {/* Canvas Toolbar */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.max(0.1, Math.min(3, prev * 1.2)))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.max(0.1, Math.min(3, prev * 0.8)))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canUndo}
                      onClick={() => {
                        if (historyIndex > 0) {
                          skipHistoryPushRef.current = true;
                          setHistoryIndex(prev => prev - 1);
                          setCanvasElements(canvasHistory[historyIndex - 1]);
                        }
                      }}
                    >
                      Undo
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={selectedElements.length === 0}
                      onClick={() => {
                        if (selectedElements.length === 0) return;
                        setCanvasElements(prev => prev.filter(el => !selectedElements.includes(el.id)));
                        setSelectedElements([]);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="default" size="sm" onClick={handleDownload300DPI}>
                      <DownloadIcon className="h-4 w-4 mr-2" /> Download (300 DPI)
                    </Button>
                  </div>
                </div>

                {/* Canvas Container: full height visible; scroll when viewport is smaller than canvas */}
                <div
                  className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
                  style={{
                    width: canvasSize.width * DISPLAY_SCALE,
                    height: canvasSize.height * DISPLAY_SCALE,
                    minHeight: canvasSize.height * DISPLAY_SCALE,
                    flexShrink: 0,
                    margin: 'auto',
                    overflow: 'auto',
                  }}
                  ref={canvasContainerRef}
                  onClick={(e) => {
                    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS') {
                      setSelectedElements([]);
                    }
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: canvasSize.width,
                      height: canvasSize.height,
                      transform: `scale(${DISPLAY_SCALE})`,
                      transformOrigin: 'top left',
                      overflow: 'hidden',
                    }}
                  >
                    <canvas
                      width={canvasSize.width}
                      height={canvasSize.height}
                      style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        backgroundColor: '#ffffff',
                      }}
                    />
                    {/* Zoom + positioned elements; thin black border; clip to canvas */}
                    <div
                      className="absolute inset-0 border border-black box-border"
                      style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        overflow: 'hidden',
                      }}
                      ref={designWrapperRef}
                    >
                      {/* Render Canvas Elements */}
                      {canvasElements.map((element) => {
                        const txt = element.type === 'text';
                        const shadow = element.style?.shadow
                          ? `${element.style.shadow.x}px ${element.style.shadow.y}px ${element.style.shadow.blur}px ${element.style.shadow.color}`
                          : undefined;
                        const outline = element.style?.outline;
                        const gradient = element.style?.gradient;
                        const colorStyle = gradient
                          ? {
                            backgroundImage:
                              gradient.type === 'linear'
                                ? `linear-gradient(${gradient.direction ?? 0}deg, ${gradient.colors.join(',')})`
                                : `radial-gradient(${gradient.colors.join(',')})`,
                            WebkitBackgroundClip: 'text' as any,
                            backgroundClip: 'text',
                            color: 'transparent',
                          }
                          : { color: element.style?.color || '#000000' };
                        return (
                          <div
                            key={element.id}
                            className={`absolute border-2 ${selectedElements.includes(element.id)
                              ? 'border-blue-500 bg-blue-100 bg-opacity-20'
                              : 'border-transparent'
                              }`}
                            style={{
                              left: element.x,
                              top: element.y,
                              width: element.width,
                              height: element.height,
                              transform: `rotate(${element.rotation}deg)` as any,
                              opacity: element.opacity,
                              zIndex: element.zIndex,
                              cursor: 'move',
                              pointerEvents: 'auto',
                            }}
                            onClick={(e) => {
                              // Prevent container onClick from clearing selection on simple clicks
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // If currently editing this element, do not start dragging
                              if (editingElementId && editingElementId === element.id) return;
                              // reset drag flag at the start of interaction
                              dragMovedRef.current = false;
                              // select
                              if (e.ctrlKey || e.metaKey) {
                                setSelectedElements((prev) =>
                                  prev.includes(element.id)
                                    ? prev.filter((id) => id !== element.id)
                                    : [...prev, element.id]
                                );
                              } else {
                                setSelectedElements([element.id]);
                              }
                              // start dragging
                              setDragging({
                                id: element.id,
                                startMouse: { x: e.clientX, y: e.clientY },
                                startPos: { x: element.x, y: element.y },
                              });
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              // Enter inline editing for this text element
                              if (txt) {
                                setSelectedElements([element.id]);
                                setEditingElementId(element.id);
                                setIsTyping(true);
                                setTextContent(element.content || '');
                              }
                            }}
                          >
                            {txt && editingElementId === element.id ? (
                              // Inline editor overlay
                              <textarea
                                value={textContent}
                                autoFocus
                                onChange={(e) => setTextContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    // Commit to in-memory canvas
                                    setCanvasElements(prev => prev.map(el => (
                                      el.id === element.id ? { ...el, content: textContent } : el
                                    )));
                                    setEditingElementId(null);
                                    setIsTyping(false);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setEditingElementId(null);
                                    setIsTyping(false);
                                  }
                                }}
                                onBlur={() => {
                                  // Commit on blur as well
                                  setCanvasElements(prev => prev.map(el => (
                                    el.id === element.id ? { ...el, content: textContent } : el
                                  )));
                                  setEditingElementId(null);
                                  setIsTyping(false);
                                }}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  resize: 'none',
                                  border: '1px solid #60a5fa',
                                  outline: 'none',
                                  background: 'white',
                                  color: element.style?.color || '#000',
                                  fontFamily: element.style?.fontFamily || 'Arial',
                                  fontSize: (element.style?.fontSize || 16) as number,
                                  fontWeight: element.style?.fontWeight || 'normal',
                                  fontStyle: element.style?.fontStyle || 'normal',
                                  textDecoration: element.style?.textDecoration || 'none',
                                  textAlign: element.style?.textAlign || 'left',
                                  lineHeight: element.style?.lineHeight as number | undefined,
                                  letterSpacing: element.style?.letterSpacing as number | undefined,
                                  padding: 4,
                                  backgroundClip: 'padding-box',
                                }}
                              />
                            ) : txt && (!element.style?.curve ? (
                              (() => {
                                const isRoll = element.id.startsWith('el-roll-');
                                const lineHeight = element.style?.lineHeight ?? 1;
                                const flexClass = isRoll
                                  ? 'w-full h-full flex items-start justify-center text-black'
                                  : 'w-full h-full flex items-center justify-center text-black';

                                // For roll numbers, compute vertical stretch so the two lines
                                // roughly fill the available height (jersey / ID-card look),
                                // and widen slightly so digits feel bolder.
                                let sx = 1;
                                let sy = 1;
                                if (isRoll) {
                                  const fontSize = (element.style?.fontSize || 16) as number;
                                  const lines = (element.content || '').split('\n').length || 1;
                                  const baseTextHeight = fontSize * lines;
                                  if (baseTextHeight > 0) {
                                    // Keep scaled text inside element box so download doesn't clip (match editor)
                                    sy = (element.height / baseTextHeight) * 0.88;
                                  }
                                  // Slight extra horizontal stretch for jersey / ID-card feel
                                  sx = 1.25;
                                }
                                const hasScale = sx !== 1 || sy !== 1;
                                return (
                                  <div
                                    className={flexClass}
                                    style={{
                                      fontFamily: element.style?.fontFamily || 'Arial',
                                      fontSize: element.style?.fontSize || 16,
                                      fontWeight: element.style?.fontWeight || 'normal',
                                      fontStyle: element.style?.fontStyle || 'normal',
                                      textDecoration: element.style?.textDecoration || 'none',
                                      textAlign: element.style?.textAlign || 'left',
                                      textTransform: element.style?.textTransform || 'none',
                                      whiteSpace: 'pre',
                                      letterSpacing: element.style?.letterSpacing,
                                      lineHeight,
                                      textShadow: shadow,
                                      WebkitTextStrokeWidth: outline?.width ? `${outline.width}px` : undefined,
                                      WebkitTextStrokeColor: outline?.color,
                                      ...colorStyle,
                                    }}
                                  >
                                    {hasScale ? (
                                      <span
                                        style={{
                                          display: 'inline-block',
                                          transform: `scale(${sx}, ${sy})`,
                                          transformOrigin: 'center top',
                                          lineHeight,
                                        }}
                                      >
                                        {element.content}
                                      </span>
                                    ) : (
                                      element.content
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div
                                className="relative w-full h-full"
                                style={{
                                  fontFamily: element.style?.fontFamily || 'Arial',
                                  fontSize: element.style?.fontSize || 16,
                                  fontWeight: element.style?.fontWeight || 'normal',
                                  fontStyle: element.style?.fontStyle || 'normal',
                                  textDecoration: element.style?.textDecoration || 'none',
                                  textTransform: element.style?.textTransform || 'none',
                                  textShadow: shadow,
                                }}
                              >
                                {(() => {
                                  const fontSize = element.style?.fontSize || 16;
                                  const letters = (element.content || '').split('');
                                  const curve = element.style?.curve!;
                                  const direction = curve?.direction || 'up';
                                  const reverse = !!curve?.reverse;
                                  const approxCharWidth = fontSize * 0.6 + (element.style?.letterSpacing ?? 0);
                                  const textLen = approxCharWidth * Math.max(letters.length - 1, 1);
                                  const sweepDeg = Math.min(360, Math.max(10, curve?.sweepAngleDeg ?? 180));
                                  const sweepRad = (sweepDeg * Math.PI) / 180;
                                  const radius = curve?.fitToWidth
                                    ? Math.max(10, textLen / (sweepRad || (Math.PI / 180 * 10)))
                                    : Math.max(10, curve?.radius ?? 150);
                                  const startAngleDeg = curve?.startAngleDeg ?? 0;
                                  const startRad = (startAngleDeg * Math.PI) / 180;

                                  // center of arc in element box
                                  const cx = element.width / 2;
                                  const baseCy = element.height / 2 + (direction === 'up' ? radius / 2 : -radius / 2);
                                  const cy = baseCy + (curve?.baselineOffset ?? 0) * (direction === 'up' ? 1 : -1);

                                  // angle per glyph
                                  const step = letters.length > 1 ? sweepRad / (letters.length - 1) : 0;
                                  const start = -sweepRad / 2 + startRad;
                                  const ordered = reverse ? [...letters].reverse() : letters;

                                  return ordered.map((ch, n) => {
                                    const i = reverse ? letters.length - 1 - n : n;
                                    const ang = (start + i * step) * (direction === 'down' ? -1 : 1);
                                    const x = cx + radius * Math.sin(ang);
                                    const y = cy - radius * Math.cos(ang);
                                    const rot = (ang * 180) / Math.PI + (reverse ? 180 : 0);
                                    const style: React.CSSProperties = {
                                      position: 'absolute',
                                      left: x,
                                      top: y,
                                      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                                      whiteSpace: 'pre',
                                      WebkitTextStrokeWidth: outline?.width ? `${outline.width}px` : undefined,
                                      WebkitTextStrokeColor: outline?.color,
                                      textTransform: element.style?.textTransform || 'none',
                                      letterSpacing: element.style?.letterSpacing,
                                      lineHeight: element.style?.lineHeight,
                                      ...(colorStyle as any),
                                    };
                                    return (
                                      <span key={n} style={style}>
                                        {ch}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                            ))}

                            {/* Resize handles when selected and not editing */}
                            {selectedElements.includes(element.id) && editingElementId !== element.id && (
                              <>
                                {/* East handle */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: -6,
                                    top: '50%',
                                    marginTop: -6,
                                    width: 12,
                                    height: 12,
                                    background: '#fff',
                                    border: '2px solid #3b82f6',
                                    borderRadius: 2,
                                    cursor: 'ew-resize',
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setResizing({
                                      id: element.id,
                                      startMouse: { x: e.clientX, y: e.clientY },
                                      startSize: { w: element.width, h: element.height },
                                      startStyle: {
                                        fontSize: element.style?.fontSize as number | undefined,
                                        letterSpacing: element.style?.letterSpacing as number | undefined,
                                        lineHeight: element.style?.lineHeight as number | undefined,
                                      },
                                      handle: 'e',
                                    });
                                  }}
                                />
                                {/* South handle */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: -6,
                                    left: '50%',
                                    marginLeft: -6,
                                    width: 12,
                                    height: 12,
                                    background: '#fff',
                                    border: '2px solid #3b82f6',
                                    borderRadius: 2,
                                    cursor: 'ns-resize',
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setResizing({
                                      id: element.id,
                                      startMouse: { x: e.clientX, y: e.clientY },
                                      startSize: { w: element.width, h: element.height },
                                      startStyle: {
                                        fontSize: element.style?.fontSize as number | undefined,
                                        letterSpacing: element.style?.letterSpacing as number | undefined,
                                        lineHeight: element.style?.lineHeight as number | undefined,
                                      },
                                      handle: 's',
                                    });
                                  }}
                                />
                                {/* South-East handle */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: -6,
                                    bottom: -6,
                                    width: 12,
                                    height: 12,
                                    background: '#fff',
                                    border: '2px solid #3b82f6',
                                    borderRadius: 2,
                                    cursor: 'nwse-resize',
                                  }}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setResizing({
                                      id: element.id,
                                      startMouse: { x: e.clientX, y: e.clientY },
                                      startSize: { w: element.width, h: element.height },
                                      startStyle: {
                                        fontSize: element.style?.fontSize as number | undefined,
                                        letterSpacing: element.style?.letterSpacing as number | undefined,
                                        lineHeight: element.style?.lineHeight as number | undefined,
                                      },
                                      handle: 'se',
                                    });
                                  }}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Canvas Overlay for Drop Zone */}
                    {!canvasElements.length && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-lg font-medium text-gray-500 mb-2">Drop elements here to start editing</p>
                          <p className="text-sm text-gray-400">Use the sidebar to add text, uploads, or other elements</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Canvas Status Bar */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Canvas Size: {canvasSize.width} × {canvasSize.height}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const canvasData = {
                          elements: canvasElements,
                          zoomLevel,
                          canvasSize,
                          timestamp: new Date().toISOString(),
                        };
                        localStorage.setItem(`canvas-${orderId}`, JSON.stringify(canvasData));
                        toast.success('Canvas saved successfully');
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Canvas
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">

        </TabsContent>

      </Tabs>

      <CenterVariantsModal
        open={showVariantsModal}
        onOpenChange={(open) => {
          if (!open) {
            setFetchedVariants(null);
            setFetchedRenderedImages(null);
            setFetchedHexagonalVariants(null);
            setFetchedHexagonalRenderedImages(null);
          }
          setShowVariantsModal(open);
        }}
        order={order}
        preloadedVariants={preloadedVariants}
        fetchedVariants={fetchedVariants ?? undefined}
        fetchedRenderedImages={fetchedRenderedImages ?? undefined}
        fetchedHexagonalVariants={fetchedHexagonalVariants ?? undefined}
        fetchedHexagonalRenderedImages={fetchedHexagonalRenderedImages ?? undefined}
        onSavedToBackend={handleVariantsSavedToBackend}
        gridType={previewGridType}
      />
    </div>
  );
};
