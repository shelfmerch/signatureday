import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@/components/ui/badge";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarTrigger,
    useSidebar,
  } from "@/components/ui/sidebar"

import { 
  Search, 
  Grid3X3, 
  Hexagon, 
  Circle, 
  Focus,
  Upload,
  Type,
  Palette,
  Plus,
  BookOpen,
  Image,
  User, 
  Plane, 
  Calendar, 
  Layout,
  Camera,
  Layers,
  Settings,
  Undo2,
  Redo2,
  RotateCcw,
  Shuffle,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Star,
  Heart,
  Crown
} from 'lucide-react';
import { GridType } from './GridTemplates';
import { UploadSection } from './UploadSection';
// import { ElementsSection } from './ElementsSection';
import { TextSection } from './TextSection';
// import { BackgroundSection } from './BackgroundSection';

interface DesignSidebarProps {
  selectedGrid: GridType | null;
  onGridSelect: (gridType: GridType) => void;
  onShowGrid: () => void;
  onClearGrid: () => void;
  isGridVisible: boolean;
  hexColumns?: number;
  hexRows?: number;
  squareRows?: number;
  squareColumns?: number;
  focusCount?: number;
  onHexColumnsChange?: (columns: number) => void;
  onHexRowsChange?: (rows: number) => void;
  onSquareRowsChange?: (rows: number) => void;
  onSquareColumnsChange?: (columns: number) => void;
  onFocusCountChange?: (count: number) => void;
  fabricCanvas?: any | null;
  backgroundType: 'color' | 'gradient' | 'pattern' | 'image';
  setBackgroundType: (type: 'color' | 'gradient' | 'pattern' | 'image') => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundGradient: any;
  setBackgroundGradient: (gradient: any) => void;
  backgroundPattern: any;
  setBackgroundPattern: (pattern: any) => void;
  backgroundOpacity: number[];
  setBackgroundOpacity: (opacity: number[]) => void;
  backgroundBlur: number[];
  setBackgroundBlur: (blur: number[]) => void;
  uploadedBackgrounds: string[];
  setUploadedBackgrounds: (urls: string[]) => void;
  selectedBackgroundImage: string;
  setSelectedBackgroundImage: (url: string) => void;
  onModeChange?: (mode: 'upload' | 'adjust') => void;
  currentMode?: 'upload' | 'adjust';
}

