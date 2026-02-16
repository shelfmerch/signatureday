
// import React, { useEffect, useRef, useState } from 'react';
// import { toast } from 'sonner';
// import {useGrid} from './context/GridContext';
// import { Member } from '@/context/CollageContext';

// interface CellImage {
//   [key: string]: string;
// }

// interface GridBoardProps {
//   previewMember?: Member;
//   existingMembers?: Member[];
//   centerEmptyDefault?: boolean;
// }

// const GridBoard: React.FC<GridBoardProps> = ({ previewMember, existingMembers = [], centerEmptyDefault = false }) => {
//   const {
//     cellImages,
//     setCellImages,
//     isDownloading,
//     getCellStyle,
//     startDrag,
//     handleCellActivate,
//     downloadImage,
//   } = useGrid();

//   // Responsive breakpoint check for desktop
//   const [isDesktop, setIsDesktop] = useState(false);
//   useEffect(() => {
//     // Treat >=1024px as PC/desktop
//     const mq = window.matchMedia('(min-width: 1024px)');
//     const handler = (e: MediaQueryListEvent | MediaQueryList) => {
//       const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
//       setIsDesktop(matches);
//     };
//     // Initialize
//     setIsDesktop(mq.matches);
//     // Subscribe
//     if (mq.addEventListener) {
//       mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
//     } else {
//       // Safari fallback
//       // @ts-ignore
//       mq.addListener(handler);
//     }
//     return () => {
//       if (mq.removeEventListener) {
//         mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
//       } else {
//         // @ts-ignore
//         mq.removeListener(handler);
//       }
//     };
//   }, []);

//   // Unique component-scoped ID helpers
//   const COMP_ID = 'grid-28';
//   const cid = (section: string, row: number, col: number) => `${COMP_ID}:${section}:${row}-${col}`;

//   const handleCellClick = (cellKey: string) => handleCellActivate(cellKey);

//   // Helper function to get cell style with fallback to existing members
//   const getCellStyleWithFallback = (cellKey: string) => {
//     // First try to get style from GridContext
//     const gridStyle = getCellStyle(cellKey);
//     if (gridStyle.backgroundImage) {
//       return gridStyle;
//     }
    
//     // If no image in GridContext, check if we have an existing member for this cell
//     // This handles the case where we're in JoinGroup.tsx preview mode
//     const cellIndex = getCellIndexFromKey(cellKey);
//     if (cellIndex !== -1 && existingMembers[cellIndex]?.photo) {
//       console.log(`Using existing member photo for ${cellKey}:`, existingMembers[cellIndex].name);
//       return {
//         backgroundImage: `url(${existingMembers[cellIndex].photo})`,
//         backgroundSize: 'cover',
//         backgroundPosition: 'center',
//         backgroundRepeat: 'no-repeat',
//       } as React.CSSProperties;
//     }
    
//     return gridStyle;
//   };

//   // Reverse mapping: given a linear member index, return the cell keys
//   // used in both preview and download so we can seed GridContext correctly
//   const getKeysForIndex = (index: number): string[] => {
//     const keys: string[] = [];
//     // Top row 0-7
//     if (index >= 0 && index <= 5) {
//       keys.push(cid('top', 0, index));
//       return keys;
//     }
//     // Left side 8-13 (rows 1..6)
//     if (index >= 6 && index <= 11) {
//       keys.push(cid('left', index - 5, 0));
//       return keys;
//     }
//     // Right side 14-19 (rows 1..6)
//     if (index >= 12 && index <= 17) {
//       keys.push(cid('right', index - 11, 7));
//       return keys;
//     }
//     // Bottom row 18-25 (row 9, cols 0..7)
//     if (index >= 18 && index <= 23) {
//       keys.push(cid('bottom', 6, index - 18));
//       return keys;
//     }
//     // Bottom extension 26-28 (centered 8 cells)
//     if (index >= 28 && index <= 28) {
//       const col = index - 28; // 0..7
//       // Preview variant (row 0) and download variant (row -1)
//       keys.push(cid('bottom-extension', 0, col + 2));
//       keys.push(cid('bottom-extension', -1, col + 2));
//       return keys;
//     }
//     // Bottom-most extension 34-36 (3 cells)
//     if (index >= 34 && index <= 36) {
//       const col = index - 34; // 0..2
//       keys.push(cid('bottom-most-extension', 0, col + 2));
//       keys.push(cid('bottom-most-extension', -1, col + 2));
//       return keys;
//     }
//     // Top extension most 37-44 (8 cells)
//     if (index >= 37 && index <= 44) {
//       const col = index - 37; // 0..7
//       keys.push(cid('topExt-most', 0, col + 2));
//       keys.push(cid('topExt-most', -1, col + 2));
//       return keys;
//     }
//     return keys;
//   };

