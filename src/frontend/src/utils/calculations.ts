// Tariff values are GST-INCLUSIVE (5% GST embedded)
// Base = tariff / 1.05
// SGST = base * 0.025, CGST = base * 0.025

export interface InvoiceCalculations {
  nights: number;
  roomAmount: number; // GST-inclusive room total
  breakfastAmount: number; // GST-inclusive breakfast total
  totalInclusiveGST: number; // roomAmount + breakfastAmount
  baseAmount: number; // ex-GST base (for reporting)
  sgst: number; // 2.5% of base
  cgst: number; // 2.5% of base
  taxableAmount: number; // alias of baseAmount (for GST report)
  discountAmount: number;
  grandTotal: number; // rounded to nearest rupee
}

export function calcInvoice(params: {
  tariffPerNight: number; // GST-inclusive
  checkIn: string;
  checkOut: string;
  includeBreakfast: boolean;
  breakfastCharge: number; // GST-inclusive breakfast add-on per night
  isHourly: boolean;
  hours: number;
  hourlyRate: number; // GST-inclusive
  discountValue: number;
  discountType: string; // "rupees" | "percentage"
}): InvoiceCalculations {
  let nights = 0;
  let roomAmount = 0;

  if (params.isHourly) {
    nights = 0;
    roomAmount = params.hourlyRate * params.hours;
  } else if (params.checkIn && params.checkOut) {
    const d1 = new Date(params.checkIn);
    const d2 = new Date(params.checkOut);
    nights = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
    // tariffPerNight is the full GST-inclusive rate (with or without breakfast combined)
    roomAmount = params.tariffPerNight * nights;
  }

  // Breakfast is shown as a separate line item only when listed separately
  // When includeBreakfast=true, tariffPerNight already holds the with-breakfast rate
  // breakfastCharge is the per-night add-on shown separately in line items
  const breakfastAmount =
    !params.isHourly && params.includeBreakfast && params.breakfastCharge > 0
      ? params.breakfastCharge * nights
      : 0;

  // totalInclusiveGST = full billing amount (GST included)
  // When breakfast is embedded in tariffPerNight, breakfastAmount = 0 to avoid double-counting
  const totalInclusiveGST = roomAmount;

  // Reverse-calculate base for GST reporting
  const baseAmount = totalInclusiveGST / 1.05;
  const sgst = baseAmount * 0.025;
  const cgst = baseAmount * 0.025;

  let discountAmount = 0;
  if (params.discountType === "rupees") {
    discountAmount = params.discountValue;
  } else if (params.discountType === "percentage") {
    discountAmount = totalInclusiveGST * (params.discountValue / 100);
  }

  const grandTotal = Math.round(totalInclusiveGST - discountAmount);

  return {
    nights,
    roomAmount,
    breakfastAmount,
    totalInclusiveGST,
    baseAmount,
    sgst,
    cgst,
    taxableAmount: baseAmount, // for GST report
    discountAmount,
    grandTotal,
  };
}

export function roundToRupee(n: number): number {
  return Math.round(n);
}
