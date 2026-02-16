
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, Image } from 'lucide-react';
import { toast } from "sonner";

interface ImageUploadProps {
  onImageChange: (file: File | null, preview: string) => void;
  currentPreview?: string;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageChange,
  currentPreview,
  label = "Upload Image"
}) => {
  const [preview, setPreview] = useState<string>(currentPreview || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        onImageChange(file, result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onImageChange(null, '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Image className="h-4 w-4" />
        {label}
      </Label>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Upload preview"
            className="w-full h-32 object-cover rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          onClick={triggerFileInput}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-colors"
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Click to upload an image</p>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;