//   // Helper function to get member index from cell key
//   const getCellIndexFromKey = (cellKey: string) => {
//     // Extract row and column from cell key
//     const parts = cellKey.split(':');
//     if (parts.length < 3) return -1;
    
//     const section = parts[1];
//     const position = parts[2];
//     const [row, col] = position.split('-').map(Number);
    
//     if (section === 'top') {
//       // Top row: 0-5
//       return col;
//     } else if (section === 'left') {
//       // Left side: 6-11
//       return 6 + (row - 1);
//     } else if (section === 'right') {
//       // Right side: 12-17
//       return 12 + (row - 1);
//     } else if (section === 'bottom') {
//       // Bottom row: 18-23
//       return 18 + col;
//     }
    
//     return -1;
//   };

//   // Debug function to log cell styles
//   const debugCellStyle = (cellKey: string) => {
//     const style = getCellStyleWithFallback(cellKey);
//     const cellIndex = getCellIndexFromKey(cellKey);
//     const hasExistingMember = cellIndex !== -1 && existingMembers[cellIndex]?.photo;
    
//     console.log(`Cell ${cellKey}:`, {
//       cellIndex,
//       hasExistingMember,
//       existingMemberPhoto: hasExistingMember ? existingMembers[cellIndex].photo : 'none',
//       gridStyle: getCellStyle(cellKey),
//       finalStyle: style
//     });
    
//     return style;
//   };

//   // Integrate form-uploaded images with GridContext
//   useEffect(() => {
//     if (previewMember?.photo) {
//       // Set the preview member's photo in the center cell
//       setCellImages(prev => ({
//         ...prev,
//         [cid('center', 0, 0)]: previewMember.photo
//       }));
//     }
//   }, [previewMember?.photo, setCellImages, cid]);

//   // Seed GridContext with existingMembers so downloads can see images
//   useEffect(() => {
//     if (!existingMembers || existingMembers.length === 0) return;
//     // Build a single update object to minimize state churn
//     const updates: Record<string, string> = {};

//     existingMembers.forEach((m, idx) => {
//       if (!m?.photo) return;
//       const keys = getKeysForIndex(idx);
//       keys.forEach(k => { updates[k] = m.photo as string; });
//       // Optionally map first member into center, unless center should be empty by default
//       if (idx === 0 && !centerEmptyDefault) {
//         updates[cid('center', 0, 0)] = m.photo as string;
//       }
//     });

//     if (Object.keys(updates).length > 0) {
//       setCellImages(prev => ({ ...prev, ...updates }));
//     }
//   }, [existingMembers, centerEmptyDefault, setCellImages]);

//   // Debug existing members and cell images
//   useEffect(() => {
//     console.log('=== DEBUG INFO ===');
//     console.log('existingMembers:', existingMembers);
//     console.log('existingMembers.length:', existingMembers?.length);
//     console.log('cellImages:', cellImages);
//     console.log('Object.keys(cellImages):', Object.keys(cellImages));
    
//     if (existingMembers && existingMembers.length > 0) {
//       existingMembers.forEach((member, index) => {
//         console.log(`Member ${index}:`, {
//           name: member.name,
//           hasPhoto: !!member.photo,
//           photoLength: member.photo?.length || 0
//         });
//       });
//     }
//     console.log('==================');
//   }, [existingMembers, cellImages]);

//   // Canvas helpers and renderer for this 8x10 layout
//   const loadImage = (src: string) =>
//     new Promise<HTMLImageElement>((resolve, reject) => {
//       const img = new Image();
//       img.crossOrigin = 'anonymous';
//       img.onload = () => resolve(img);
//       img.onerror = reject;
//       img.src = src;
//     });

