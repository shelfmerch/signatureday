
import { Order, AdminMember } from '@/types/admin';

export interface GridVariant {
  id: string;
  centerMember: AdminMember;
  members: AdminMember[];
  centerIndex: number;
}

export async function generateGridVariants(order: Order): Promise<GridVariant[]> {
  const variants: GridVariant[] = [];

  // Validate order structure
  if (!order || !order.members || !Array.isArray(order.members)) {
    throw new Error('Invalid order data: members array is missing or invalid');
  }

  if (order.members.length === 0) {
    throw new Error('Order has no members');
  }

  if (!order.gridTemplate) {
    throw new Error('Order grid template is missing');
  }

  // Filter members with valid photos
  const membersWithPhotos = order.members.filter(m => {
    if (!m) return false;
    if (!m.photo) return false;
    if (typeof m.photo !== 'string') return false;
    return m.photo.trim() !== '';
  });

  console.log('[generateGridVariants] Order:', order.id);
  console.log('[generateGridVariants] Total members:', order.members.length);
  console.log('[generateGridVariants] Members with photos:', membersWithPhotos.length);
  console.log('[generateGridVariants] Members without photos:', order.members.length - membersWithPhotos.length);

  if (membersWithPhotos.length < 2) {
    throw new Error(`Not enough members with photos to generate variants (found ${membersWithPhotos.length}, need at least 2)`);
  }

  console.log('Generating variants for', membersWithPhotos.length, 'members with photos');
  console.log('Grid template:', order.gridTemplate);

  // Get the template-specific layout information
  const templateLayout = getTemplateLayout(order.gridTemplate, order.members.length);
  if (!templateLayout) {
    throw new Error(`Unsupported grid template: ${order.gridTemplate} with ${order.members.length} members`);
  }

  console.log('Template layout:', templateLayout);

  // For each member that can be in the center, create a variant
  for (let centerMemberIndex = 0; centerMemberIndex < membersWithPhotos.length; centerMemberIndex++) {
    const centerMember = membersWithPhotos[centerMemberIndex];

    if (!centerMember) {
      console.warn(`Skipping invalid center member at index ${centerMemberIndex}`);
      continue;
    }

    // Ensure member has an ID - use memberRollNumber as fallback
    const memberId = centerMember.id || centerMember.memberRollNumber || `member-${centerMemberIndex}`;
    if (!centerMember.id) {
      centerMember.id = memberId;
      console.log(`Assigned ID to member ${centerMember.name}: ${memberId}`);
    }

    // Create a new arrangement that preserves the original grid structure
    // Deep copy to avoid mutating the original, and ensure all members have IDs
    const variantMembers: AdminMember[] = order.members.map((m, idx) => {
      if (!m) return null;
      const member = { ...m };
      // Ensure each member has an ID
      if (!member.id) {
        member.id = member.memberRollNumber || `member-${idx}-${Date.now()}`;
      }
      return member;
    }).filter((m): m is AdminMember => m !== null);

    // Find where the desired center member currently is in the original grid
    // Try multiple matching strategies
    let currentMemberIndex = variantMembers.findIndex(m => m && (m.id === centerMember.id || m.id === memberId));

    // If still not found, try matching by memberRollNumber
    if (currentMemberIndex === -1 && centerMember.memberRollNumber) {
      currentMemberIndex = variantMembers.findIndex(m => m && m.memberRollNumber === centerMember.memberRollNumber);
    }

    // If still not found, try matching by name (last resort)
    if (currentMemberIndex === -1 && centerMember.name) {
      currentMemberIndex = variantMembers.findIndex(m => m && m.name === centerMember.name);
    }

    if (currentMemberIndex === -1) {
      console.error(`Center member ${centerMember.name} (ID: ${centerMember.id || memberId}) not found in order.members array`);
      console.error('Available member IDs:', variantMembers.map(m => ({ id: m.id, name: m.name, rollNo: m.memberRollNumber })));
      continue;
    }

    // Validate center index
    if (templateLayout.centerIndex >= variantMembers.length) {
      console.warn(`Center index ${templateLayout.centerIndex} is out of bounds for ${variantMembers.length} members`);
      // Use a safe fallback
      const safeCenterIndex = Math.min(templateLayout.centerIndex, variantMembers.length - 1);
      templateLayout.centerIndex = safeCenterIndex;
    }

    // Get the member currently at the center position
    const currentCenterMember = variantMembers[templateLayout.centerIndex];

    // Only swap if the desired member isn't already at the center
    if (currentMemberIndex !== templateLayout.centerIndex) {
      // Swap the members to preserve grid structure
      variantMembers[templateLayout.centerIndex] = centerMember;
      variantMembers[currentMemberIndex] = currentCenterMember || centerMember; // Fallback if currentCenterMember is undefined

      console.log(`Variant ${centerMemberIndex + 1}: Swapped ${centerMember.name} to center (${templateLayout.centerIndex}) and ${currentCenterMember?.name || 'unknown'} to position ${currentMemberIndex}`);
    } else {
      console.log(`Variant ${centerMemberIndex + 1}: ${centerMember.name} already at center position ${templateLayout.centerIndex}`);
    }

    console.log(`Variant ${centerMemberIndex + 1}: ${centerMember.name} at center position ${templateLayout.centerIndex}`);

    variants.push({
      id: `variant-${memberId}`,
      centerMember: { ...centerMember, id: memberId },
      members: variantMembers,
      centerIndex: templateLayout.centerIndex,
    });

    // Yield to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  console.log('Generated', variants.length, 'variants');
  return variants;
}

// Template-specific layout information
export interface TemplateLayout {
  centerIndex: number;
  totalCells: number;
  gridDimensions: { cols: number; rows: number };
  description: string;
}

export function getTemplateLayout(template: string, memberCount: number): TemplateLayout | null {
  // For square templates, we need to match the exact layout logic
  if (template === 'square') {
    // These are the specific layouts used by the square templates
    if (memberCount === 19 || memberCount === 20) {
      // Template 19: 6x7 grid with 4x5 center cell, border cells around it
      // 19 border cells + 1 center = 20 total, but center is not indexed
      // Center is typically at the middle position in the member array
      return {
        centerIndex: Math.floor(memberCount / 2), // Center position in member array (9 for 19 members, 10 for 20)
        totalCells: 19,
        gridDimensions: { cols: 6, rows: 7 },
        description: '6x7 grid with 4x5 center cell, top/bottom rows, left/right sides'
      };
    } else if (memberCount === 34) {
      return {
        centerIndex: 8, // Center cell in 8x10 grid (row 1, col 1, spanning 6x6)
        totalCells: 34,
        gridDimensions: { cols: 8, rows: 10 },
        description: '8x10 grid with 6x6 center cell, top/bottom rows, left/right sides, bottom extension'
      };
    }
    else if (memberCount === 35) {
      return {
        centerIndex: 8,
        totalCells: 35,
        gridDimensions: { cols: 8, rows: 10 },
        description: '8x10 grid with 6x6 center cell, top/bottom rows, left/right sides, bottom extension'
      };
    } else if (memberCount === 69) {
      return {
        centerIndex: 20, // Center cell in 9x9 grid (row 2, col 2, spanning 5x5)
        totalCells: 69,
        gridDimensions: { cols: 9, rows: 9 },
        description: '9x9 grid with 5x5 center cell, surrounding cells in spiral pattern'
      };
    } else if (memberCount === 75) {
      return {
        centerIndex: 24, // Center cell in 8x10 grid (row 3, col 1, spanning 5x6)
        totalCells: 75,
        gridDimensions: { cols: 8, rows: 10 },
        description: '8x10 grid with 5x6 center cell, top/bottom rows, left/right sides, extensions'
      };
    }

    // For other square templates, use a fallback calculation
    const gridSize = Math.ceil(Math.sqrt(memberCount));
    const centerIndex = Math.floor(gridSize / 2) * gridSize + Math.floor(gridSize / 2);

    return {
      centerIndex: Math.min(centerIndex, memberCount - 1),
      totalCells: memberCount,
      gridDimensions: { cols: gridSize, rows: gridSize },
      description: `Fallback ${gridSize}x${gridSize} grid with calculated center`
    };
  }

  // For hexagonal template types - center is always slot 0 (the large center polygon)
  // The HexagonSvgGrid parser puts the center slot first in the ordered array
  if (template === 'hexagonal') {
    // Explicit hexagonal grid layouts based on member count
    // All hexagonal grids have centerIndex 0 because HexagonSvgGrid 
    // identifies the center by polygon point count and puts it first
    const hexLayouts: Record<number, { totalCells: number; description: string }> = {
      13: { totalCells: 13, description: 'Hexagonal 13-cell grid with center' },
      14: { totalCells: 14, description: 'Hexagonal 14-cell grid with center' },
      15: { totalCells: 15, description: 'Hexagonal 15-cell grid with center' },
      16: { totalCells: 16, description: 'Hexagonal 16-cell grid with center' },
      17: { totalCells: 17, description: 'Hexagonal 17-cell grid with center' },
      18: { totalCells: 18, description: 'Hexagonal 18-cell grid with center' },
      20: { totalCells: 20, description: 'Hexagonal 20-cell grid with center' },
      22: { totalCells: 22, description: 'Hexagonal 22-cell grid with center' },
      24: { totalCells: 24, description: 'Hexagonal 24-cell grid with center' },
      25: { totalCells: 25, description: 'Hexagonal 25-cell grid with center' },
      27: { totalCells: 27, description: 'Hexagonal 27-cell grid with center' },
      28: { totalCells: 28, description: 'Hexagonal 28-cell grid with center' },
      33: { totalCells: 33, description: 'Hexagonal 33-cell grid with center' },
      52: { totalCells: 52, description: 'Hexagonal 52-cell grid with center' },
      55: { totalCells: 55, description: 'Hexagonal 55-cell grid with center' },
      56: { totalCells: 56, description: 'Hexagonal 56-cell grid with center' },
      57: { totalCells: 57, description: 'Hexagonal 57-cell grid with center' },
      58: { totalCells: 58, description: 'Hexagonal 58-cell grid with center' },
      59: { totalCells: 59, description: 'Hexagonal 59-cell grid with center' },
      61: { totalCells: 61, description: 'Hexagonal 61-cell grid with center' },
      62: { totalCells: 62, description: 'Hexagonal 62-cell grid with center' },
      64: { totalCells: 64, description: 'Hexagonal 64-cell grid with center' },
      65: { totalCells: 65, description: 'Hexagonal 65-cell grid with center' },
      66: { totalCells: 66, description: 'Hexagonal 66-cell grid with center' },
      68: { totalCells: 68, description: 'Hexagonal 68-cell grid with center' },
      69: { totalCells: 69, description: 'Hexagonal 69-cell grid with center' },
      70: { totalCells: 70, description: 'Hexagonal 70-cell grid with center' },
      72: { totalCells: 72, description: 'Hexagonal 72-cell grid with center' },
      73: { totalCells: 73, description: 'Hexagonal 73-cell grid with center' },
      75: { totalCells: 75, description: 'Hexagonal 75-cell grid with center' },
      76: { totalCells: 76, description: 'Hexagonal 76-cell grid with center' },
      77: { totalCells: 77, description: 'Hexagonal 77-cell grid with center' },
      78: { totalCells: 78, description: 'Hexagonal 78-cell grid with center' },
      80: { totalCells: 80, description: 'Hexagonal 80-cell grid with center' },
      82: { totalCells: 82, description: 'Hexagonal 82-cell grid with center' },
      83: { totalCells: 83, description: 'Hexagonal 83-cell grid with center' },
      87: { totalCells: 87, description: 'Hexagonal 87-cell grid with center' },
      89: { totalCells: 89, description: 'Hexagonal 89-cell grid with center' },
      91: { totalCells: 91, description: 'Hexagonal 91-cell grid with center' },
      92: { totalCells: 92, description: 'Hexagonal 92-cell grid with center' },
      95: { totalCells: 95, description: 'Hexagonal 95-cell grid with center' },
      96: { totalCells: 96, description: 'Hexagonal 96-cell grid with center' },
      97: { totalCells: 97, description: 'Hexagonal 97-cell grid with center' },
      98: { totalCells: 98, description: 'Hexagonal 98-cell grid with center' },
      99: { totalCells: 99, description: 'Hexagonal 99-cell grid with center' },
      100: { totalCells: 100, description: 'Hexagonal 100-cell grid with center' },
      101: { totalCells: 101, description: 'Hexagonal 101-cell grid with center' },
      102: { totalCells: 102, description: 'Hexagonal 102-cell grid with center' },
      103: { totalCells: 103, description: 'Hexagonal 103-cell grid with center' },
      104: { totalCells: 104, description: 'Hexagonal 104-cell grid with center' },
      105: { totalCells: 105, description: 'Hexagonal 105-cell grid with center' },
      106: { totalCells: 106, description: 'Hexagonal 106-cell grid with center' },
      107: { totalCells: 107, description: 'Hexagonal 107-cell grid with center' },
      108: { totalCells: 108, description: 'Hexagonal 108-cell grid with center' },
      109: { totalCells: 109, description: 'Hexagonal 109-cell grid with center' },
      110: { totalCells: 110, description: 'Hexagonal 110-cell grid with center' },
      112: { totalCells: 112, description: 'Hexagonal 112-cell grid with center' },
    };

    const hexLayout = hexLayouts[memberCount];
    if (hexLayout) {
      return {
        centerIndex: 0, // Center is always first slot in hexagonal grids
        totalCells: hexLayout.totalCells,
        gridDimensions: { cols: 1, rows: 1 }, // Not applicable for hex grids
        description: hexLayout.description
      };
    }

    // Fallback for unlisted hexagonal grid sizes
    return {
      centerIndex: 0, // Center is always first slot
      totalCells: memberCount,
      gridDimensions: { cols: 1, rows: 1 },
      description: `Hexagonal ${memberCount}-cell grid with center`
    };
  }

  return null;
}