export const DesignSidebar = ({
  selectedGrid,
  onGridSelect,
  onShowGrid,
  onClearGrid,
  isGridVisible,
  hexColumns = 8,
  hexRows = 8,
  squareRows = 4,
  squareColumns = 4,
  focusCount = 8,
  onHexColumnsChange,
  onHexRowsChange,
  onSquareRowsChange,
  onSquareColumnsChange,
  onFocusCountChange,
  fabricCanvas,
  backgroundType,
  setBackgroundType,
  backgroundColor,
  setBackgroundColor,
  backgroundGradient,
  setBackgroundGradient,
  backgroundPattern,
  setBackgroundPattern,
  backgroundOpacity,
  setBackgroundOpacity,
  backgroundBlur,
  setBackgroundBlur,
  uploadedBackgrounds,
  setUploadedBackgrounds,
  selectedBackgroundImage,
  setSelectedBackgroundImage,
  onModeChange,
  currentMode = 'upload'
}: DesignSidebarProps) => {
  const [activeSection, setActiveSection] = useState<string>('templates');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle section change and mode switching
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    
    // Update canvas mode based on section
    if (onModeChange) {
      if (sectionId === 'uploads') {
        onModeChange('upload');
      } else if (sectionId === 'templates') {
        onModeChange('adjust');
      }
    }
  };

  const sidebarSections = [
    { id: 'templates', label: 'Templates', icon: Grid3X3 },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'elements', label: 'Elements', icon: Layers, soon: true },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'background', label: 'Background', icon: Palette },
    { id: 'tools', label: 'Tools', icon: Settings },
  ];

  const templateCategories = [
    { 
      name: "All Templates", 
      icon: Layout, 
      count: 250,
      templates: [
        { id: 1, name: "Classic 4x4 Grid", preview: "grid-4x4", description: "Perfect for showcasing multiple photos" },
        { id: 2, name: "Heart Photo Collage", preview: "heart-collage", description: "Romantic heart-shaped layout" },
        { id: 3, name: "Circle Portrait Frame", preview: "circle-layout", description: "Elegant circular arrangement" },
        { id: 4, name: "Magazine Style", preview: "magazine-style", description: "Professional magazine layout" },
        { id: 5, name: "Polaroid Stack", preview: "polaroid-stack", description: "Vintage polaroid effect" }
      ]
    },
    { 
      name: "Social Media", 
      icon: Camera, 
      count: 85,
      templates: [
        { id: 1, name: "Instagram Story Template", preview: "insta-story", description: "9:16 vertical story format" },
        { id: 2, name: "Facebook Cover Collage", preview: "fb-cover", description: "851x315 cover photo layout" },
        { id: 3, name: "TikTok Square Post", preview: "tiktok-square", description: "1:1 square format for TikTok" },
        { id: 4, name: "Twitter Header", preview: "twitter-header", description: "1500x500 header template" },
        { id: 5, name: "LinkedIn Banner", preview: "linkedin-banner", description: "Professional banner format" }
      ]
    },
    { 
      name: "Love & Wedding", 
      icon: Heart, 
      count: 42,
      templates: [
        { id: 1, name: "Wedding Memory Book", preview: "wedding-memory", description: "Elegant wedding photo album" },
        { id: 2, name: "Anniversary Collage", preview: "anniversary-collage", description: "Romantic anniversary layout" },
        { id: 3, name: "Engagement Announcement", preview: "engagement-announce", description: "Beautiful engagement template" },
        { id: 4, name: "Save the Date", preview: "save-date", description: "Romantic save the date design" },
        { id: 5, name: "Couple's Journey", preview: "couple-journey", description: "Timeline of your relationship" }
      ]
    },
    { 
      name: "Birthday", 
      icon: Calendar, 
      count: 38,
      templates: [
        { id: 1, name: "Birthday Party Memories", preview: "birthday-party", description: "Fun party photo collage" },
        { id: 2, name: "Age Number Collage", preview: "age-number", description: "Photos arranged in age number" },
        { id: 3, name: "Birthday Timeline", preview: "birthday-timeline", description: "Year in review layout" },
        { id: 4, name: "Cake & Celebration", preview: "cake-celebration", description: "Focus on cake and moments" },
        { id: 5, name: "Kids Birthday Fun", preview: "kids-birthday", description: "Playful children's layout" }
      ]
    },
    { 
      name: "Travel", 
      icon: Plane, 
      count: 55,
      templates: [
        { id: 1, name: "World Map Adventure", preview: "world-map", description: "Global travel memories" },
        { id: 2, name: "Vacation Postcard", preview: "vacation-postcard", description: "Vintage postcard style" },
        { id: 3, name: "Road Trip Journal", preview: "road-trip", description: "Journey documentation" },
        { id: 4, name: "Beach Vacation", preview: "beach-vacation", description: "Tropical beach memories" },
        { id: 5, name: "City Explorer", preview: "city-explorer", description: "Urban adventure layout" }
      ]
    },
    { 
      name: "Family", 
      icon: User, 
      count: 47,
      templates: [
        { id: 1, name: "Family Tree Visual", preview: "family-tree", description: "Genealogy photo display" },
        { id: 2, name: "Generation Collage", preview: "generation-collage", description: "Multi-generation layout" },
        { id: 3, name: "Baby's First Year", preview: "baby-first-year", description: "Monthly milestone photos" },
        { id: 4, name: "Family Reunion", preview: "family-reunion", description: "Large family gathering" },
        { id: 5, name: "Siblings Collection", preview: "siblings-collection", description: "Brother/sister memories" }
      ]
    },
    { 
      name: "Minimalist", 
      icon: Circle, 
      count: 33,
      templates: [
        { id: 1, name: "Clean Grid Layout", preview: "clean-grid", description: "Simple geometric arrangement" },
        { id: 2, name: "White Space Focus", preview: "white-space", description: "Minimal with breathing room" },
        { id: 3, name: "Single Photo Frame", preview: "single-frame", description: "Elegant single photo display" },
        { id: 4, name: "Duo Comparison", preview: "duo-comparison", description: "Two photo comparison" },
        { id: 5, name: "Subtle Border", preview: "subtle-border", description: "Minimal border design" }
      ]
    },
    { 
      name: "Vintage", 
      icon: BookOpen, 
      count: 29,
      templates: [
        { id: 1, name: "Retro Photo Album", preview: "retro-album", description: "Classic photo album style" },
        { id: 2, name: "Sepia Memories", preview: "sepia-memories", description: "Vintage sepia tone layout" },
        { id: 3, name: "Old Film Strip", preview: "film-strip", description: "Classic film negative style" },
        { id: 4, name: "Antique Frame", preview: "antique-frame", description: "Ornate vintage framing" },
        { id: 5, name: "Newspaper Clipping", preview: "newspaper-style", description: "Vintage newspaper layout" }
      ]
    },
    { 
      name: "Colorful", 
      icon: Palette, 
      count: 61,
      templates: [
        { id: 1, name: "Rainbow Gradient", preview: "rainbow-gradient", description: "Vibrant rainbow colors" },
        { id: 2, name: "Neon Pop Art", preview: "neon-pop", description: "Bright neon aesthetic" },
        { id: 3, name: "Pastel Dream", preview: "pastel-dream", description: "Soft pastel colors" },
        { id: 4, name: "Bold Geometric", preview: "bold-geometric", description: "Bright geometric shapes" },
        { id: 5, name: "Sunset Vibes", preview: "sunset-vibes", description: "Warm sunset colors" }
      ]
    }
  ]
  

  const gridTemplates = [
    { type: 'hexagonal' as GridType, label: 'Hexagonal', icon: Hexagon, preview: '/api/placeholder/80/80', soon: false },
    { type: 'square' as GridType, label: 'Square Grid', icon: Grid3X3, preview: '/api/placeholder/80/80', soon: false },
    { type: 'center-focus' as GridType, label: 'Center Focus', icon: Focus, preview: '/api/placeholder/80/80', soon: false },
    {type: 'custom' as GridType, label: 'Custom', soon: true, icon: Upload, preview: '/api/placeholder/80/80'}
  ];

  const [selectedCategory, setSelectedCategory] = useState("All Templates")
