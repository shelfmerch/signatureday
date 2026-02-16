import React from 'react';
import { GridPreview } from '@/components/GridPreview';
import { GridProvider } from '@/components/square/context/GridContext';
import { HexagonSvgGrid } from '@/components/HexagonSvgGrid';
import { Order } from '@/types/admin';
import { Member } from '@/context/CollageContext';

interface OrderGridPreviewProps {
  order: Order;
  gridType?: 'square' | 'hexagonal';
}

export const OrderGridPreview: React.FC<OrderGridPreviewProps> = ({ order, gridType = 'square' }) => {
  // Convert admin members to collage members format
  const convertedMembers: Member[] = order.members.map(member => ({
    id: member.id,
    name: member.name,
    photo: member.photo,
    vote: (member.vote || 'square') as Member['vote'],
    joinedAt: new Date(member.joinedAt),
    memberRollNumber: member.memberRollNumber
  }));

  // Determine the effective grid type based on prop or order template
  const effectiveGridType = gridType || (order.gridTemplate === 'hexagonal' ? 'hexagonal' : 'square');

  return (
    <div className="w-full h-full overflow-hidden rounded-lg border bg-gray-50">
      {effectiveGridType === 'hexagonal' ? (
        <HexagonSvgGrid
          memberCount={order.members.length}
          svgPath={`./hexagon/${order.members.length}.svg`}
          existingMembers={convertedMembers}
          size="medium"
        />
      ) : (
        <GridProvider>
          <GridPreview
            template={order.gridTemplate}
            memberCount={order.members.length}
            members={convertedMembers}
            size="medium"
          />
        </GridProvider>
      )}
    </div>
  );
};