//   const drawImageCover = (
//     ctx: CanvasRenderingContext2D,
//     img: HTMLImageElement,
//     dx: number,
//     dy: number,
//     dw: number,
//     dh: number
//   ) => {
//     const sRatio = img.width / img.height;
//     const dRatio = dw / dh;
//     let sx = 0, sy = 0, sw = img.width, sh = img.height;
//     if (sRatio > dRatio) {
//       sh = img.height;
//       sw = sh * dRatio;
//       sx = (img.width - sw) / 2;
//     } else {
//       sw = img.width;
//       sh = sw / dRatio;
//       sy = (img.height - sh) / 2;
//     }
//     ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
//   };

//   const buildAndDownload = async () => {
//     if (!Object.keys(cellImages).length) {
//       toast.error('Please upload at least one image before downloading.');
//       return;
//     }

//     try {
//       await downloadImage('template-45.png', {
//         cols: 8,
//         rows: 9, // Increased to include both top extension rows and both bottom extension rows
//         // Target physical size for print within requested ranges
//         targetWidthIn: 8,
//         targetHeightIn: 13.5,
//         dpi: 300,
//         desiredGapPx: 4,
//         draw: async ({ drawKey, ctx, width, height }) => {
//           // Calculate cell dimensions
//           const cellWidth = width / 8;
//           const cellHeight = height / 8;
          
//           // Constants for layout
//           const extensionCells = 8;
//           const endCol = 3.5;  // For centered cells

//           // 1. Draw first top extension row (8 cells)
//           // await Promise.all(Array.from({ length: extensionCells }, (_, i) => 
//           //   drawKey(
//           //     cid('topExt-most', -1, i + 2),
//           //     0,  // First row
//           //     0 + i,
//           //     1,
//           //     1
//           //   )
//           // ));

//           // 2. Draw second top extension row (8 cells)
//           // await Promise.all(Array.from({ length: extensionCells }, (_, i) => 
//           //   drawKey(
//           //     cid('topExt', -1, i + 2),
//           //     1,  // Second row
//           //     i,
//           //     1,
//           //     1
//           //   )
//           // ));

//           // 3. Draw main top row (8 cells)
//           for (let c = 0; c < 8; c++) {
//             await drawKey(cid('top', 0, c), 0, c);
//           }

//           // 4. Draw left side (6 cells)
//           for (let r = 1; r <= 6; r++) {
//             await drawKey(cid('left', r, 0), r + 0, 0);
//           }

//           // 5. Draw center cell (spans 6x6)
//           await drawKey(cid('center', 0, 0), 1, 1, 6, 6);

//           // 6. Draw right side (6 cells)
//           for (let r = 1; r <= 6; r++) {
//             await drawKey(cid('right', r, 7), r + 0, 7);
//           }

//           // 7. Draw bottom row (8 cells)
//           const bottomRow = 7;
//           for (let c = 0; c < 8; c++) {
//             await drawKey(cid('bottom', 9, c), bottomRow, c, 1, 1);
//           }

//           // 8. Draw first bottom extension row (8 cells)
//           await Promise.all(Array.from({ length: extensionCells }, (_, i) => 
//             drawKey(
//               cid('bottom-extension', -1, i + 2),
//               8,  // First bottom extension row
//               1.5+i,
//               1,
//               1
//             )
//           ));

//           // 9. Draw second bottom extension row (3 cells centered)
//           // await Promise.all(Array.from({ length: 3 }, (_, i) => 
//           //   drawKey(
//           //     cid('bottom-most-extension', -1, i + 2),
//           //     9,  // Second bottom extension row
//           //     2.5 + i,  // More centered for 3 cells
//           //     1,
//           //     1
//           //   )
//           // ));
//         },
//       });
//       toast.success('Template downloaded successfully!');
//     } catch (error) {
//       console.error('Download error:', error);
//       toast.error('Failed to download template. Please try again.');
//     }


    
//   };

//   const handleDownload = buildAndDownload;

//   // Listen to a global download trigger from the parent preview container
//   useEffect(() => {
//     const onDownload = async () => {
//       try {
//         await handleDownload();
//       } catch (error) {
//         console.error('Download handler error:', error);
//         toast.error('Failed to process download request');
//       }
//     };
//     window.addEventListener('grid-template-download', onDownload);
//     return () => window.removeEventListener('grid-template-download', onDownload);
//   }, [handleDownload]);


//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">

