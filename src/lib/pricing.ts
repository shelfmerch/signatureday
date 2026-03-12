/** Group-like object with optional pricing fields (from API or context). */
export interface GroupPricingFields {
  pricePerMember?: number;
  ambassadorId?: string | null;
}

/**
 * Effective price per member for payment/display.
 * Ambassador-linked groups: ₹149; direct groups: ₹189.
 */
export function getEffectivePricePerMember(group: GroupPricingFields | undefined | null): number {
  if (!group) return 189;
  const stored = group.pricePerMember;
  if (stored != null && stored > 0) return stored;
  const hasAmbassador = !!(
    group.ambassadorId != null &&
    group.ambassadorId !== '' &&
    String(group.ambassadorId).trim() !== ''
  );
  return hasAmbassador ? 149 : 189;
}

export interface PricingInput {
  quantity: number;
  tshirtPrice?: number; // per unit
  printPrice?: number; // per unit
  gstRate?: number; // e.g., 0.05 for 5%
}

export interface PricingBreakdown {
  perItemSubtotal: number;
  perItemGst: number;
  perItemTotal: number;
  subtotal: number;
  gst: number;
  total: number;
}

export function calculatePricing({
  quantity,
  tshirtPrice = 28,
  printPrice = 10.10,
  gstRate = 0.05,
}: PricingInput): PricingBreakdown {
  const perItemSubtotal = tshirtPrice + printPrice;
  const perItemGst = Math.floor(Math.floor((perItemSubtotal * gstRate * 100) / 100));
  const perItemTotal = Number((perItemSubtotal + perItemGst).toFixed(2));

  const subtotal = perItemSubtotal * quantity;
  const gst = perItemGst * quantity;
  const total = subtotal + gst;

  return { perItemSubtotal, perItemGst, perItemTotal, subtotal, gst, total };
}


