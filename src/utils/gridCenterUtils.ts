
import { Order } from '@/types/admin';

export interface GridDimensions {
  cols: number;
  rows: number;
  totalCells: number;
}

export function getGridDimensions(memberCount: number, template: string): GridDimensions {
  // This is a simplified calculation - in practice you'd want to match
  // the exact logic used by your specific grid templates
  const totalCells = memberCount;
  
  if (template === 'square') {
    const cols = Math.ceil(Math.sqrt(totalCells));
    const rows = Math.ceil(totalCells / cols);
    return { cols, rows, totalCells };
  } else if (template === 'hexagonal') {
    // Hexagonal grids often use a different arrangement
    const cols = Math.ceil(Math.sqrt(totalCells));
    const rows = Math.ceil(totalCells / cols);
    return { cols, rows, totalCells };
  }

  // Default fallback
  const cols = Math.ceil(Math.sqrt(totalCells));
  const rows = Math.ceil(totalCells / cols);
  return { cols, rows, totalCells };
}

export function getCenterCellIndex(order: Order): number {
  const dimensions = getGridDimensions(order.members.length, order.gridTemplate);
  
  // Calculate the most central cell index
  const centerRow = Math.floor(dimensions.rows / 2);
  const centerCol = Math.floor(dimensions.cols / 2);
  const centerIndex = centerRow * dimensions.cols + centerCol;
  
  // Ensure the index is within bounds
  return Math.min(centerIndex, dimensions.totalCells - 1);
}

export function canGenerateVariants(order: Order): { canGenerate: boolean; reason?: string } {
  if (order.members.length < 3) {
    return { canGenerate: false, reason: 'At least 3 members required for center variants' };
  }
  
  const membersWithPhotos = order.members.filter(m => m.photo && m.photo.trim() !== '');
  if (membersWithPhotos.length < 2) {
    return { canGenerate: false, reason: 'At least 2 members with photos required' };
  }
  
  return { canGenerate: true };
}
