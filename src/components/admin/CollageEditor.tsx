import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Share2, 
  Palette, 
  Users, 
  Heart, 
  Clock, 
  CheckCircle,
  Copy,
  Mail,
  MessageSquare,
  Vote,
  Trophy,
  Link as LinkIcon,
  TrendingUp,
  Target,
  Zap,
  Star,
  ArrowLeft,
  BarChart3,
  Activity,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Shuffle,
  Crown,
  Settings,
  Image as ImageIcon,
  Grid3X3,
  Hexagon,
  Focus,
  Shirt
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { storageService } from '@/lib/storage';
import { Project, MemberSubmission } from '@/lib/types';
import { useGridTemplates, GridCell } from './GridTemplates';
import { DesignSidebar } from './DesignSidebar';

// CollageStyle type definition
export type CollageStyle = 'hexagonal' | 'square' | 'circular';

interface CollageEditorProps {
  projectId?: string;
}

export const CollageEditor: React.FC<CollageEditorProps> = ({ projectId: propProjectId }) => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId || urlProjectId;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Canvas refs
  const collageCanvasRef = useRef<HTMLCanvasElement>(null);
  const tshirtCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Fabric.js canvas instances
  const [collageCanvas, setCollageCanvas] = useState<fabric.Canvas | null>(null);
  const [tshirtCanvas, setTshirtCanvas] = useState<fabric.Canvas | null>(null);
  
  // Project and data state
  const [project, setProject] = useState<Project | null>(null);
  const [submissions, setSubmissions] = useState<MemberSubmission[]>([]);
  const [winningStyle, setWinningStyle] = useState<CollageStyle>('hexagonal');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
     // Editor state
   const [selectedGrid, setSelectedGrid] = useState<'hexagonal' | 'square' | 'center-focus'>('hexagonal');
   const [isGridVisible, setIsGridVisible] = useState(true);
   const [currentMode, setCurrentMode] = useState<'upload' | 'adjust'>('adjust');
   const [zoomLevel, setZoomLevel] = useState(1);
   const [activeTab, setActiveTab] = useState('design');
  
  // Background state
  const [backgroundType, setBackgroundType] = useState<'color' | 'gradient' | 'pattern' | 'image'>('color');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundGradient, setBackgroundGradient] = useState(null);
  const [backgroundPattern, setBackgroundPattern] = useState(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState([100]);
  const [backgroundBlur, setBackgroundBlur] = useState([0]);
  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([]);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState('');
  
  // Grid configuration
  const [hexColumns, setHexColumns] = useState(8);
  const [hexRows, setHexRows] = useState(8);
  const [squareRows, setSquareRows] = useState(4);
  const [squareColumns, setSquareColumns] = useState(4);
  const [focusCount, setFocusCount] = useState(8);
  
  // Grid template functions
  const { createHexagonalGrid, createSquareGrid, createCenterFocusGrid } = useGridTemplates();
  
  // Load project data
  useEffect(() => {
    if (!projectId) {
      navigate('/my-projects');
      return;
    }

    try {
      const loadedProject = storageService.getProject(projectId);
      if (!loadedProject) {
        navigate('/my-projects');
        return;
      }
      
      setProject(loadedProject);
      setSubmissions(loadedProject.submissions);
      
      // Determine winning style based on votes
      const votes = loadedProject.votes;
      const totalVotes = votes.hexagonal + votes.square + votes.circular;
      
      if (totalVotes > 0) {
        const winningStyle = Object.entries(votes).reduce((a, b) => 
          votes[a[0] as keyof typeof votes] > votes[b[0] as keyof typeof votes] ? a : b
        )[0] as CollageStyle;
        setWinningStyle(winningStyle);
        setSelectedGrid(winningStyle === 'circular' ? 'center-focus' : winningStyle);
      }
      
      // TEMPORARY: Add test submissions if none exist
      if (loadedProject.submissions && loadedProject.submissions.length === 0) {
        console.log('No submissions found, creating test data...');
        const testSubmissions: MemberSubmission[] = [
          {
            id: 'test1',
            projectId: projectId,
            memberId: 'member1',
            name: 'Test User 1',
            photoUrl: '/placeholder.svg',
            uploadedAt: new Date().toISOString(),
            croppedPhotoUrl: '/placeholder.svg'
          },
          {
            id: 'test2',
            projectId: projectId,
            memberId: 'member2',
            name: 'Test User 2',
            photoUrl: '/placeholder.svg',
            uploadedAt: new Date().toISOString(),
            croppedPhotoUrl: '/placeholder.svg'
          },
          {
            id: 'test3',
            projectId: projectId,
            memberId: 'member3',
            name: 'Test User 3',
            photoUrl: '/placeholder.svg',
            uploadedAt: new Date().toISOString(),
            croppedPhotoUrl: '/placeholder.svg'
          },
          {
            id: 'test4',
            projectId: projectId,
            memberId: 'member4',
            name: 'Test User 4',
            photoUrl: '/placeholder.svg',
            uploadedAt: new Date().toISOString(),
            croppedPhotoUrl: '/placeholder.svg'
          },
          {
            id: 'test5',
            projectId: projectId,
            memberId: 'member5',
            name: 'Test User 5',
            photoUrl: '/placeholder.svg',
            uploadedAt: new Date().toISOString(),
            croppedPhotoUrl: '/placeholder.svg'
          }
        ];
        
        // Add test submissions to the project
        testSubmissions.forEach(submission => {
          storageService.saveSubmission(submission);
        });
        
        // Update the project with test submissions
        const updatedProject = {
          ...loadedProject,
          submissions: testSubmissions
        };
        storageService.saveProject(updatedProject);
        
        setSubmissions(testSubmissions);
      }
      
    } catch (err) {
      setError('Failed to load project data');
      console.error('Error loading project:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, navigate]);

  // Initialize Fabric.js canvases
  useEffect(() => {
    if (!collageCanvasRef.current || !tshirtCanvasRef.current) return;

         // Initialize collage canvas with responsive dimensions
     const canvasWidth = Math.min(800, window.innerWidth * 0.8);
     const canvasHeight = Math.min(600, window.innerHeight * 0.6);
     const collageCanvasInstance = new fabric.Canvas(collageCanvasRef.current, {
       width: canvasWidth,
       height: canvasHeight,
       backgroundColor: '#ffffff',
       selection: false,
       preserveObjectStacking: true,
     });

         // Initialize T-shirt canvas with same dimensions
     const tshirtCanvasInstance = new fabric.Canvas(tshirtCanvasRef.current, {
       width: canvasWidth,
       height: canvasHeight,
       backgroundColor: '#ffffff',
       selection: false,
       preserveObjectStacking: true,
     });

    setCollageCanvas(collageCanvasInstance);
    setTshirtCanvas(tshirtCanvasInstance);

    // Cleanup function
    return () => {
      collageCanvasInstance.dispose();
      tshirtCanvasInstance.dispose();
    };
  }, []);

  // Render collage grid when project data or grid type changes
  useEffect(() => {
    if (!collageCanvas || !project || submissions.length === 0) return;

    // Clear existing content
    collageCanvas.clear();

    // Create grid based on selected type and submission count
    console.log(`Creating ${selectedGrid} grid for ${submissions.length} submissions`);
    let gridCells: GridCell[] = [];
    
    switch (selectedGrid) {
      case 'hexagonal':
        gridCells = createHexagonalGrid(collageCanvas, submissions.length);
        break;
      case 'square':
        gridCells = createSquareGrid(collageCanvas, submissions.length);
        break;
      case 'center-focus':
        gridCells = createCenterFocusGrid(collageCanvas, submissions.length);
        break;
    }
    
    console.log(`Created ${gridCells.length} grid cells`);

    // Add grid cells to canvas
    gridCells.forEach(cell => {
      collageCanvas.add(cell.shape);
    });

    // Load and add member images
    submissions.forEach((submission, index) => {
      if (index >= gridCells.length) return; // Skip if more submissions than cells
      
             // Create placeholder with proper size based on grid cell
       const cell = gridCells[index];
       const placeholderSize = cell.type === 'hexagonal' ? cell.size * 1.2 : cell.size;
       const placeholder = new fabric.Rect({
         left: cell.centerX - placeholderSize / 2,
         top: cell.centerY - placeholderSize / 2,
         width: placeholderSize,
         height: placeholderSize,
         fill: `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
         stroke: 'hsl(280, 100%, 60%)',
         strokeWidth: 2,
         selectable: false,
         evented: false,
         originX: 'center',
         originY: 'center',
       });
      collageCanvas.add(placeholder);
      
      // Add text label
      const text = new fabric.Text(`${index + 1}`, {
        left: gridCells[index].centerX,
        top: gridCells[index].centerY,
        fontSize: 16,
        fill: 'white',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      collageCanvas.add(text);
    });

    collageCanvas.renderAll();
  }, [collageCanvas, project, submissions, selectedGrid, focusCount, createHexagonalGrid, createSquareGrid, createCenterFocusGrid]);

     // Render T-shirt mockup
   useEffect(() => {
     if (!tshirtCanvas || !project || submissions.length === 0) return;

     // Clear existing content
     tshirtCanvas.clear();

     // Load T-shirt image from lovable-uploads folder
     // TODO: Fix image loading with fabric.js v6
     // For now, create a simple T-shirt shape
     const tshirtRect = new fabric.Rect({
       left: 100,
       top: 50,
       width: 600,
       height: 500,
       fill: '#ffffff',
       stroke: '#cccccc',
       strokeWidth: 2,
       selectable: false,
       evented: false,
       rx: 20,
       ry: 20,
     });
     tshirtCanvas.add(tshirtRect);
     
     // Create smaller collage overlay on T-shirt (scaled down)
     const originalCanvas = new fabric.Canvas();
     originalCanvas.setDimensions({ width: 300, height: 300 });
     
     let gridCells: GridCell[] = [];
     
     switch (selectedGrid) {
       case 'hexagonal':
         gridCells = createHexagonalGrid(originalCanvas, submissions.length);
         break;
       case 'square':
         gridCells = createSquareGrid(originalCanvas, submissions.length);
         break;
       case 'center-focus':
         gridCells = createCenterFocusGrid(originalCanvas, submissions.length);
         break;
     }

     // Scale and position grid cells for T-shirt
     const tshirtCells: GridCell[] = gridCells.map(cell => ({
       ...cell,
       shape: cell.shape.clone(),
       centerX: 400 + (cell.centerX - 150) * 0.6, // Scale and center on T-shirt
       centerY: 280 + (cell.centerY - 150) * 0.6,
       size: cell.size * 0.6
     }));

     // Scale the T-shirt cell shapes
     tshirtCells.forEach(tshirtCell => {
       tshirtCell.shape.set({
         left: tshirtCell.centerX,
         top: tshirtCell.centerY,
         scaleX: (tshirtCell.shape.scaleX || 1) * 0.6,
         scaleY: (tshirtCell.shape.scaleY || 1) * 0.6,
         originX: 'center',
         originY: 'center',
         strokeWidth: 1,
       });
       tshirtCanvas.add(tshirtCell.shape);
     });

     // Add placeholder images to T-shirt
     submissions.forEach((submission, index) => {
       if (index >= tshirtCells.length) return;
       
               // Create placeholder with proper size based on T-shirt cell
        const cell = tshirtCells[index];
        const placeholderSize = cell.type === 'hexagonal' ? cell.size * 1.2 : cell.size;
        const placeholder = new fabric.Rect({
          left: cell.centerX - placeholderSize / 2,
          top: cell.centerY - placeholderSize / 2,
          width: placeholderSize,
          height: placeholderSize,
          fill: `hsl(${(index * 137.5) % 360}, 70%, 60%)`,
          stroke: 'hsl(280, 100%, 60%)',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
       tshirtCanvas.add(placeholder);
       
       // Add text label
       const text = new fabric.Text(`${index + 1}`, {
         left: tshirtCells[index].centerX,
         top: tshirtCells[index].centerY,
         fontSize: 12,
         fill: 'white',
         fontWeight: 'bold',
         originX: 'center',
         originY: 'center',
         selectable: false,
         evented: false,
       });
       tshirtCanvas.add(text);
     });

     tshirtCanvas.renderAll();
   }, [tshirtCanvas, project, submissions, selectedGrid, focusCount, createHexagonalGrid, createSquareGrid, createCenterFocusGrid]);

  // Canvas controls
  const handleZoomIn = useCallback(() => {
    if (collageCanvas) {
      const newZoom = Math.min(zoomLevel * 1.2, 3);
      setZoomLevel(newZoom);
      collageCanvas.setZoom(newZoom);
      collageCanvas.renderAll();
    }
  }, [collageCanvas, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (collageCanvas) {
      const newZoom = Math.max(zoomLevel / 1.2, 0.3);
      setZoomLevel(newZoom);
      collageCanvas.setZoom(newZoom);
      collageCanvas.renderAll();
    }
  }, [collageCanvas, zoomLevel]);

  const handleReset = useCallback(() => {
    if (collageCanvas) {
      setZoomLevel(1);
      collageCanvas.setZoom(1);
      collageCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      collageCanvas.renderAll();
    }
  }, [collageCanvas]);

  const handleToggleGrid = useCallback(() => {
    setIsGridVisible(!isGridVisible);
    // Toggle grid visibility on canvas
    if (collageCanvas) {
      collageCanvas.getObjects().forEach(obj => {
        if (obj.type === 'polygon' || obj.type === 'rect' || obj.type === 'circle') {
          obj.set('visible', !isGridVisible);
        }
      });
      collageCanvas.renderAll();
    }
  }, [collageCanvas, isGridVisible]);

  // Export functions
  const handleExportCollage = useCallback(() => {
    if (collageCanvas) {
      const dataURL = collageCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      const link = document.createElement('a');
      link.download = `${project?.groupName || 'collage'}-design.png`;
      link.href = dataURL;
      link.click();
      
      toast({
        title: "Collage exported!",
        description: "Your design has been saved as an image.",
      });
    }
  }, [collageCanvas, project, toast]);

  const handleExportTshirt = useCallback(() => {
    if (tshirtCanvas) {
      const dataURL = tshirtCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      const link = document.createElement('a');
      link.download = `${project?.groupName || 'collage'}-tshirt.png`;
      link.href = dataURL;
      link.click();
      
      toast({
        title: "T-shirt mockup exported!",
        description: "Your T-shirt design has been saved as an image.",
      });
    }
  }, [tshirtCanvas, project, toast]);

  // Grid selection handlers
  const handleGridSelect = useCallback((gridType: 'hexagonal' | 'square' | 'center-focus') => {
    setSelectedGrid(gridType);
  }, []);

  const handleShowGrid = useCallback(() => {
    setIsGridVisible(true);
  }, []);

  const handleClearGrid = useCallback(() => {
    setIsGridVisible(false);
  }, []);

  const handleModeChange = useCallback((mode: 'upload' | 'adjust') => {
    setCurrentMode(mode);
  }, []);

  if (isLoading) {
    return (
    
        <div className="max-w-7xl mx-auto p-6 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading collage editor...</p>
        </div>
    
    );
  }

  if (error || !project) {
    return (
    
        <div className="max-w-7xl mx-auto p-6 text-center">
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
              <p className="text-destructive mb-4">{error || 'Project not found'}</p>
              <Button 
                onClick={() => navigate('/my-projects')}
                variant="outline"
              >
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
     
    );
  }

  const submissionRate = (project.submissions.length / project.memberCount) * 100;
  const totalVotes = project.votes.hexagonal + project.votes.square + project.votes.circular;
  const getPercentage = (style: keyof Project['votes']) => {
    if (totalVotes === 0) return 0;
    return Math.round((project.votes[style] / totalVotes) * 100);
  };

  return (
  
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(`/my-project/${projectId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </Button>
            <div className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold">Collage Editor</h1>
            </div>
          </div>
          
                     <div className="flex gap-2">
             <Button 
               onClick={() => navigate(`/preview/${projectId}`)} 
               className="gap-2"
             >
               <CheckCircle className="w-4 h-4" />
               Continue to Preview
             </Button>
           </div>
        </div>

        {/* Project Info */}
        <Card className="bg-gradient-card shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{project.groupName}</h2>
                <p className="text-muted-foreground">{project.occasion}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {project.submissions.length} / {project.memberCount} members
                  </span>
                  <span className="flex items-center gap-1">
                    <Vote className="w-4 h-4" />
                    {totalVotes} total votes
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    {winningStyle} style winning
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <Badge className="bg-green-100 text-green-800">
                  {submissionRate.toFixed(0)}% Complete
                </Badge>
                <Progress value={submissionRate} className="mt-2 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

                 {/* Main Editor */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           {/* Canvas Area */}
           <div className="lg:col-span-3 space-y-4">
             {/* Canvas Tabs */}
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
               <TabsList className="grid w-full grid-cols-2 mb-4">
                 <TabsTrigger value="design" className="gap-2">
                   <Palette className="w-4 h-4" />
                   Design Canvas
                 </TabsTrigger>
                 <TabsTrigger value="tshirt" className="gap-2">
                   <Shirt className="w-4 h-4" />
                   T-Shirt Preview
                 </TabsTrigger>
               </TabsList>

               {/* Design Canvas Tab */}
               <TabsContent value="design">
                 <Card className="bg-gradient-card shadow-elegant">
                   <CardHeader className="pb-3">
                     <CardTitle className="flex items-center justify-between">
                       <span className="flex items-center gap-2">
                         <Palette className="w-5 h-5" />
                         Design Canvas
                         <Badge variant="outline" className="ml-2">
                           {selectedGrid} layout
                         </Badge>
                       </span>
                       <div className="flex gap-2">
                         <Button variant="outline" size="sm" onClick={handleZoomOut}>
                           <ZoomOut className="w-4 h-4" />
                         </Button>
                         <Button variant="outline" size="sm" onClick={handleReset}>
                           <RotateCcw className="w-4 h-4" />
                         </Button>
                         <Button variant="outline" size="sm" onClick={handleZoomIn}>
                           <ZoomIn className="w-4 h-4" />
                         </Button>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={handleToggleGrid}
                           className={isGridVisible ? 'bg-primary text-primary-foreground' : ''}
                         >
                           {isGridVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                         </Button>
                         <Button onClick={handleExportCollage} variant="outline" size="sm" className="gap-2">
                           <Download className="w-4 h-4" />
                           Export
                         </Button>
                       </div>
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="border rounded-lg overflow-hidden bg-white">
                       <canvas ref={collageCanvasRef} className="w-full h-[600px]" />
                     </div>
                     <div className="mt-4 text-center">
                       <p className="text-sm text-muted-foreground">
                         Collage design using {selectedGrid} template with {submissions.length} member photos
                       </p>
                       <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                         <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
                         <span>•</span>
                         <span>Grid: {isGridVisible ? 'Visible' : 'Hidden'}</span>
                         <span>•</span>
                         <span>Mode: {currentMode}</span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>

               {/* T-shirt Preview Tab */}
               <TabsContent value="tshirt">
                 <Card className="bg-gradient-card shadow-elegant">
                   <CardHeader className="pb-3">
                     <CardTitle className="flex items-center justify-between">
                       <span className="flex items-center gap-2">
                         <Shirt className="w-5 h-5" />
                         T-Shirt Preview
                         <Badge variant="outline" className="ml-2">
                           {selectedGrid} layout
                         </Badge>
                       </span>
                       <div className="flex gap-2">
                         <Button onClick={handleExportTshirt} size="sm" className="gap-2">
                           <Download className="w-4 h-4" />
                           Export T-shirt
                         </Button>
                       </div>
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="border rounded-lg overflow-hidden bg-gray-50">
                       <canvas ref={tshirtCanvasRef} className="w-full h-[600px]" />
                     </div>
                     <div className="mt-4 text-center">
                       <p className="text-sm text-muted-foreground">
                         Preview of how your {selectedGrid} collage will look on a T-shirt
                       </p>
                       <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                         <span>{submissions.length} photos</span>
                         <span>•</span>
                         <span>Winning style: {winningStyle}</span>
                         <span>•</span>
                         <span>Ready for printing</span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </TabsContent>
             </Tabs>
           </div>

          {/* Design Sidebar */}
          <div className="lg:col-span-1">
            <DesignSidebar
              selectedGrid={selectedGrid}
              onGridSelect={handleGridSelect}
              onShowGrid={handleShowGrid}
              onClearGrid={handleClearGrid}
              isGridVisible={isGridVisible}
              hexColumns={hexColumns}
              hexRows={hexRows}
              squareRows={squareRows}
              squareColumns={squareColumns}
              focusCount={focusCount}
              onHexColumnsChange={setHexColumns}
              onHexRowsChange={setHexRows}
              onSquareRowsChange={setSquareRows}
              onSquareColumnsChange={setSquareColumns}
              onFocusCountChange={setFocusCount}
              fabricCanvas={collageCanvas}
              backgroundType={backgroundType}
              setBackgroundType={setBackgroundType}
              backgroundColor={backgroundColor}
              setBackgroundColor={setBackgroundColor}
              backgroundGradient={backgroundGradient}
              setBackgroundGradient={setBackgroundGradient}
              backgroundPattern={backgroundPattern}
              setBackgroundPattern={setBackgroundPattern}
              backgroundOpacity={backgroundOpacity}
              setBackgroundOpacity={setBackgroundOpacity}
              backgroundBlur={backgroundBlur}
              setBackgroundBlur={setBackgroundBlur}
              uploadedBackgrounds={uploadedBackgrounds}
              setUploadedBackgrounds={setUploadedBackgrounds}
              selectedBackgroundImage={selectedBackgroundImage}
              setSelectedBackgroundImage={setSelectedBackgroundImage}
              onModeChange={handleModeChange}
              currentMode={currentMode}
            />
          </div>
        </div>

        {/* Voting Results */}
        <Card className="bg-gradient-card shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              Voting Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { style: 'hexagonal' as const, label: 'Hexagonal', icon: Hexagon },
                { style: 'square' as const, label: 'Square Grid', icon: Grid3X3 },
                { style: 'circular' as const, label: 'Circular', icon: Focus }
              ].map(({ style, label, icon: Icon }) => (
                <div key={style} className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <div className="text-2xl font-bold">{project.votes[style]}</div>
                  <div className="text-sm text-muted-foreground">
                    {getPercentage(style)}% of votes
                  </div>
                  <Progress value={getPercentage(style)} className="h-2" />
                  {style === winningStyle && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Star className="w-3 h-3 mr-1" />
                      Winner
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}; 