//       <div
//         className="grid grid-cols-7 bg-white rounded-xl shadow-2xl p-1 md:p-3"
//         style={{
//           gap: 'var(--gap)',
//           // 7 gaps across 8 cols/rows
//           // cell = min(fit width, fit height)
//           // ratio keeps cells slightly taller than wide
//           // pad approximates container padding on mobile
//           ['--gap' as any]: '2px',
//           ['--pad' as any]: '8px',
//           ['--cell' as any]: isDesktop
//             ? 'min(calc((35vw - (var(--pad)*2) - (7 * var(--gap))) / 8), calc((100vh - (var(--pad)*2) - (7 * var(--gap))) / 8))'
//             : 'min(calc((100vw - (var(--pad)*2) - (7 * var(--gap))) / 8), calc((100vh - (var(--pad)*2) - (7 * var(--gap))) / 8))',
//           ['--ratio' as any]: '1.2',
//           ['--row' as any]: 'calc(var(--cell) * var(--ratio))',
//           gridAutoRows: 'var(--row)',
//           gridTemplateColumns: 'repeat(8, var(--cell))'
//         } as React.CSSProperties}
//       >
        
//          {/* Top extension - 1 cells centered (non-intrusive full-row) */}
//          <div className="col-span-8">
//          <div
//             className="grid"
//             style={{
//               display: 'grid',
//               gap: 'var(--gap)',
//               gridAutoFlow: 'column',
//               gridAutoColumns: 'var(--cell)',
//               gridAutoRows: 'var(--row)',
//               justifyContent: 'center',
//             } as React.CSSProperties}
//           >
//           {Array.from({ length: 6 }, (_, colIndex) => {
//             const cellKey = cid('top', 0, colIndex );
//             return (
//               <div
//                 key={cellKey}
//                 className="grid-cell relative overflow-hidden"
//                 style={{ ...(getCellStyle(cellKey) as any) }}
//                 onClick={() => handleCellClick(cellKey)}
//                 role="button"
//                 tabIndex={0}
//                 onKeyDown={(e) => {
//                   if (e.key === 'Enter' || e.key === ' ') {
//                     e.preventDefault();
//                     handleCellClick(cellKey);
//                   }
//                 }}
//               >
//                 {!cellImages[cellKey] && (
//                   <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
//                     +
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//           </div>
//         </div>

//         {/* Top row - 9 cells */}
//         {/* {Array.from({ length: 7 }, (_, colIndex) => {
//           const cellKey = cid('top', 0, colIndex);
          
//           return (
//             <div
//               key={cellKey}
//               className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
//               style={debugCellStyle(cellKey)}
//               onClick={() => handleCellClick(cellKey)}
//               role="button"
//               tabIndex={0}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' || e.key === ' ') {
//                   e.preventDefault();
//                   handleCellClick(cellKey);
//                 }
//               }}
//             >
//               {!cellImages[cellKey] && (
//                 <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
//                   +
//                 </div>
//               )}
//             </div>
//           );
//         })} */}

//         {/* Middle rows with left border, center cell, and right border */}
//         {Array.from({ length: 6 }, (_, rowIndex) => (
//           <React.Fragment key={`middle-row-${rowIndex}`}>
//             {/* Left border cell */}
//             <div
//               className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
//               style={getCellStyleWithFallback(cid('left', rowIndex + 1, 0))}
//               onClick={() => handleCellClick(cid('left', rowIndex + 1, 0))}
//               role="button"
//               tabIndex={0}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' || e.key === ' ') {
//                   e.preventDefault();
//                   handleCellClick(cid('left', rowIndex + 1, 0));
//                 }
//               }}
//             >
//               {!cellImages[cid('left', rowIndex + 1, 0)] && (
//                 <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
//                   +
//                 </div>
//               )}
//             </div>

