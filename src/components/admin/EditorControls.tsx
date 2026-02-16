import React, { useState, useEffect } from 'react';
import { Settings, RotateCcw, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Order, OrderSettings } from '@/types/admin';
import { toast } from 'sonner';

interface EditorControlsProps {
  order: Order;
  onSettingsChange: (settings: Partial<OrderSettings>) => void;
}

export const EditorControls: React.FC<EditorControlsProps> = ({ order, onSettingsChange }) => {
  const [settings, setSettings] = useState<OrderSettings>(order.settings);
  const [aspectRatio, setAspectRatio] = useState<number>(
    order.settings.widthPx / order.settings.heightPx
  );

  useEffect(() => {
    setSettings(order.settings);
    setAspectRatio(order.settings.widthPx / order.settings.heightPx);
  }, [order.settings]);

  const updateSettings = (newSettings: Partial<OrderSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    onSettingsChange(newSettings);
  };

  const handleWidthChange = (width: number) => {
    const newSettings: Partial<OrderSettings> = { widthPx: width };
    
    if (settings.keepAspect) {
      newSettings.heightPx = Math.round(width / aspectRatio);
    }
    
    updateSettings(newSettings);
  };

  const handleHeightChange = (height: number) => {
    const newSettings: Partial<OrderSettings> = { heightPx: height };
    
    if (settings.keepAspect) {
      newSettings.widthPx = Math.round(height * aspectRatio);
    }
    
    updateSettings(newSettings);
  };

  const toggleKeepAspect = (keepAspect: boolean) => {
    if (keepAspect) {
      // Lock current aspect ratio
      setAspectRatio(settings.widthPx / settings.heightPx);
    }
    updateSettings({ keepAspect });
  };

  const resetToDefaults = () => {
    const defaultSettings: OrderSettings = {
      widthPx: 2550, // 8.5" at 300 DPI
      heightPx: 3300, // 11" at 300 DPI
      keepAspect: true,
      gapPx: 4,
      cellScale: 1.0,
      dpi: 300
    };
    
    setSettings(defaultSettings);
    setAspectRatio(defaultSettings.widthPx / defaultSettings.heightPx);
    onSettingsChange(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  // Convert pixels to inches
  const widthInches = (settings.widthPx / settings.dpi).toFixed(2);
  const heightInches = (settings.heightPx / settings.dpi).toFixed(2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Print Settings</span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dimensions */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Label>Keep Aspect Ratio</Label>
            <Switch
              checked={settings.keepAspect}
              onCheckedChange={toggleKeepAspect}
            />
            {settings.keepAspect ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Width</Label>
              <Input
                type="number"
                value={settings.widthPx}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                placeholder="Width (px)"
              />
              <p className="text-xs text-muted-foreground">{widthInches}"</p>
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Input
                type="number"
                value={settings.heightPx}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                placeholder="Height (px)"
              />
              <p className="text-xs text-muted-foreground">{heightInches}"</p>
            </div>
          </div>
        </div>

        {/* DPI */}
        <div className="space-y-2">
          <Label>DPI (Print Quality)</Label>
          <div className="flex items-center space-x-4">
            <Slider
              value={[settings.dpi]}
              onValueChange={([value]) => updateSettings({ dpi: value })}
              min={150}
              max={600}
              step={50}
              className="flex-1"
            />
            <span className="w-16 text-sm font-medium">{settings.dpi}</span>
          </div>
        </div>

        {/* Cell Scale */}
        <div className="space-y-2">
          <Label>Cell Scale</Label>
          <div className="flex items-center space-x-4">
            <Slider
              value={[settings.cellScale * 100]}
              onValueChange={([value]) => updateSettings({ cellScale: value / 100 })}
              min={50}
              max={200}
              step={5}
              className="flex-1"
            />
            <span className="w-16 text-sm font-medium">{Math.round(settings.cellScale * 100)}%</span>
          </div>
        </div>

        {/* Gap */}
        <div className="space-y-2">
          <Label>Gap Between Cells</Label>
          <div className="flex items-center space-x-4">
            <Slider
              value={[settings.gapPx]}
              onValueChange={([value]) => updateSettings({ gapPx: value })}
              min={0}
              max={20}
              step={1}
              className="flex-1"
            />
            <span className="w-16 text-sm font-medium">{settings.gapPx}px</span>
          </div>
        </div>

        {/* Print Size Preview */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Print Size Preview</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Dimensions: {widthInches}" × {heightInches}"</div>
            <div>Resolution: {settings.widthPx} × {settings.heightPx}px</div>
            <div>File Size: ~{Math.round((settings.widthPx * settings.heightPx * 3) / 1024 / 1024)}MB</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};