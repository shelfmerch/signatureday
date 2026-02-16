/**
 * Server-side variant generation (mirrors src/utils/gridVariantGenerator.ts)
 */

function getTemplateLayout(template, memberCount) {
  if (template === 'square') {
    if (memberCount === 19 || memberCount === 20) {
      return {
        centerIndex: Math.floor(memberCount / 2),
        totalCells: 19,
        gridDimensions: { cols: 6, rows: 7 },
        description: '6x7 grid',
      };
    }
    if (memberCount === 34) {
      return { centerIndex: 8, totalCells: 34, gridDimensions: { cols: 8, rows: 10 }, description: '8x10' };
    }
    if (memberCount === 35) {
      return { centerIndex: 8, totalCells: 35, gridDimensions: { cols: 8, rows: 10 }, description: '8x10' };
    }
    if (memberCount === 69) {
      return { centerIndex: 20, totalCells: 69, gridDimensions: { cols: 9, rows: 9 }, description: '9x9' };
    }
    if (memberCount === 75) {
      return { centerIndex: 24, totalCells: 75, gridDimensions: { cols: 8, rows: 10 }, description: '8x10' };
    }
    const gridSize = Math.ceil(Math.sqrt(memberCount));
    const centerIndex = Math.floor(gridSize / 2) * gridSize + Math.floor(gridSize / 2);
    return {
      centerIndex: Math.min(centerIndex, memberCount - 1),
      totalCells: memberCount,
      gridDimensions: { cols: gridSize, rows: gridSize },
      description: `Fallback ${gridSize}x${gridSize}`,
    };
  }
  if (template === 'hexagonal' || template === 'circle') {
    // Hexagonal grids: center is always slot 0 (the large center polygon)
    // This is consistent with frontend HexagonSvgGrid which puts center first
    return {
      centerIndex: 0, // Center is always first slot in hexagonal grids
      totalCells: memberCount,
      gridDimensions: { cols: 1, rows: 1 }, // Not applicable for hex
      description: `${template} ${memberCount}-cell grid with center`,
    };
  }
  return null;
}


/**
 * Generate variants for a specific grid type
 * @param {Object} order - Order with members
 * @param {string} gridType - Override grid type ('square' or 'hexagonal')
 */
function generateGridVariants(order, gridType = null) {
  const variants = [];
  if (!order || !order.members || !Array.isArray(order.members)) {
    throw new Error('Invalid order data: members array is missing or invalid');
  }
  if (order.members.length === 0) throw new Error('Order has no members');
  
  // Use provided gridType or fall back to order's gridTemplate
  const effectiveTemplate = gridType || order.gridTemplate;
  if (!effectiveTemplate) throw new Error('Grid template is missing');

  const membersWithPhotos = order.members.filter((m) => {
    if (!m) return false;
    if (!m.photo || typeof m.photo !== 'string') return false;
    return m.photo.trim() !== '';
  });

  if (membersWithPhotos.length < 2) {
    throw new Error(`Not enough members with photos (found ${membersWithPhotos.length}, need at least 2)`);
  }

  const templateLayout = getTemplateLayout(effectiveTemplate, order.members.length);
  if (!templateLayout) {
    throw new Error(`Unsupported grid template: ${effectiveTemplate} with ${order.members.length} members`);
  }

  for (let centerMemberIndex = 0; centerMemberIndex < membersWithPhotos.length; centerMemberIndex++) {
    const centerMember = membersWithPhotos[centerMemberIndex];
    if (!centerMember) continue;

    const memberId = centerMember.id || centerMember.memberRollNumber || `member-${centerMemberIndex}`;

    const variantMembers = order.members.map((m, idx) => {
      if (!m) return null;
      const member = { ...m };
      if (!member.id) member.id = member.memberRollNumber || `member-${idx}-${Date.now()}`;
      return member;
    }).filter(Boolean);

    let currentMemberIndex = variantMembers.findIndex((m) => m && (m.id === centerMember.id || m.id === memberId));
    if (currentMemberIndex === -1 && centerMember.memberRollNumber) {
      currentMemberIndex = variantMembers.findIndex((m) => m && m.memberRollNumber === centerMember.memberRollNumber);
    }
    if (currentMemberIndex === -1 && centerMember.name) {
      currentMemberIndex = variantMembers.findIndex((m) => m && m.name === centerMember.name);
    }
    if (currentMemberIndex === -1) continue;

    const safeCenterIndex = Math.min(templateLayout.centerIndex, variantMembers.length - 1);
    const currentCenterMember = variantMembers[safeCenterIndex];

    if (currentMemberIndex !== safeCenterIndex) {
      variantMembers[safeCenterIndex] = centerMember;
      variantMembers[currentMemberIndex] = currentCenterMember || centerMember;
    }

    // Use gridType-prefixed variant ID to avoid conflicts
    const variantIdPrefix = gridType ? `${gridType}-` : '';
    variants.push({
      id: `${variantIdPrefix}variant-${memberId}`,
      centerMember: { ...centerMember, id: memberId },
      members: variantMembers,
      centerIndex: safeCenterIndex,
      gridType: effectiveTemplate, // Include gridType in variant data
    });
  }

  return variants;
}

export { getTemplateLayout, generateGridVariants };
