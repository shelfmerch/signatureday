import React, { useState, useEffect, Suspense, lazy } from "react";
import { GridTemplate, Member } from "@/context/CollageContext";
import { HexagonalGrid } from "./grids/HexagonalGrid";
import { SquareGrid } from "./grids/SquareGrid";
import { GridProvider } from "./square/context/GridContext";
import { HexagonSvgGrid } from "./HexagonSvgGrid";

interface GridPreviewProps {
  template: GridTemplate;
  memberCount: number;
  members?: Member[];
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  activeMember?: Member;
  centerEmptyDefault?: boolean;
  /** Rendered in the center of the grid when provided (e.g. "Waiting for members" + Invite button for hex). */
  emptyCenter?: React.ReactNode;
}

// Hexagon SVG modules and path resolver
const hexagonSvgModules = import.meta.glob('./hexagon/*.svg', { as: 'raw' });
const getHexagonSvgPath = (n: number): string | null => {
  const expected = `${n}.svg`;
  const key = Object.keys(hexagonSvgModules).find(
    (k) => k.endsWith(expected) || k.includes(`hexagon/${expected}`)
  );
  return key ?? null;
};

const AnimatedPreloader = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        {/* Outer rotating ring */}
        <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600"></div>
        {/* Inner pulsing circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-purple-600 rounded-full animate-pulse"></div>
      </div>

      {/* Animated dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 animate-pulse">Processing photos</p>
        <p className="text-xs text-gray-500 mt-1">Optimizing for best quality...</p>
      </div>
    </div>
  );
};

// Helpers: detect and transform Cloudinary URLs for server-side face cropping
const isCloudinaryUrl = (url: string): boolean => {
  return typeof url === 'string' && url.includes('/image/upload');
};

// Insert transformation segment into Cloudinary delivery URL
// Example: https://res.cloudinary.com/<cloud>/image/upload/v123/abc.jpg
//   -> https://res.cloudinary.com/<cloud>/image/upload/c_fill,g_face,w_256,h_256,q_auto,f_auto/v123/abc.jpg
const withCloudinaryTransform = (url: string, transform: string): string => {
  try {
    return url.replace('/image/upload/', `/image/upload/${transform}/`);
  } catch {
    return url;
  }
};

export const GridPreview: React.FC<GridPreviewProps> = ({
  template,
  memberCount,
  members = [],
  size = 'medium',
  activeMember,
  centerEmptyDefault = false,
  emptyCenter,
}) => {
  const [PreviewComp, setPreviewComp] = useState<React.LazyExoticComponent<React.ComponentType> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processedActiveMember, setProcessedActiveMember] = useState<Member | null>(null);
  const [processedMembers, setProcessedMembers] = useState<Member[]>([]);
  // In-memory cache for processed photos to avoid re-running face-api on identical inputs
  const cacheRef = React.useRef<Map<string, string>>(new Map());

  const makeKey = (m: Member) => {
    const id = (m as any).id || (m as any)._id || m.name || 'unknown';
    const p = m.photo || '';
    // Use a short signature to keep keys compact but stable
    return `${id}:${p.length}:${p.slice(0, 64)}`;
  };

  // Map of all TSX components in this folder
  const componentModules = import.meta.glob('./square/*.tsx');

  // Map size to target pixel dimension for Cloudinary transforms
  const targetPx = React.useMemo(() => {
    switch (size) {
      case 'small': return 160;
      case 'medium': return 224;
      case 'xlarge': return 352;
      case 'large':
      default: return 288;
    }
  }, [size]);

  // Helper function to generate cloud transform with member's zoom level
  const getCloudTransform = React.useCallback(
    (zoomLevel?: number) => {
      const zoom = typeof zoomLevel === 'number' ? zoomLevel : 0.4;
      return `c_thumb,g_auto:face,z_${zoom},ar_1:1,w_${targetPx},h_${targetPx},q_auto,f_auto,dpr_auto`;
    },
    [targetPx]
  );

  // Process active member photo with face cropping
  useEffect(() => {
    const processActiveMember = async () => {
      if (!activeMember?.photo) {
        setProcessedActiveMember(null);
        return;
      }

      try {
        // If Cloudinary URL, use server-side subject-aware crop with member's zoom level
        if (!activeMember.photo.startsWith('data:') && isCloudinaryUrl(activeMember.photo)) {
          const memberZoom = (activeMember as any).zoomLevel;
          const transformed = withCloudinaryTransform(activeMember.photo, getCloudTransform(memberZoom));
          setProcessedActiveMember({ ...activeMember, photo: transformed });
          return;
        }
        // For data URLs or non-Cloudinary remote URLs, do not run any client-side face processing.
        // Use the original image as provided.
        setProcessedActiveMember(activeMember);
      } catch (error) {
        console.warn('Face cropping failed for active member:', error);
        // Fallback to original photo
        setProcessedActiveMember(activeMember);
      }
    };

    processActiveMember();
  }, [activeMember, getCloudTransform]);

  // Process existing members photos with face cropping
  useEffect(() => {
    const processMembers = async () => {
      if (!members.length) {
        setProcessedMembers([]);
        return;
      }

      // Process members one by one instead of all at once to avoid resource issues
      const processed = [];

      for (const member of members) {
        if (!member.photo) {
          processed.push(member);
          continue;
        }

        try {
          // If Cloudinary URL, use server-side subject-aware crop with member's zoom level
          if (!member.photo.startsWith('data:') && isCloudinaryUrl(member.photo)) {
            const memberZoom = (member as any).zoomLevel;
            const transformed = withCloudinaryTransform(member.photo, getCloudTransform(memberZoom));
            processed.push({ ...member, photo: transformed });
            continue;
          }
          // For data URLs or non-Cloudinary URLs, keep the original image without client-side face processing
          processed.push(member);
        } catch (error) {
          console.warn('Face cropping failed for member:', member.name, error);
          // Fallback to original photo
          processed.push(member);
        }

        // Add a small delay between processing each member to avoid resource issues
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProcessedMembers(processed);
    };

    processMembers();
  }, [members, getCloudTransform]);

  // Load the specific grid template component based on member count and template type
  useEffect(() => {
    const loadComponentByNumber = async (n: number) => {
      setLoadError(null);
      setPreviewComp(null);

      if (!/^[0-9]+$/.test(`${n}`)) {
        setLoadError('Please enter a valid number.');
        return;
      }

      // For hexagonal template: use HexagonSvgGrid if n.svg exists
      if (template === 'hexagonal' && getHexagonSvgPath(n)) {
        setPreviewComp(null); // HexagonSvgGrid rendered directly, not via PreviewComp
        return;
      }

      // For square template: load square/n.tsx
      const path = `./square/${n}.tsx` as const;
      if (componentModules[path]) {
        try {
          const loader = componentModules[path] as () => Promise<{ default: React.ComponentType<any> }>;
          const LazyComp = lazy(loader);
          setPreviewComp(() => LazyComp);
        } catch (error) {
          console.error('Error loading component:', error);
          setLoadError(`Error loading component ${n}.tsx`);
        }
      } else {
        setLoadError(`Template ${n} will be available soon.`);
      }
    };

    if (memberCount > 0) {
      loadComponentByNumber(memberCount);
    }
  }, [memberCount, template]);

  // Combine all members for the grid display
  const allMembers = [...processedMembers];
  if (processedActiveMember) {
    // Add active member to the beginning so it appears in the center cell
    allMembers.unshift(processedActiveMember);
  }

  // If we have a specific grid template component, use it
  if (PreviewComp) {
    const GridComponent = PreviewComp as React.ComponentType<{
      previewMember?: Member;
      existingMembers?: Member[];
      centerEmptyDefault?: boolean;
    }>;

    // Show loading if members are still being processed
    if (members.length > 0 && processedMembers.length === 0) {
      // return (
      //   <div className="p-6 text-sm text-slate-600 text-center">
      //     Processing member photos...
      //   </div>
      // );
      return <AnimatedPreloader />;
    }

    return (
      <GridProvider>
        <Suspense fallback={<div className="p-6 text-sm text-slate-600">Loading grid template...</div>}>
          {/* Pass the processed active member as a prop to the grid template */}
          <GridComponent
            previewMember={processedActiveMember}
            existingMembers={processedMembers}
            centerEmptyDefault={centerEmptyDefault}
          />
        </Suspense>
      </GridProvider>
    );
  }

  // Show error if there's a loading error
  if (loadError) {
    return (
      <div className="p-6 text-sm text-red-600 text-center">
        {loadError}
      </div>
    );
  }

  // Hexagonal with SVG template: use HexagonSvgGrid (center clip + Cloudinary face crop via processed photos)
  const hexagonSvgPath = getHexagonSvgPath(memberCount);
  if (template === 'hexagonal' && hexagonSvgPath) {
    if (members.length > 0 && processedMembers.length === 0) {
      return <AnimatedPreloader />;
    }
    return (
      <HexagonSvgGrid
        memberCount={memberCount}
        svgPath={hexagonSvgPath}
        previewMember={processedActiveMember}
        existingMembers={processedMembers}
        centerEmptyDefault={centerEmptyDefault}
        size={size}
        emptyCenter={emptyCenter}
      />
    );
  }

  // Fallback to basic grid types if no specific template is found
  const commonProps = {
    memberCount,
    members: allMembers, // Use combined members including active member
    size
  };

  switch (template) {
    case 'hexagonal':
      return <HexagonalGrid {...commonProps} />;
    case 'square':
    default:
      return <SquareGrid {...commonProps} />;
  }
};