
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  Palette,
  Sparkles,
  Save,
  Trash2,
  RotateCw,
  Zap,
  Star,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from 'fabric';

interface TextTemplate {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  color: string;
  effects: string[];
}

const fonts = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
  'Calibri', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Lato', 'Oswald', 'Raleway'
];

const textEffects = [
  { id: 'shadow', name: 'Shadow', icon: Eye },
  { id: 'outline', name: 'Outline', icon: EyeOff },
  { id: 'gradient', name: 'Gradient', icon: Palette },
  { id: '3d', name: '3D', icon: Zap },
  { id: 'glow', name: 'Glow', icon: Sparkles },
  { id: 'curve', name: 'Curve', icon: RotateCw },
];

// Add prop for fabricCanvas
interface TextSectionProps {
  fabricCanvas: any | null;
}

export const TextSection = ({ fabricCanvas }: TextSectionProps) => {
  const [textObjects, setTextObjects] = useState<any[]>([]); // Array of { id, object }
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  // Sidebar state reflects the selected text object
  const [textContent, setTextContent] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSize, setFontSize] = useState([24]);
  const [fontWeight, setFontWeight] = useState('normal');
  const [textAlign, setTextAlign] = useState('left');
  const [textColor, setTextColor] = useState('#000000');
  const [letterSpacing, setLetterSpacing] = useState([0]);
  const [lineHeight, setLineHeight] = useState([1.2]);
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<TextTemplate[]>([
    {
      id: '1',
      name: 'Heading Style',
      fontFamily: 'Montserrat',
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1f2937',
      effects: ['shadow']
    },
    {
      id: '2',
      name: 'Subtitle Style',
      fontFamily: 'Open Sans',
      fontSize: 18,
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#6b7280',
      effects: []
    }
  ]);

  // Helper to get selected object
  const getSelectedObject = () => textObjects.find(obj => obj.id === selectedTextId)?.object;

  // Add new text object
  const handleAddText = useCallback((type: 'heading' | 'subheading' | 'body') => {
    if (!fabricCanvas) return;
    const defaultText = {
      heading: 'Your Heading',
      subheading: 'Your Subheading',
      body: 'Your text content here'
    };
    const sizes = { heading: 32, subheading: 24, body: 16 };
    const weights = { heading: 'bold', subheading: '600', body: 'normal' };
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const obj = new Text(defaultText[type], {
      left: 350,
      top: 350,
      fontFamily: 'Arial',
      fontSize: sizes[type],
      fontWeight: weights[type],
      textAlign: 'left',
      fill: '#000000',
      selectable: true,
      evented: true,
    });
    obj.set({
      id,
    });
    fabricCanvas.add(obj);
    setTextObjects(prev => [...prev, { id, object: obj }]);
    setSelectedTextId(id);
    // Set sidebar state to new object
    setTextContent(defaultText[type]);
    setSelectedFont('Arial');
    setFontSize([sizes[type]]);
    setFontWeight(weights[type]);
    setTextAlign('left');
    setTextColor('#000000');
    setLetterSpacing([0]);
    setLineHeight([1.2]);
    setActiveEffects([]);
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
    toast({ title: 'Text Added', description: `${type} text added to canvas` });
  }, [fabricCanvas]);

  // Add this function to handle the plus button
  const handleAddNewTextObject = useCallback(() => {
    if (!fabricCanvas) return;
    // Use the current textContent for the new object
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
    const obj = new Text(textContent, {
      left: 350,
      top: 350,
      fontFamily: selectedFont,
      fontSize: fontSize[0],
      fontWeight,
      textAlign,
      fill: textColor,
      selectable: true,
      evented: true,
      id,
      charSpacing: letterSpacing[0] * 1000,
      lineHeight: lineHeight[0],
      fontStyle: activeEffects.includes('italic') ? 'italic' : 'normal',
      underline: activeEffects.includes('underline'),
    });
    if (activeEffects.includes('shadow')) {
      obj.set('shadow', '2px 2px 5px rgba(0,0,0,0.4)');
    }
    if (activeEffects.includes('outline')) {
      obj.set({ stroke: textColor === '#ffffff' ? '#000000' : '#ffffff', strokeWidth: 2 });
    }
    fabricCanvas.add(obj);
    setTextObjects(prev => [...prev, { id, object: obj }]);
    setSelectedTextId(id);
    // Clear sidebar for next text
    setTextContent('');
    setSelectedFont('Arial');
    setFontSize([24]);
    setFontWeight('normal');
    setTextAlign('left');
    setTextColor('#000000');
    setLetterSpacing([0]);
    setLineHeight([1.2]);
    setActiveEffects([]);
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
  }, [fabricCanvas, textContent, selectedFont, fontSize, fontWeight, textAlign, textColor, letterSpacing, lineHeight, activeEffects]);

  const handleStyleToggle = useCallback((style: string) => {
    switch (style) {
      case 'bold':
        setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold');
        break;
      case 'italic':
        // Handle italic toggle
        break;
      case 'underline':
        // Handle underline toggle
        break;
    }
  }, [fontWeight]);

  const handleAlignment = useCallback((align: string) => {
    setTextAlign(align);
  }, []);

  const toggleEffect = useCallback((effectId: string) => {
    setActiveEffects(prev => 
      prev.includes(effectId) 
        ? prev.filter(id => id !== effectId)
        : [...prev, effectId]
    );
  }, []);

  const saveTemplate = useCallback(() => {
    if (!textContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text first",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: TextTemplate = {
      id: Date.now().toString(),
      name: `Custom Style ${savedTemplates.length + 1}`,
      fontFamily: selectedFont,
      fontSize: fontSize[0],
      fontWeight,
      textAlign,
      color: textColor,
      effects: activeEffects
    };

    setSavedTemplates(prev => [...prev, newTemplate]);
    
    toast({
      title: "Template Saved",
      description: "Text style saved as template",
    });
  }, [textContent, selectedFont, fontSize, fontWeight, textAlign, textColor, activeEffects, savedTemplates.length]);

  const applyTemplate = useCallback((template: TextTemplate) => {
    setSelectedFont(template.fontFamily);
    setFontSize([template.fontSize]);
    setFontWeight(template.fontWeight);
    setTextAlign(template.textAlign);
    setTextColor(template.color);
    setActiveEffects(template.effects);
    
    toast({
      title: "Template Applied",
      description: `${template.name} applied to text`,
    });
  }, []);

  const deleteTemplate = useCallback((templateId: string) => {
    setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
    
    toast({
      title: "Template Deleted",
      description: "Text template removed",
    });
  }, []);

  const colorPresets = [
    '#000000', '#ffffff', '#ef4444', '#3b82f6', '#10b981', 
    '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
  ];

  // Listen for selection changes on the canvas
  useEffect(() => {
    if (!fabricCanvas) return;
    const handleSelection = (e: any) => {
      const obj = e.selected && e.selected[0];
      if (obj && obj.type === 'text' && obj.id) {
        setSelectedTextId(obj.id);
        // Sync sidebar state to selected object
        setTextContent(obj.text || '');
        setSelectedFont(obj.fontFamily || 'Arial');
        setFontSize([obj.fontSize || 24]);
        setFontWeight(obj.fontWeight || 'normal');
        setTextAlign(obj.textAlign || 'left');
        setTextColor(obj.fill || '#000000');
        setLetterSpacing([obj.charSpacing ? obj.charSpacing / 1000 : 0]);
        setLineHeight([obj.lineHeight || 1.2]);
        const effects: string[] = [];
        if (obj.fontStyle === 'italic') effects.push('italic');
        if (obj.underline) effects.push('underline');
        if (obj.shadow) effects.push('shadow');
        if (obj.strokeWidth > 0) effects.push('outline');
        setActiveEffects(effects);
      } else {
        setSelectedTextId(null);
      }
    };
    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', () => setSelectedTextId(null));
    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared');
    };
  }, [fabricCanvas]);

  // Update selected text object when sidebar state changes
  useEffect(() => {
    if (!fabricCanvas || !selectedTextId) return;
    const obj = getSelectedObject();
    if (!obj) return;
    obj.set({
      text: textContent,
      fontFamily: selectedFont,
      fontSize: fontSize[0],
      fontWeight,
      fontStyle: activeEffects.includes('italic') ? 'italic' : 'normal',
      underline: activeEffects.includes('underline'),
      textAlign,
      fill: textColor,
      charSpacing: letterSpacing[0] * 1000,
      lineHeight: lineHeight[0],
    });
    if (activeEffects.includes('shadow')) {
      obj.set('shadow', '2px 2px 5px rgba(0,0,0,0.4)');
    } else {
      obj.set('shadow', null);
    }
    if (activeEffects.includes('outline')) {
      obj.set({ stroke: textColor === '#ffffff' ? '#000000' : '#ffffff', strokeWidth: 2 });
    } else {
      obj.set({ stroke: null, strokeWidth: 0 });
    }
    fabricCanvas.renderAll();
  }, [textContent, selectedFont, fontSize, fontWeight, textAlign, textColor, letterSpacing, lineHeight, activeEffects, selectedTextId, fabricCanvas]);

  // Delete selected text object
  const handleDeleteText = useCallback(() => {
    if (!fabricCanvas || !selectedTextId) return;
    const obj = getSelectedObject();
    if (!obj) return;
    fabricCanvas.remove(obj);
    setTextObjects(prev => prev.filter(o => o.id !== selectedTextId));
    setSelectedTextId(null);
    // Reset sidebar state
    setTextContent('');
    setSelectedFont('Arial');
    setFontSize([24]);
    setFontWeight('normal');
    setTextAlign('left');
    setTextColor('#000000');
    setLetterSpacing([0]);
    setLineHeight([1.2]);
    setActiveEffects([]);
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    toast({ title: 'Text Deleted', description: 'Text object removed from canvas' });
  }, [fabricCanvas, selectedTextId]);

  return (
    <div className="space-y-4">
      {/* Quick Add Text */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Add Text</h4>
          
        </div>
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleAddText('heading')}
          >
            <Type className="w-4 h-4 mr-2" />
            Add Heading
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleAddText('subheading')}
          >
            <Type className="w-4 h-4 mr-2" />
            Add Subheading
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => handleAddText('body')}
          >
            <Type className="w-4 h-4 mr-2" />
            Add Body Text
          </Button>
        </div>
      </div>

      <Separator />

      {/* Text Input */}
      <div className="space-x-2">
        <h4 className="text-sm font-medium">Text Content</h4>
        <span className="w-full flex flex-row ">
        <Input
          placeholder="Enter your text..."
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
        />
        <Button
            variant="outline"
            size="icon"
            onClick={handleAddNewTextObject}
            title="Add new text object"
            className="ml-2"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </span>
      </div>

      {/* Font Selection */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Font</h4>
        <Select value={selectedFont} onValueChange={setSelectedFont}>
          <SelectTrigger>
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            {fonts.map(font => (
              <SelectItem key={font} value={font}>
                <span style={{ fontFamily: font }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Font Size</label>
          <span className="text-xs text-muted-foreground">{fontSize[0]}px</span>
        </div>
        <Slider
          value={fontSize}
          onValueChange={setFontSize}
          max={72}
          min={8}
          step={1}
          className="w-full"
        />
      </div>

      {/* Text Styles */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Styles</h4>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={fontWeight === 'bold' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStyleToggle('bold')}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStyleToggle('italic')}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStyleToggle('underline')}
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Alignment</h4>
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant={textAlign === 'left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleAlignment('left')}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={textAlign === 'center' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleAlignment('center')}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant={textAlign === 'right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleAlignment('right')}
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          <Button
            variant={textAlign === 'justify' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleAlignment('justify')}
          >
            <AlignJustify className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Color</h4>
        <div className="flex gap-2 mb-2">
          {colorPresets.map((color) => (
            <button
              key={color}
              className={`w-6 h-6 rounded-full border-2 ${
                textColor === color ? 'border-primary' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setTextColor(color)}
            />
          ))}
        </div>
        <Input
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="w-full h-8"
        />
      </div>

      {/* Spacing */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Letter Spacing</label>
            <span className="text-xs text-muted-foreground">{letterSpacing[0]}px</span>
          </div>
          <Slider
            value={letterSpacing}
            onValueChange={setLetterSpacing}
            max={10}
            min={-2}
            step={0.1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Line Height</label>
            <span className="text-xs text-muted-foreground">{lineHeight[0]}</span>
          </div>
          <Slider
            value={lineHeight}
            onValueChange={setLineHeight}
            max={3}
            min={0.5}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>

      {/* Text Effects */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Effects</h4>
        <div className="grid grid-cols-3 gap-2">
          {textEffects.map((effect) => {
            const Icon = effect.icon;
            return (
              <Button
                key={effect.id}
                variant={activeEffects.includes(effect.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleEffect(effect.id)}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Icon className="w-3 h-3" />
                <span className="text-xs">{effect.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Templates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Templates</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={saveTemplate}
            disabled={!textContent.trim()}
          >
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {savedTemplates.map((template) => (
            <Card key={template.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium">{template.name}</h5>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="h-6 px-2"
                  >
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    className="h-6 px-2 text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {template.fontFamily} • {template.fontSize}px • {template.fontWeight}
              </div>
              <div className="flex gap-1 mt-1">
                {template.effects.map(effect => (
                  <Badge key={effect} variant="secondary" className="text-xs">
                    {effect}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedTextId && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteText}
            className="h-8 px-3 text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete Text
          </Button>
        </div>
      )}
    </div>
  );
};