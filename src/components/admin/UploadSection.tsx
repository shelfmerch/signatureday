
import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image, 
  Video, 
  FileText, 
  X, 
  Search,
  MoreVertical,
  Trash2,
  Edit3,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'svg';
  url: string;
  size: number;
  uploadProgress: number;
  thumbnail?: string;
}

export const UploadSection = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'image/svg+xml') {
        const fileId = `${Date.now()}-${Math.random()}`;
        const newFile: UploadedFile = {
          id: fileId,
          name: file.name,
          type: file.type.startsWith('video/') ? 'video' : file.type === 'image/svg+xml' ? 'svg' : 'image',
          url: URL.createObjectURL(file),
          size: file.size,
          uploadProgress: 0,
        };

        setUploadedFiles(prev => [...prev, newFile]);

        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            toast({
              title: "Upload Complete",
              description: `${file.name} uploaded successfully`,
            });
          }
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { ...f, uploadProgress: progress } : f)
          );
        }, 200);
      } else {
        toast({
          title: "Unsupported File",
          description: "Please upload images, SVGs, or videos only",
          variant: "destructive",
        });
      }
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  const handleBatchDelete = useCallback(() => {
    setUploadedFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
    setSelectedFiles([]);
    toast({
      title: "Files Deleted",
      description: `${selectedFiles.length} files removed`,
    });
  }, [selectedFiles]);

  const filteredFiles = uploadedFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'svg': return FileText;
      default: return Image;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <h4 className="text-sm font-medium mb-1">Upload Media</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Drag files here or click to browse
        </p>
        <div className="flex gap-2 justify-center">
          <Badge variant="secondary" className="text-xs">Images</Badge>
          <Badge variant="secondary" className="text-xs">SVGs</Badge>
          <Badge variant="secondary" className="text-xs">Videos</Badge>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="mt-3"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.svg"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          className="hidden"
        />
      </div>

      {/* Search and Actions */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search uploads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedFiles.length} selected
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                className="h-6 px-2 text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Files Gallery */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">
          Your Uploads ({filteredFiles.length})
        </h4>
        <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            const isSelected = selectedFiles.includes(file.id);
            const isUploading = file.uploadProgress < 100;
            
            return (
              <Card
                key={file.id}
                className={`relative p-2 cursor-pointer transition-all hover:shadow-sm ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="aspect-square bg-muted rounded-md flex items-center justify-center mb-2 overflow-hidden">
                  {file.type === 'image' ? (
                    <img 
                      src={file.url} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit3 className="w-3 h-3 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-3 h-3 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => removeFile(file.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                    <div className="w-full px-4">
                      <Progress value={file.uploadProgress} className="h-2" />
                      <p className="text-xs text-center mt-1">
                        {Math.round(file.uploadProgress)}%
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};