//   const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [filteredCategories, setFilteredCategories] = useState(templateCategories)  

  const renderTemplatesSection = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 mb-4"
        />
      </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: 'hexagonal' as GridType, label: 'Hexagonal', icon: Hexagon, preview: '/api/placeholder/80/80', soon: false },
            { type: 'square' as GridType, label: 'Square Grid', icon: Grid3X3, preview: '/api/placeholder/80/80', soon: false },
            { type: 'center-focus' as GridType, label: 'Center Focus', icon: Focus, preview: '/api/placeholder/80/80', soon: false },
            {type: 'custom' as GridType, label: 'Custom', soon: true, icon: Upload, preview: '/api/placeholder/80/80'}
          ].map(({ type, label, icon: Icon, soon }) => (
            <Button
              key={type}
              variant={selectedGrid === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onGridSelect(type)}
              className="flex flex-col items-center gap-1 h-auto py-3 relative"
            >
                 {soon && (
                           <Badge className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs">
                             soon
                           </Badge>
                         )}
                <Icon className="w-4 h-4" />
                <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
        <SidebarGroup>
              <SidebarGroupLabel className="text-black-700 text-md font-semibold mb-4">Template Categories</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-1">
                  {filteredCategories.map((category) => (
                    <div key={category.name} className="space-y-1">
                      <Button
                        variant={selectedCategory === category.name ? "default" : "ghost"}
                        className={`w-full justify-start h-10 px-3 ${
                          selectedCategory === category.name 
                            ? "bg-gradient-primary text-white " 
                            : "text-black-700 hover:bg-accent"
                        }`}
                        onClick={() => {
                          setSelectedCategory(category.name)
                        //   setExpandedCategory(expandedCategory === category.name ? null : category.name)
                        }}
                      >
                        <category.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span className="text-sm flex-1 text-left truncate">{category.name}</span>
                        <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                          {category.count}
                        </Badge>
                      </Button>
                    
                    </div>
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
      </div>
    </div>
  );

  const renderToolsSection = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Undo2 className="w-4 h-4" />
            Undo
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Redo2 className="w-4 h-4" />
            Redo
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            Shuffle
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">View Controls</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4" />
            Zoom In
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ZoomOut className="w-4 h-4" />
            Zoom Out
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Names
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Grid
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Face Controls</h4>
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Pick Center Face
          </Button>
          <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
            <Star className="w-4 h-4" />
            Highlight Special
          </Button>
          <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Frame Faces
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'templates':
        return renderTemplatesSection();
      case 'uploads':
        return <UploadSection />;
     
      case 'text':
        return <TextSection fabricCanvas={fabricCanvas} />;
     
      case 'tools':
        return renderToolsSection();
      default:
        return renderTemplatesSection();
    }
  };

  return (
    <div className="w-full h-[calc(100vh-100px)] bg-background border-2 rounded-lg flex">
      {/* Navigation */}
      <div className="w-1/4 bg-muted/20 border-r border-border p-6">
        <div className="space-y-4">
          {sidebarSections.map(({ id, label, icon: Icon, soon }) => {
            const isActive = activeSection === id;
            const isModeSection = id === 'uploads' || id === 'templates';
            // const modeIndicator = id === 'uploads' ? '📤' : id === 'templates' ? '⚙️' : '';
            
            return (
              <Button
                key={id}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                className={`w-full h-25 flex flex-col items-center gap-1 p-2 relative ${
                  isModeSection && isActive ? 'ring-2 ring-primary/20' : ''
                }`}
                onClick={() => handleSectionChange(id)}
              >
                <Icon className="w-16 h-16" />
                <span className="text-sm">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Canvas is handled by parent component */}
      </div>
    </div>
  );
};