//             {/* Center cell - only render once and span 6 columns */}
//             {rowIndex === 0 && (
//               <div
//                 className="col-span-6 row-span-6 grid-cell active:animate-grid-pulse flex items-center justify-center text-white font-bold text-lg relative overflow-hidden"
//                 style={(() => {
//                   // 1) If user has uploaded a preview photo, show it
//                   if (previewMember?.photo) {
//                     return {
//                       backgroundImage: `url(${previewMember.photo})`,
//                       backgroundSize: 'cover',
//                       backgroundPosition: 'center',
//                       backgroundRepeat: 'no-repeat',
//                     } as React.CSSProperties;
//                   }
//                   // 2) If center must stay empty by default (JoinGroup), do not auto-fill from existing members
//                   if (centerEmptyDefault) {
//                     return getCellStyle(cid('center', 0, 0));
//                   }
//                   // 3) Otherwise (Editor), allow auto-fill from first existing member
//                   if (existingMembers.length > 0 && existingMembers[0]?.photo) {
//                     return {
//                       backgroundImage: `url(${existingMembers[0].photo})`,
//                       backgroundSize: 'cover',
//                       backgroundPosition: 'center',
//                       backgroundRepeat: 'no-repeat',
//                     } as React.CSSProperties;
//                   }
//                   // 4) Fallback: GridContext styling
//                   return getCellStyle(cid('center', 0, 0));
//                 })()}
//                 onClick={() => handleCellClick(cid('center', 0, 0))}
//                 role="button"
//                 tabIndex={0}
//               >
//                 {(!previewMember?.photo && (
//                     centerEmptyDefault
//                       ? !cellImages[cid('center', 0, 0)] // JoinGroup: show placeholder if no uploaded center
//                       : (!existingMembers[0]?.photo && !cellImages[cid('center', 0, 0)])
//                   )) && (
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <span>CENTER</span>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Right border cell */}
//             <div
//               className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
//               style={getCellStyleWithFallback(cid('right', rowIndex + 1, 7))}
//               onClick={() => handleCellClick(cid('right', rowIndex + 1, 7))}
//               role="button"
//               tabIndex={0}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter' || e.key === ' ') {
//                   e.preventDefault();
//                   handleCellClick(cid('right', rowIndex + 1, 7));
//                 }
//               }}
//             >
//               {!cellImages[cid('right', rowIndex + 1, 7)] && (
//                 <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
//                   +
//                 </div>
//               )}
//             </div>
//           </React.Fragment>
//         ))}

//         <div className="col-span-8">
//           <div
//             className="grid"
//             style={{
//               display: 'grid',
//               gap: 'var(--gap)',
//               gridAutoFlow: 'column',
//               gridAutoColumns: 'var(--cell)',
//               gridAutoRows: 'var(--row)',
//               justifyContent: 'center',
//             } as React.CSSProperties}
//           >
//             {Array.from({ length: 6 }, (_, colIndex) => {
//               const key = cid('bottom', 6, colIndex);
              
//               return (
//                 <div
//                   key={key}
//                   className="grid-cell relative overflow-hidden"
//                   style={getCellStyleWithFallback(key)}
//                   onMouseDown={(e) => startDrag(e, key)}
//                   onTouchStart={(e) => startDrag(e, key)}
//                   onClick={() => handleCellActivate(key)}
//                   role="button"
//                   tabIndex={0}
//                   onKeyDown={(e) => {
//                     if (e.key === 'Enter' || e.key === ' ') {
//                       e.preventDefault();
//                       handleCellActivate(key);
//                     }
//                   }}
//                 >
//                   {!cellImages[key] && (
//                     <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
//                       +
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//       </div>
      
      

//     </div>
//   );
// };

// export default GridBoard;

import React, { useEffect, useMemo, useRef, useState } from "react";

interface HexCellProps {
  row: number;
  col: number;
  isVisible: boolean;
  active?: boolean;            // NEW
  onClick?: () => void;
}

const HexCell: React.FC<HexCellProps> = ({ row, col, isVisible, active, onClick }) => {
  if (!isVisible) {
    return <div className="w-[60px] h-[52px] sm:w-[80px] sm:h-[69px] lg:w-[100px] lg:h-[87px]" />;
  }

  return (
    <div
      className={`hex-cell hex-cell--cyan ${active ? "hex-cell--active" : ""} cursor-pointer`}
      onClick={onClick}
      data-row={row}
      data-col={col}
      // override the fill when active
      style={{
        background: active ? "#22c55e" : undefined,
        backgroundImage: active ? "none" : undefined,
        zIndex: active ? 10 : undefined,
        borderColor: active ? "#16a34a" : undefined,
      }}
    />
  );
};

