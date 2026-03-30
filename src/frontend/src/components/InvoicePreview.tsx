import type { Invoice } from "../backend.d";
import { HOTEL } from "../constants/hotel";
import { calcInvoice, calcInvoiceMulti } from "../utils/calculations";
import type { RoomEntry } from "../utils/calculations";
import { numberToWords } from "../utils/numberToWords";

interface InvoicePreviewProps {
  invoice: Partial<Invoice>;
  id?: string;
  rooms?: RoomEntry[];
}

export default function InvoicePreview({
  invoice,
  id = "invoice-preview",
  rooms,
}: InvoicePreviewProps) {
  const {
    invoiceNumber = "INV-DRAFT",
    invoiceDate = new Date().toISOString().split("T")[0],
    guestName = "",
    guestAddress = "",
    guestGST = "",
    roomCategory = "Standard Double",
    roomNumber = "",
    tariffPerNight = 0,
    checkIn = "",
    checkOut = "",
    includeBreakfast = false,
    breakfastCharge = 0,
    isHourly = false,
    hours = 0,
    hourlyRate = 0,
    discountValue = 0,
    discountType = "rupees",
    notes = "",
  } = invoice;

  const hasMultipleRooms = rooms && rooms.length > 0;

  const multiCalc = hasMultipleRooms
    ? calcInvoiceMulti({
        rooms,
        checkIn: checkIn ?? "",
        checkOut: checkOut ?? "",
        isHourly: isHourly ?? false,
        hours: hours ?? 0,
        hourlyRate: hourlyRate ?? 0,
        discountValue: discountValue ?? 0,
        discountType: discountType ?? "rupees",
      })
    : null;

  const calc = hasMultipleRooms
    ? multiCalc!
    : calcInvoice({
        tariffPerNight,
        checkIn: checkIn ?? "",
        checkOut: checkOut ?? "",
        includeBreakfast: includeBreakfast ?? false,
        breakfastCharge: breakfastCharge ?? 0,
        isHourly: isHourly ?? false,
        hours: hours ?? 0,
        hourlyRate: hourlyRate ?? 0,
        discountValue: discountValue ?? 0,
        discountType: discountType ?? "rupees",
      });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(n);

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const roomOnlyRate = tariffPerNight;

  return (
    <div
      id={id}
      className="invoice-print-area bg-white text-gray-900 p-8 text-[13px] leading-relaxed"
      style={{ fontFamily: "Arial, sans-serif", minWidth: 600 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-5 border-b-2 border-blue-600">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <img
              src="/assets/uploads/image-019d3dfd-8978-7339-884b-d652d0f921b0.png"
              alt="Sann's Tropicana Logo"
              className="w-14 h-14 object-contain rounded"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fallback = t.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div
              className="w-14 h-14 rounded-lg bg-blue-600 items-center justify-center hidden"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-700">{HOTEL.name}</h1>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-2 space-y-0.5">
            <p>{HOTEL.address}</p>
            <p>
              Phone: {HOTEL.phone} | Email: {HOTEL.email}
            </p>
            <p>Website: {HOTEL.website}</p>
            <p className="font-medium">GST No: {HOTEL.gstNo}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="bg-blue-600 text-white px-4 py-1.5 rounded-md mb-2 inline-block">
            <span className="text-sm font-bold tracking-wide">INVOICE</span>
          </div>
          <table className="text-xs ml-auto">
            <tbody>
              <tr>
                <td className="text-gray-500 pr-3">Invoice No:</td>
                <td className="font-semibold">{invoiceNumber}</td>
              </tr>
              <tr>
                <td className="text-gray-500 pr-3">Invoice Date:</td>
                <td className="font-semibold">
                  {formatDate(invoiceDate ?? "")}
                </td>
              </tr>
              {!isHourly && (
                <>
                  <tr>
                    <td className="text-gray-500 pr-3">Check-in:</td>
                    <td className="font-semibold">
                      {formatDate(checkIn ?? "")}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-3">Check-out:</td>
                    <td className="font-semibold">
                      {formatDate(checkOut ?? "")}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-3">Nights:</td>
                    <td className="font-semibold">{calc.nights}</td>
                  </tr>
                </>
              )}
              {isHourly && (
                <>
                  <tr>
                    <td className="text-gray-500 pr-3">Billing:</td>
                    <td className="font-semibold text-orange-600">Hourly</td>
                  </tr>
                  <tr>
                    <td className="text-gray-500 pr-3">Hours:</td>
                    <td className="font-semibold">{hours}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Details */}
      <div className="mb-5 p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
          Bill To
        </h3>
        <p className="font-semibold text-sm">{guestName || "\u2014"}</p>
        {guestAddress && (
          <p className="text-xs text-gray-600">{guestAddress}</p>
        )}
        {guestGST && (
          <p className="text-xs text-gray-600">GST No: {guestGST}</p>
        )}
      </div>

      {/* Line Items */}
      <table className="w-full text-xs border-collapse mb-4">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="text-left py-2 px-3">S.No</th>
            <th className="text-left py-2 px-3">Description</th>
            <th className="text-center py-2 px-3">HSN/SAC</th>
            <th className="text-right py-2 px-3">
              {isHourly ? "Rate/Hour" : "Rate/Night"}
            </th>
            <th className="text-right py-2 px-3">
              {isHourly ? "Hours" : "Nights"}
            </th>
            <th className="text-right py-2 px-3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {hasMultipleRooms && multiCalc ? (
            multiCalc.roomBreakdown.map((room, idx) => (
              <tr key={room.roomNumber} className="border-b border-gray-200">
                <td className="py-2.5 px-3">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  {room.roomCategory} (Room No: {room.roomNumber})
                  {isHourly && " \u2014 Hourly Basis"}
                </td>
                <td className="py-2.5 px-3 text-center">996311</td>
                <td className="py-2.5 px-3 text-right">
                  {formatCurrency(room.baseRatePerNight)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {isHourly ? hours : calc.nights}
                </td>
                <td className="py-2.5 px-3 text-right font-medium">
                  {formatCurrency(room.lineTotal)}
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-gray-200">
              <td className="py-2.5 px-3">1</td>
              <td className="py-2.5 px-3">
                {roomCategory} {roomNumber ? `(Room No: ${roomNumber})` : ""}
                {isHourly && " \u2014 Hourly Basis"}
              </td>
              <td className="py-2.5 px-3 text-center">996311</td>
              <td className="py-2.5 px-3 text-right">
                {formatCurrency(
                  isHourly ? (hourlyRate ?? 0) / 1.05 : roomOnlyRate / 1.05,
                )}
              </td>
              <td className="py-2.5 px-3 text-right">
                {isHourly ? hours : calc.nights}
              </td>
              <td className="py-2.5 px-3 text-right font-medium">
                {formatCurrency(
                  isHourly
                    ? calc.roomAmount / 1.05
                    : (roomOnlyRate / 1.05) * calc.nights,
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-5">
        <table className="text-xs w-80">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-1.5 text-gray-600">Base Amount (Excl. GST)</td>
              <td className="py-1.5 text-right font-medium">
                {formatCurrency(calc.baseAmount)}
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1.5 text-gray-600">SGST @ 2.5%</td>
              <td className="py-1.5 text-right font-medium">
                {formatCurrency(calc.sgst)}
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-1.5 text-gray-600">CGST @ 2.5%</td>
              <td className="py-1.5 text-right font-medium">
                {formatCurrency(calc.cgst)}
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1.5 text-gray-700 font-semibold">
                Total (Incl. GST)
              </td>
              <td className="py-1.5 text-right font-semibold">
                {formatCurrency(calc.totalInclusiveGST)}
              </td>
            </tr>
            {calc.discountAmount > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-1.5 text-blue-700">
                  Discount
                  {discountType === "percentage" ? ` (${discountValue}%)` : ""}
                </td>
                <td className="py-1.5 text-right text-blue-700 font-medium">
                  - {formatCurrency(calc.discountAmount)}
                </td>
              </tr>
            )}
            <tr className="border-b-2 border-blue-600">
              <td className="py-2 font-bold text-sm">Grand Total</td>
              <td className="py-2 text-right font-bold text-sm text-blue-700">
                {formatCurrency(calc.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in words */}
      <div className="mb-5 p-3 bg-blue-50 rounded-md border border-blue-100">
        <span className="text-xs font-semibold text-gray-600">
          Amount in Words:{" "}
        </span>
        <span className="text-xs text-gray-800 italic">
          {numberToWords(calc.grandTotal)}
        </span>
      </div>

      {notes && (
        <div className="mb-5 text-xs text-gray-600">
          <span className="font-semibold">Notes: </span>
          {notes}
        </div>
      )}

      {/* Signatory */}
      <div className="flex justify-end mt-8 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs font-medium text-gray-700 mb-8">
            For {HOTEL.name}
          </p>
          <div className="border-t border-gray-400 pt-1 w-40">
            <p className="text-xs text-gray-600">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-gray-200 flex justify-between items-center">
        <p className="text-[10px] text-gray-500">Thank you, visit again.</p>
        <p className="text-[10px] text-gray-400 italic">
          **This is a computer generated invoice.
        </p>
      </div>
    </div>
  );
}
