
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {useGrid} from './context/GridContext';
import { Member } from '@/context/CollageContext';

interface CellImage {
  [key: string]: string;
}

interface GridBoardProps {
  previewMember?: Member;
  existingMembers?: Member[];
  centerEmptyDefault?: boolean;
}

const GridBoard: React.FC<GridBoardProps> = ({ previewMember, existingMembers = [], centerEmptyDefault = false }) => {
  const {
    cellImages,
    setCellImages,
    isDownloading,
    getCellStyle,
    startDrag,
    handleCellActivate,
    downloadImage,
  } = useGrid();

  // Responsive breakpoint check for desktop
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    // Treat >=1024px as PC/desktop
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setIsDesktop(matches);
    };
    // Initialize
    setIsDesktop(mq.matches);
    // Subscribe
    if (mq.addEventListener) {
      mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    } else {
      // Safari fallback
      // @ts-ignore
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
      } else {
        // @ts-ignore
        mq.removeListener(handler);
      }
    };
  }, []);

  // Unique component-scoped ID helpers
  const COMP_ID = 'grid-31';
  const cid = (section: string, row: number, col: number) => `${COMP_ID}:${section}:${row}-${col}`;

  const handleCellClick = (cellKey: string) => handleCellActivate(cellKey);

  // Helper function to get cell style with fallback to existing members
  const getCellStyleWithFallback = (cellKey: string) => {
    // First try to get style from GridContext
    const gridStyle = getCellStyle(cellKey);
    if (gridStyle.backgroundImage) {
      return gridStyle;
    }
    
    // If no image in GridContext, check if we have an existing member for this cell
    // This handles the case where we're in JoinGroup.tsx preview mode
    const cellIndex = getCellIndexFromKey(cellKey);
    if (cellIndex !== -1 && existingMembers[cellIndex]?.photo) {
      console.log(`Using existing member photo for ${cellKey}:`, existingMembers[cellIndex].name);
      return {
        backgroundImage: `url(${existingMembers[cellIndex].photo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      } as React.CSSProperties;
    }
    
    return gridStyle;
  };

  // Reverse mapping: given a linear member index, return the cell keys
  // used in both preview and download so we can seed GridContext correctly
  const getKeysForIndex = (index: number): string[] => {
    const keys: string[] = [];
    // Top row 0-6
    if (index >= 0 && index <= 6) {
      keys.push(cid('top', 0, index));
      return keys;
    }
    // Left side 8-13 (rows 1..6)
    if (index >= 7 && index <= 11) {
      keys.push(cid('left', index - 6, 0));
      return keys;
    }
    // Right side 14-19 (rows 1..6)
    if (index >= 12 && index <= 16) {
      keys.push(cid('right', index - 11, 7));
      return keys;
    }
    // Bottom row 18-25 (row 9, cols 0..7)
    if (index >= 17 && index <= 23) {
      keys.push(cid('bottom', 9, index - 17));
      return keys;
    }
    // Bottom extension 26-28 (centered 8 cells)
    if (index >= 24 && index <= 27) {
      const col = index - 24; // 0..7
      // Preview variant (row 0) and download variant (row -1)
      keys.push(cid('bottom-extension', 0, col + 2));
      keys.push(cid('bottom-extension', -1, col + 2));
      return keys;
    }
    
    // Top most extension  37-44 (8 cells)
    if (index >= 28 && index <= 31) {
      const col = index - 28; // 0..7
      keys.push(cid('top-extension', 0, col + 2));
      keys.push(cid('top-extension', -1, col + 2));
      return keys;
    }
    return keys;
  };

  // Helper function to get member index from cell key
  const getCellIndexFromKey = (cellKey: string) => {
    // Extract row and column from cell key
    const parts = cellKey.split(':');
    if (parts.length < 3) return -1;
    
    const section = parts[1];
    const position = parts[2];
    const [row, col] = position.split('-').map(Number);
    
    if (section === 'top') {
      // Top row: 0-7
      return col;
    } else if (section === 'left') {
      // Left side: 8-13
      return 8 + (row - 1);
    } else if (section === 'right') {
      // Right side: 14-19
      return 14 + (row - 1);
    } else if (section === 'bottom') {
      // Bottom row: 18-25
      return 18 + col;
    }else if (section === 'bottom-extension') {
      console.log("bottom-extension mapping → row:", row, "col:", col, "index:", 26 + col);
      return 26 + col;
    }
    
    return -1;
  };

  // Debug function to log cell styles
  const debugCellStyle = (cellKey: string) => {
    const style = getCellStyleWithFallback(cellKey);
    const cellIndex = getCellIndexFromKey(cellKey);
    const hasExistingMember = cellIndex !== -1 && existingMembers[cellIndex]?.photo;
    
    console.log(`Cell ${cellKey}:`, {
      cellIndex,
      hasExistingMember,
      existingMemberPhoto: hasExistingMember ? existingMembers[cellIndex].photo : 'none',
      gridStyle: getCellStyle(cellKey),
      finalStyle: style
    });
    
    return style;
  };

  // Integrate form-uploaded images with GridContext
  useEffect(() => {
    if (previewMember?.photo) {
      // Set the preview member's photo in the center cell
      setCellImages(prev => ({
        ...prev,
        [cid('center', 0, 0)]: previewMember.photo
      }));
    }
  }, [previewMember?.photo, setCellImages, cid]);

  // Seed GridContext with existingMembers so downloads can see images
  useEffect(() => {
    if (!existingMembers || existingMembers.length === 0) return;
    // Build a single update object to minimize state churn
    const updates: Record<string, string> = {};

    existingMembers.forEach((m, idx) => {
      if (!m?.photo) return;
      const keys = getKeysForIndex(idx);
      keys.forEach(k => { updates[k] = m.photo as string; });
      // Optionally map first member into center, unless center should be empty by default
      if (idx === 0 && !centerEmptyDefault) {
        updates[cid('center', 0, 0)] = m.photo as string;
      }
    });

    if (Object.keys(updates).length > 0) {
      setCellImages(prev => ({ ...prev, ...updates }));
    }
  }, [existingMembers, centerEmptyDefault, setCellImages]);

  // Debug existing members and cell images
  useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('existingMembers:', existingMembers);
    console.log('existingMembers.length:', existingMembers?.length);
    console.log('cellImages:', cellImages);
    console.log('Object.keys(cellImages):', Object.keys(cellImages));
    
    if (existingMembers && existingMembers.length > 0) {
      existingMembers.forEach((member, index) => {
        console.log(`Member ${index}:`, {
          name: member.name,
          hasPhoto: !!member.photo,
          photoLength: member.photo?.length || 0
        });
      });
    }
    console.log('==================');
  }, [existingMembers, cellImages]);

  // Canvas helpers and renderer for this 8x10 layout
  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ) => {
    const sRatio = img.width / img.height;
    const dRatio = dw / dh;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (sRatio > dRatio) {
      sh = img.height;
      sw = sh * dRatio;
      sx = (img.width - sw) / 2;
    } else {
      sw = img.width;
      sh = sw / dRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  const buildAndDownload = async () => {
    if (!Object.keys(cellImages).length) {
      toast.error('Please upload at least one image before downloading.');
      return;
    }

    try {
      await downloadImage('template-45.png', {
        cols: 8,
        rows: 9, // Increased to include both top extension rows and both bottom extension rows
        // Target physical size for print within requested ranges
        targetWidthIn: 8,
        targetHeightIn: 13.5,
        dpi: 300,
        desiredGapPx: 4,
        draw: async ({ drawKey, ctx, width, height }) => {
          // Calculate cell dimensions
          const cellWidth = width / 8;
          const cellHeight = height / 8;
          
          // Constants for layout
          const extensionCells = 8;
          const endCol = 3.5;  // For centered cells

          // 1. Draw first top extension row (8 cells)
          // await Promise.all(Array.from({ length: extensionCells }, (_, i) => 
          //   drawKey(
          //     cid('topExt-most', -1, i + 2),
          //     0,  // First row
          //     0 + i,
          //     1,
          //     1
          //   )
          // ));

          // 2. Draw second top extension row (8 cells)
          // await Promise.all(Array.from({ length: extensionCells }, (_, i) => 
          //   drawKey(
          //     cid('topExt', -1, i + 2),
          //     1,  // Second row
          //     i,
          //     1,
          //     1
          //   )
          // ));

          // 3. Draw main top row (8 cells)
          for (let c = 0; c < 8; c++) {
            await drawKey(cid('top', 0, c), 0, c);
          }

          // 4. Draw left side (6 cells)
          for (let r = 1; r <= 6; r++) {
            await drawKey(cid('left', r, 0), r + 0, 0);
          }

          // 5. Draw center cell (spans 6x6)
          await drawKey(cid('center', 0, 0), 1, 1, 6, 6);

          // 6. Draw right side (6 cells)
          for (let r = 1; r <= 6; r++) {
            await drawKey(cid('right', r, 7), r + 0, 7);
          }

          // 7. Draw bottom row (8 cells)
          const bottomRow = 7;
          for (let c = 0; c < 8; c++) {
            await drawKey(cid('bottom', 9, c), bottomRow, c, 1, 1);
          }

          // 8. Draw first bottom extension row (8 cells)
          await Promise.all(Array.from({ length: extensionCells }, (_, i) => 
            drawKey(
              cid('bottom-extension', -1, i + 2),
              8,  // First bottom extension row
              1.5+i,
              1,
              1
            )
          ));

          // 9. Draw second bottom extension row (3 cells centered)
          // await Promise.all(Array.from({ length: 3 }, (_, i) => 
          //   drawKey(
          //     cid('bottom-most-extension', -1, i + 2),
          //     9,  // Second bottom extension row
          //     2.5 + i,  // More centered for 3 cells
          //     1,
          //     1
          //   )
          // ));
        },
      });
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template. Please try again.');
    }


    
  };

  const handleDownload = buildAndDownload;

  // Listen to a global download trigger from the parent preview container
  useEffect(() => {
    const onDownload = async () => {
      try {
        await handleDownload();
      } catch (error) {
        console.error('Download handler error:', error);
        toast.error('Failed to process download request');
      }
    };
    window.addEventListener('grid-template-download', onDownload);
    return () => window.removeEventListener('grid-template-download', onDownload);
  }, [handleDownload]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-6">

      <div
        className="grid grid-cols-7 bg-white rounded-xl shadow-2xl p-1 md:p-3"
        style={{
          gap: 'var(--gap)',
          // 7 gaps across 8 cols/rows
          // cell = min(fit width, fit height)
          // ratio keeps cells slightly taller than wide
          // pad approximates container padding on mobile
          ['--gap' as any]: '2px',
          ['--pad' as any]: '8px',
          ['--cell' as any]: isDesktop
            ? 'min(calc((35vw - (var(--pad)*2) - (7 * var(--gap))) / 8), calc((100vh - (var(--pad)*2) - (7 * var(--gap))) / 8))'
            : 'min(calc((100vw - (var(--pad)*2) - (7 * var(--gap))) / 8), calc((100vh - (var(--pad)*2) - (7 * var(--gap))) / 8))',
          ['--ratio' as any]: '1.2',
          ['--row' as any]: 'calc(var(--cell) * var(--ratio))',
          gridAutoRows: 'var(--row)',
          gridTemplateColumns: 'repeat(7, var(--cell))'
        } as React.CSSProperties}
      >
        
         {/* Top extension - 1 cells centered (non-intrusive full-row) */}
         <div className="col-span-7">
         <div
            className="grid"
            style={{
              display: 'grid',
              gap: 'var(--gap)',
              gridAutoFlow: 'column',
              gridAutoColumns: 'var(--cell)',
              gridAutoRows: 'var(--row)',
              justifyContent: 'center',
            } as React.CSSProperties}
          >
          {Array.from({ length: 4 }, (_, colIndex) => {
            const cellKey = cid('top-extension', -1, colIndex + 2);
            return (
              <div
                key={cellKey}
                className="grid-cell relative overflow-hidden"
                style={{ ...(getCellStyle(cellKey) as any) }}
                onClick={() => handleCellClick(cellKey)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCellClick(cellKey);
                  }
                }}
              >
                {!cellImages[cellKey] && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
                    +
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>

        {/* Top row - 9 cells */}
        {Array.from({ length: 7 }, (_, colIndex) => {
          const cellKey = cid('top', 0, colIndex);
          
          return (
            <div
              key={cellKey}
              className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
              style={debugCellStyle(cellKey)}
              onClick={() => handleCellClick(cellKey)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(cellKey);
                }
              }}
            >
              {!cellImages[cellKey] && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
                  +
                </div>
              )}
            </div>
          );
        })}

        {/* Middle rows with left border, center cell, and right border */}
        {Array.from({ length: 5 }, (_, rowIndex) => (
          <React.Fragment key={`middle-row-${rowIndex}`}>
            {/* Left border cell */}
            <div
              className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
              style={getCellStyleWithFallback(cid('left', rowIndex + 1, 0))}
              onClick={() => handleCellClick(cid('left', rowIndex + 1, 0))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(cid('left', rowIndex + 1, 0));
                }
              }}
            >
              {!cellImages[cid('left', rowIndex + 1, 0)] && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
                  +
                </div>
              )}
            </div>

            {/* Center cell - only render once and span 6 columns */}
            {rowIndex === 0 && (
              <div
                className="col-span-5 row-span-5 grid-cell active:animate-grid-pulse flex items-center justify-center text-white font-bold text-lg relative overflow-hidden"
                style={(() => {
                  // 1) If user has uploaded a preview photo, show it
                  if (previewMember?.photo) {
                    return {
                      backgroundImage: `url(${previewMember.photo})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    } as React.CSSProperties;
                  }
                  // 2) If center must stay empty by default (JoinGroup), do not auto-fill from existing members
                  if (centerEmptyDefault) {
                    return getCellStyle(cid('center', 0, 0));
                  }
                  // 3) Otherwise (Editor), allow auto-fill from first existing member
                  if (existingMembers.length > 0 && existingMembers[0]?.photo) {
                    return {
                      backgroundImage: `url(${existingMembers[0].photo})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    } as React.CSSProperties;
                  }
                  // 4) Fallback: GridContext styling
                  return getCellStyle(cid('center', 0, 0));
                })()}
                onClick={() => handleCellClick(cid('center', 0, 0))}
                role="button"
                tabIndex={0}
              >
                {(!previewMember?.photo && (
                    centerEmptyDefault
                      ? !cellImages[cid('center', 0, 0)] // JoinGroup: show placeholder if no uploaded center
                      : (!existingMembers[0]?.photo && !cellImages[cid('center', 0, 0)])
                  )) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span>CENTER</span>
                  </div>
                )}
              </div>
            )}

            {/* Right border cell */}
            <div
              className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
              style={getCellStyleWithFallback(cid('right', rowIndex + 1, 7))}
              onClick={() => handleCellClick(cid('right', rowIndex + 1, 7))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(cid('right', rowIndex + 1, 7));
                }
              }}
            >
              {!cellImages[cid('right', rowIndex + 1, 7)] && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
                  +
                </div>
              )}
            </div>
          </React.Fragment>
        ))}

        {/* Bottom row - 8 cells */}
        {Array.from({ length: 7 }, (_, colIndex) => {
          const cellKey = cid('bottom', 9, colIndex); // This matches our download cell ID
          
          return (
            <div
              key={cellKey}
              className="grid-cell active:animate-grid-pulse relative overflow-hidden cursor-pointer"
              style={getCellStyleWithFallback(cellKey)}
              onClick={() => handleCellClick(cellKey)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellClick(cellKey);
                }
              }}
            >
              {!cellImages[cellKey] && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
                  +
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom extension - centered on all sizes, same size as grid cells */}
        <div className="col-span-7">
          <div
            className="grid"
            style={{
              display: 'grid',
              gap: 'var(--gap)',
              gridAutoFlow: 'column',
              gridAutoColumns: 'var(--cell)',
              gridAutoRows: 'var(--row)',
              justifyContent: 'center',
            } as React.CSSProperties}
          >
            {Array.from({ length: 4 }, (_, colIndex) => {
              const key = cid('bottom-extension', 0, colIndex + 2);
              
              return (
                <div
                  key={key}
                  className="grid-cell relative overflow-hidden"
                  style={getCellStyleWithFallback(key)}
                  onMouseDown={(e) => startDrag(e, key)}
                  onTouchStart={(e) => startDrag(e, key)}
                  onClick={() => handleCellActivate(key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCellActivate(key);
                    }
                  }}
                >
                  {!cellImages[key] && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-70">
                      +
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
      
      

    </div>
  );
};

export default GridBoard;