const GridBoard: React.FC = () => {
  // rows config (kept as you had it)
  const gridConfig = [
    // { cells: 6, offset: true },
    // { cells: 7, offset: false },
    // { cells: 6, offset: true },
    // { cells: 6, offset: false },
    { cells: 5, offset: true },
    { cells: 6, offset: false },
    { cells: 5, offset: true },
    { cells: 6, offset: false },
    { cells: 5, offset: false },
    { cells: 6, offset: true },
    { cells: 5, offset: false },
    // { cells: 6, offset: true },
    // { cells: 8, offset: true },
    // { cells: 7, offset: false },
    // { cells: 6, offset: false },
  ];

  // track which cells are green
  const keyOf = (r: number, c: number) => `${r}:${c}`;
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});

  const isCellVisible = (_rowIndex: number, _colIndex: number): boolean => true;

  const handleCellClick = (row: number, col: number) => {
    const k = keyOf(row, col);
    setActiveMap(prev => ({ ...prev, [k]: !prev[k] })); // toggle green
    console.log(`Clicked hex cell at row ${row + 1}, col ${col + 1}`);
  };

  // Merge specification (0-based indices) matching your request
  const mergePlan: Record<number, { startIdx: number; count: number }> = useMemo(() => ({
    // 3: { startIdx: 3, count: 2 },  // row 4: 4,5
    // 3: { startIdx: 3, count: 1 },  // row 5: 4,5,6
    1: { startIdx: 2, count: 2 },  // row 6: 3-6
    2: { startIdx: 1, count: 3 },  // row 7: 3-7
    3: { startIdx: 1, count: 4 },  // row 8: 2-7
    4: { startIdx: 1, count: 3 },  // row 9: 3-7
    5: { startIdx: 2, count: 2 },  // row 10: 3-6
    // 9: { startIdx: 3, count: 1 }, // row 11: 4-6
    // 11: { startIdx: 3, count: 2 }, // row 12: 4,5
  }), []);

  // ========================================================================
  // SVG MERGED CENTER REGION - GEOMETRY-BASED GAP IMPLEMENTATION
  // ========================================================================
  // 
  // Gap Strategy: We use a WHITE STROKE on the merged region to create 
  // uniform visual gaps. This avoids coordinate mismatches between DOM cells
  // and SVG overlay.
  //
  // Key constants:
  // - HEX_SIZE: radius of each hexagon in SVG coordinates
  // - GAP_STROKE: stroke width that creates visual gap (matches DOM margin)
  // - CENTER_RADIUS: hex distance from origin that defines "center" region
  //
  // IMPORTANT: To adjust gap width, modify GAP_STROKE. Do NOT tune HEX_SIZE
  // for gap purposes - that causes non-uniform gaps in different directions.
  // ========================================================================

  const HEX_SIZE = 28;              // SVG hex radius (base geometric size)
  const GAP_STROKE = 2;             // Stroke width for gap (~1px margin like DOM cells)
  const CENTER_HEX_SIZE = HEX_SIZE; // Center hexes use same size
  const FILL = "#22c55e";           // Green fill
  const BACKGROUND_COLOR = "#f1f5f9"; // Background color for stroke gap (slate-100)

  // TUNABLES for Merge Center Fix
  const INNER_OVERLAP = 1.12;       // Overlap factor for inner underlay hexes
  const INNER_STROKE = 8;           // Stroke width for inner underlay hexes
  const SEAM_STROKE = 14;           // Stroke width for top/bottom seam patches
  const ROW_EPS = 8;                // Tolerance for detecting rows by cy

  // Axial hex distance (proper hex-grid distance, not Euclidean)
  // Uses cube coordinate system: s = -q - r
  const hexDistance = (q1: number, r1: number, q2: number, r2: number) => {
    const s1 = -q1 - r1;
    const s2 = -q2 - r2;
    return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
  };

  // Define the merged center region using proper axial coordinates
  // Center is at (0,0), we include all hexes within CENTER_RADIUS hex distance
  const CENTER_RADIUS = 2;

  // Generate axial coordinates for the full hex grid area
  const generateAxialGrid = (radius: number) => {
    const cells: Array<{ q: number; r: number }> = [];
    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (hexDistance(q, r, 0, 0) <= radius) {
          cells.push({ q, r });
        }
      }
    }
    return cells;
  };

  // Check if a cell is in the center region
  const isInCenter = (q: number, r: number) => hexDistance(q, r, 0, 0) <= CENTER_RADIUS;

  // Convert axial to pixel coordinates (pointy-top hex)
  const axialToPixelCoord = (q: number, r: number, size: number): [number, number] => {
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * 1.5 * r;
    return [x, y];
  };

  // Generate center cell pixel positions
  const centerCells = useMemo(() => {
    return generateAxialGrid(CENTER_RADIUS)
      .filter(({ q, r }) => isInCenter(q, r))
      .map(({ q, r }) => axialToPixelCoord(q, r, HEX_SIZE));
  }, []);

  // Build hex polygon points string for SVG (pointy-top orientation)
  // No scaling distortion - all hexes have uniform geometry
  const getHexPoints = (cx: number, cy: number, size: number) => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
      // Pointy-top: angles at -90, -30, 30, 90, 150, 210 degrees
      const angle = (-90 + i * 60) * (Math.PI / 180);
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      pts.push([x, y]);
    }
    return pts.map(([x, y]) => `${x},${y}`).join(" ");
  };


  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  // Track the actual DOM positions of hidden cells for SVG alignment
  const [hiddenCellPositions, setHiddenCellPositions] = useState<Array<{ cx: number; cy: number; width: number; height: number }>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [centerImage, setCenterImage] = useState<string | null>(null);

  // No-op handlers to keep no-drag behavior while satisfying requested structure
  const handleSvgPointerMove = (_e: React.PointerEvent<SVGSVGElement>) => { };
  const endDrag = (_e?: React.PointerEvent<SVGSVGElement>) => { };
  const handleCenterClick = () => {
    console.log('[HexGrid] Center/outer clicked -> opening file picker');
    // Trigger hidden file input for image selection
    fileInputRef.current?.click();
  };
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('[HexGrid] File selected:', file.name, file.type, file.size);
    const url = URL.createObjectURL(file);
    setCenterImage(url);
    // allow re-selecting the same file later
    e.currentTarget.value = '';
  };

  // Note: axialToPixelCoord is now defined above in the geometry section

  // Measure container size AND hidden cell positions for SVG alignment
  useEffect(() => {
    const measure = () => {
      const root = containerRef.current;
      if (!root) return;

      const containerBox = root.getBoundingClientRect();
      setOverlaySize({ w: Math.round(containerBox.width), h: Math.round(containerBox.height) });

      // Find all center cells that are part of merged region
      // These have data-center="true" attribute
      const centerCellElements = root.querySelectorAll('[data-center="true"]');
      const positions: Array<{ cx: number; cy: number; width: number; height: number }> = [];

      centerCellElements.forEach((cell) => {
        const cellBox = cell.getBoundingClientRect();
        // Convert to container-relative coordinates (SVG viewBox will be set to match container)
        const cx = cellBox.left - containerBox.left + cellBox.width / 2;
        const cy = cellBox.top - containerBox.top + cellBox.height / 2;
        positions.push({
          cx,
          cy,
          width: cellBox.width,
          height: cellBox.height
        });
      });

      setHiddenCellPositions(positions);
    };

    // Initial measure after a small delay to ensure layout is complete
    const timeout = setTimeout(measure, 100);
    const onResize = () => requestAnimationFrame(measure);
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="grid-container">
      <div className="relative" ref={containerRef}>
        <div className="flex flex-col items-center">
          {gridConfig.map((row, rowIndex) => {
            // Merge plan (1-based rows/cols as per request), converted to 0-based indices here
            const spec = mergePlan[rowIndex];

            if (spec && row.cells >= spec.startIdx + spec.count) {
              const pre = Array.from({ length: spec.startIdx });
              const post = Array.from({ length: row.cells - (spec.startIdx + spec.count) });

              return (
                <div key={rowIndex} className={`hex-row ${row.offset ? "offset" : ""}`}>
                  {pre.map((_, colIndex) => {
                    const k = keyOf(rowIndex, colIndex);
                    return (
                      <HexCell
                        key={k}
                        row={rowIndex}
                        col={colIndex}
                        isVisible={isCellVisible(rowIndex, colIndex)}
                        active={!!activeMap[k]}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      />
                    );
                  })}


                  {/* Center cells - visible with gaps, background layer shows through */}
                  {/* Keep data attributes for DOM position measurement */}
                  {Array.from({ length: spec.count }, (_, i) => {
                    const colIndex = spec.startIdx + i;
                    const k = keyOf(rowIndex, colIndex);
                    return (
                      <div
                        key={k}
                        className="hex-cell hex-cell-center"
                        data-row={rowIndex}
                        data-col={colIndex}
                        data-center="true"
                        style={{
                          // Transparent so background layer shows through gaps
                          background: "transparent",
                          // Remove any border that might cause visible gaps
                          border: "none",
                          pointerEvents: "none"
                        }}
                      />
                    );
                  })}

                  {post.map((_, postIdx) => {
                    const colIndex = spec.startIdx + spec.count + postIdx;
                    const k = keyOf(rowIndex, colIndex);
                    return (
                      <HexCell
                        key={k}
                        row={rowIndex}
                        col={colIndex}
                        isVisible={isCellVisible(rowIndex, colIndex)}
                        active={!!activeMap[k]}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      />
                    );
                  })}
                </div>
              );
            }

            // Default: no merge in this row
            return (
              <div key={rowIndex} className={`hex-row ${row.offset ? "offset" : ""}`}>
                {Array.from({ length: row.cells }, (_, colIndex) => {
                  const k = keyOf(rowIndex, colIndex);
                  return (
                    <HexCell
                      key={k}
                      row={rowIndex}
                      col={colIndex}
                      isVisible={isCellVisible(rowIndex, colIndex)}
                      active={!!activeMap[k]}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                    />
                  );
                })}
              </div>
            );

          })}
        </div>
        {/* ============================================================
            BACKGROUND LAYER (z-index: 1)
            - Sits BEHIND the hex cells
            - Shows through the gaps between center hex cells
            - Provides solid color or image fill for merged center region
            ============================================================ */}
        {overlaySize.w > 0 && overlaySize.h > 0 && hiddenCellPositions.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${overlaySize.w} ${overlaySize.h}`}
            style={{ zIndex: 1, pointerEvents: "none" }}
            shapeRendering="geometricPrecision"
          >
            {/* Scaled group to create extra gap between green center and cyan ring */}
            {/* shrinking the whole union preserves internal overlap while pulling edges away from neighbors */}
            <g style={{
              transform: "scale(0.95)",
              transformOrigin: `${overlaySize.w / 2}px ${overlaySize.h / 2}px`
            }}>
              <defs>
                {/* Clip path for background - slight overlap to ensure full coverage */}
                <clipPath id="clip-center-bg" clipPathUnits="userSpaceOnUse">
                  {hiddenCellPositions.map(({ cx, cy, width }, i) => {
                    // 1.3 to ensure robust overlap for solid shape
                    const OVERLAP_FACTOR = 1.30;
                    const hexRadius = (width / 2) * OVERLAP_FACTOR;
                    return (
                      <polygon key={`bg-${i}`} points={getHexPoints(cx, cy, hexRadius)} />
                    );
                  })}
                </clipPath>
              </defs>

              {/* Background fill - visible through gaps in center hex cells */}
              <g clipPath="url(#clip-center-bg)">
                {centerImage ? (
                  <image
                    href={centerImage}
                    x={0}
                    y={0}
                    width={overlaySize.w}
                    height={overlaySize.h}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <rect
                    x={0}
                    y={0}
                    width={overlaySize.w}
                    height={overlaySize.h}
                    fill={FILL}
                  />
                )}
              </g>
            </g>
          </svg>
        )}

        {/* ============================================================
            OVERLAY LAYER (z-index: 10)
            - Sits ABOVE the hex cells
            - Used ONLY for click handling on the center region
            - Transparent fill, no visual appearance
            ============================================================ */}
        {overlaySize.w > 0 && overlaySize.h > 0 && hiddenCellPositions.length > 0 && (
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${overlaySize.w} ${overlaySize.h}`}
            style={{ zIndex: 10, pointerEvents: "none" }}
          >
            <defs>
              {/* Clip path for click area - matches visible hex size */}
              <clipPath id="clip-center-click" clipPathUnits="userSpaceOnUse">
                {hiddenCellPositions.map(({ cx, cy, width }, i) => {
                  const hexRadius = width / 2;
                  return (
                    <polygon key={`click-${i}`} points={getHexPoints(cx, cy, hexRadius)} />
                  );
                })}
              </clipPath>
            </defs>

            {/* Transparent click target for center region */}
            <g clipPath="url(#clip-center-click)">
              <rect
                x={0}
                y={0}
                width={overlaySize.w}
                height={overlaySize.h}
                fill="transparent"
                style={{ cursor: "pointer", pointerEvents: "auto" }}
                onClick={handleCenterClick}
              />
            </g>
          </svg>
        )}
        {/* Hidden file input for center image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        />
      </div>
    </div>
  );
};

export default GridBoard;


