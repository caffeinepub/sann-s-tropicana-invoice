import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Clock,
  Coffee,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Plus,
  Printer,
  Save,
  Sun,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Invoice } from "../backend.d";
import InvoicePreview from "../components/InvoicePreview";
import type { Page } from "../components/Sidebar";
import { ROOM_CODE_MAP, ROOM_RATES } from "../constants/hotel";
import {
  useCreateInvoice,
  useGetInvoice,
  useUpdateInvoice,
} from "../hooks/useQueries";
import { calcInvoiceMulti } from "../utils/calculations";
import type { RoomEntry } from "../utils/calculations";
import { exportInvoiceToPDF } from "../utils/pdfExport";

interface InvoiceFormProps {
  onNavigate: (page: Page, params?: string) => void;
  params?: string;
}

const MIN_INVOICE_BASE = 1486;

function getNextLocalInvoiceNumber(): string {
  const stored = localStorage.getItem("lastInvoiceNumber");
  const parsed = stored ? Number.parseInt(stored, 10) : MIN_INVOICE_BASE;
  const last = parsed < MIN_INVOICE_BASE ? MIN_INVOICE_BASE : parsed;
  const next = last + 1;
  localStorage.setItem("lastInvoiceNumber", String(next));
  return String(next);
}

function peekLocalInvoiceNumber(): string {
  const stored = localStorage.getItem("lastInvoiceNumber");
  const parsed = stored ? Number.parseInt(stored, 10) : MIN_INVOICE_BASE;
  const last = parsed < MIN_INVOICE_BASE ? MIN_INVOICE_BASE : parsed;
  return String(last + 1);
}

function parseRoomsFromString(
  roomNumberStr: string,
  includeBreakfast: boolean,
): RoomEntry[] {
  const codes = roomNumberStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const entries: RoomEntry[] = [];
  for (const code of codes) {
    const cat = ROOM_CODE_MAP[code];
    if (cat) {
      const rates = ROOM_RATES[cat];
      const tariff = includeBreakfast
        ? rates.withBreakfast
        : rates.withoutBreakfast;
      const breakfast = includeBreakfast
        ? rates.withBreakfast - rates.withoutBreakfast
        : 0;
      entries.push({
        roomNumber: code,
        roomCategory: cat,
        tariffPerNight: tariff,
        breakfastCharge: breakfast,
      });
    } else if (code) {
      // Unknown code — add as-is with 0 tariff (fallback)
      entries.push({
        roomNumber: code,
        roomCategory: "Unknown",
        tariffPerNight: 0,
        breakfastCharge: 0,
      });
    }
  }
  return entries.length > 0
    ? entries
    : [
        {
          roomNumber: "",
          roomCategory: "",
          tariffPerNight: 0,
          breakfastCharge: 0,
        },
      ];
}

const EMPTY_ROOMS: RoomEntry[] = [
  { roomNumber: "", roomCategory: "", tariffPerNight: 0, breakfastCharge: 0 },
];

const EMPTY_FORM = {
  guestName: "",
  guestAddress: "",
  guestGST: "",
  checkIn: "",
  checkOut: "",
  includeBreakfast: false,
  isHourly: false,
  hours: 1,
  hourlyRate: 0,
  discountValue: 0,
  discountType: "rupees" as string,
  notes: "",
};

export default function InvoiceForm({ onNavigate, params }: InvoiceFormProps) {
  const isEdit = params?.startsWith("edit:");
  const isView = params?.startsWith("view:");
  const existingInvoiceNumber = isEdit
    ? params!.slice(5)
    : isView
      ? params!.slice(5)
      : undefined;
  const readOnly = !!isView;

  const { data: existingInvoice } = useGetInvoice(existingInvoiceNumber || "");
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const [form, setForm] = useState(EMPTY_FORM);
  const [rooms, setRooms] = useState<RoomEntry[]>(EMPTY_ROOMS);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [numberAllocated, setNumberAllocated] = useState(false);
  // Add room input state
  const [addRoomInput, setAddRoomInput] = useState("");
  const [addRoomError, setAddRoomError] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingInvoice) {
      const bf = existingInvoice.includeBreakfast;
      setForm({
        guestName: existingInvoice.guestName,
        guestAddress: existingInvoice.guestAddress,
        guestGST: existingInvoice.guestGST,
        checkIn: existingInvoice.checkIn,
        checkOut: existingInvoice.checkOut,
        includeBreakfast: bf,
        isHourly: existingInvoice.isHourly,
        hours: existingInvoice.hours,
        hourlyRate: existingInvoice.hourlyRate,
        discountValue: existingInvoice.discountValue,
        discountType: existingInvoice.discountType,
        notes: existingInvoice.notes,
      });
      setRooms(parseRoomsFromString(existingInvoice.roomNumber, bf));
      setInvoiceNumber(existingInvoice.invoiceNumber);
    } else if (!isEdit && !isView) {
      const localNum = peekLocalInvoiceNumber();
      setInvoiceNumber(localNum);
    }
  }, [existingInvoice, isEdit, isView]);

  const today = new Date().toISOString().split("T")[0];
  const invoiceDate = form.checkOut || today;

  const setField = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // Breakfast toggle — update all rooms
  const handleBreakfastToggle = (val: boolean) => {
    setForm((prev) => ({ ...prev, includeBreakfast: val }));
    setRooms((prev) =>
      prev.map((room) => {
        const cat = ROOM_CODE_MAP[room.roomNumber];
        if (cat) {
          const rates = ROOM_RATES[cat];
          return {
            ...room,
            tariffPerNight: val ? rates.withBreakfast : rates.withoutBreakfast,
            breakfastCharge: val
              ? rates.withBreakfast - rates.withoutBreakfast
              : 0,
          };
        }
        return room;
      }),
    );
  };

  // Resolve add room input
  const addRoomCode = addRoomInput.trim();
  const addRoomCategory = ROOM_CODE_MAP[addRoomCode];
  const isAddRoomValid = !!addRoomCategory;
  const validCodes = Object.keys(ROOM_CODE_MAP).sort();

  const handleAddRoom = () => {
    const code = addRoomInput.trim();
    if (!code) return;
    const cat = ROOM_CODE_MAP[code];
    if (!cat) {
      setAddRoomError(`"${code}" is not a valid room number.`);
      return;
    }
    if (rooms.some((r) => r.roomNumber === code)) {
      setAddRoomError(`Room ${code} is already added.`);
      return;
    }
    const rates = ROOM_RATES[cat];
    const tariff = form.includeBreakfast
      ? rates.withBreakfast
      : rates.withoutBreakfast;
    const breakfast = form.includeBreakfast
      ? rates.withBreakfast - rates.withoutBreakfast
      : 0;
    const newRoom: RoomEntry = {
      roomNumber: code,
      roomCategory: cat,
      tariffPerNight: tariff,
      breakfastCharge: breakfast,
    };
    setRooms((prev) => {
      // Remove any empty placeholder rooms
      const filtered = prev.filter((r) => r.roomNumber !== "");
      return [...filtered, newRoom];
    });
    setAddRoomInput("");
    setAddRoomError("");
    addInputRef.current?.focus();
  };

  const handleRemoveRoom = (roomNumber: string) => {
    setRooms((prev) => {
      const filtered = prev.filter((r) => r.roomNumber !== roomNumber);
      if (filtered.length === 0) {
        return [
          {
            roomNumber: "",
            roomCategory: "",
            tariffPerNight: 0,
            breakfastCharge: 0,
          },
        ];
      }
      return filtered;
    });
  };

  const validRooms = rooms.filter((r) => r.roomNumber !== "");

  const calc = calcInvoiceMulti({
    rooms: validRooms.length > 0 ? validRooms : rooms,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    isHourly: form.isHourly,
    hours: form.hours,
    hourlyRate: form.hourlyRate,
    discountValue: form.discountValue,
    discountType: form.discountType,
  });

  // Build the combined room fields for the Invoice object (backend-compatible)
  const combinedRoomNumber = validRooms.map((r) => r.roomNumber).join(", ");
  const combinedRoomCategory =
    validRooms.length === 1
      ? validRooms[0].roomCategory
      : validRooms.length > 1
        ? "Multiple Rooms"
        : rooms[0]?.roomCategory || "";
  const combinedTariff = validRooms.reduce(
    (sum, r) => sum + r.tariffPerNight,
    0,
  );
  const combinedBreakfastCharge = validRooms.reduce(
    (sum, r) => sum + r.breakfastCharge,
    0,
  );

  const previewInvoice: Partial<Invoice> = {
    ...form,
    roomNumber: combinedRoomNumber,
    roomCategory: combinedRoomCategory,
    tariffPerNight: combinedTariff,
    breakfastCharge: combinedBreakfastCharge,
    invoiceNumber,
    invoiceDate: invoiceDate,
    nights: BigInt(Math.round(calc.nights)),
    roomAmount: calc.roomAmount,
    breakfastAmount: calc.breakfastAmount,
    taxableAmount: calc.taxableAmount,
    sgst: calc.sgst,
    cgst: calc.cgst,
    grandTotal: calc.grandTotal,
    discountAmount: calc.discountAmount,
  };

  const handleSave = async () => {
    if (!form.guestName) {
      toast.error("Please fill in guest name");
      return;
    }
    if (validRooms.length === 0) {
      toast.error("Please add at least one room");
      return;
    }
    if (!form.isHourly && (!form.checkIn || !form.checkOut)) {
      toast.error("Please fill in check-in and check-out dates");
      return;
    }

    let finalInvoiceNumber = invoiceNumber;
    if (!isEdit && !numberAllocated) {
      finalInvoiceNumber = getNextLocalInvoiceNumber();
      setInvoiceNumber(finalInvoiceNumber);
      setNumberAllocated(true);
    }

    const invoice: Invoice = {
      ...form,
      roomNumber: combinedRoomNumber,
      roomCategory: combinedRoomCategory,
      tariffPerNight: combinedTariff,
      breakfastCharge: combinedBreakfastCharge,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: invoiceDate,
      createdAt: BigInt(Date.now()),
      nights: BigInt(Math.round(calc.nights)),
      roomAmount: calc.roomAmount,
      breakfastAmount: calc.breakfastAmount,
      taxableAmount: calc.taxableAmount,
      sgst: calc.sgst,
      cgst: calc.cgst,
      grandTotal: calc.grandTotal,
      discountAmount: calc.discountAmount,
    };
    try {
      if (isEdit && existingInvoiceNumber) {
        await updateInvoice.mutateAsync({
          invoiceNumber: existingInvoiceNumber,
          invoice,
        });
        toast.success("Invoice updated!");
      } else {
        await createInvoice.mutateAsync(invoice);
        toast.success("Invoice created!");
      }
      onNavigate("dashboard");
    } catch {
      toast.error("Failed to save invoice");
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportInvoiceToPDF("invoice-preview-print", invoiceNumber);
      toast.success("PDF exported!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Representative category for breakfast rate display (first valid room)
  const firstValidRoom = validRooms[0];
  const ratesForDisplay = firstValidRoom
    ? ROOM_RATES[firstValidRoom.roomCategory as keyof typeof ROOM_RATES]
    : null;

  return (
    <div className="p-6 animate-fade-in" data-ocid="invoice_form.page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("dashboard")}
            className="gap-1.5"
            data-ocid="invoice_form.cancel_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-xl font-bold">
              {readOnly
                ? "View Invoice"
                : isEdit
                  ? "Edit Invoice"
                  : "New Invoice"}
            </h1>
            <p className="text-xs text-muted-foreground">{invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((p) => !p)}
            className="gap-1.5"
          >
            {showPreview ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
            data-ocid="invoice_form.secondary_button"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="gap-1.5"
            data-ocid="invoice_form.export_button"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
          {!readOnly && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createInvoice.isPending || updateInvoice.isPending}
              className="bg-primary text-primary-foreground gap-1.5"
              data-ocid="invoice_form.submit_button"
            >
              <Save className="w-3.5 h-3.5" />
              {isEdit ? "Update Invoice" : "Generate Invoice"}
            </Button>
          )}
        </div>
      </div>

      <div
        className={`grid gap-6 ${
          showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 max-w-2xl"
        }`}
      >
        {/* Form */}
        {!readOnly && (
          <div className="space-y-4">
            {/* Guest Information */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">
                    Guest Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.guestName}
                    onChange={(e) => setField("guestName", e.target.value)}
                    placeholder="Full name"
                    className="mt-1 h-9 text-sm"
                    data-ocid="invoice_form.input"
                  />
                </div>
                <div>
                  <Label className="text-xs">Guest Address</Label>
                  <Textarea
                    value={form.guestAddress}
                    onChange={(e) => setField("guestAddress", e.target.value)}
                    placeholder="Full address"
                    className="mt-1 text-sm min-h-[60px]"
                    data-ocid="invoice_form.textarea"
                  />
                </div>
                <div>
                  <Label className="text-xs">GST Number</Label>
                  <Input
                    value={form.guestGST}
                    onChange={(e) => setField("guestGST", e.target.value)}
                    placeholder="15-char GST"
                    className="mt-1 h-9 text-sm uppercase"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Type */}
            <Card className="shadow-card border-2 border-blue-200 bg-blue-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700">
                  Billing Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setField("isHourly", false)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                      !form.isHourly
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                    }`}
                    data-ocid="invoice_form.day_basis_button"
                  >
                    <Sun className="w-6 h-6" />
                    <span className="text-sm font-bold">Day Basis</span>
                    <span className="text-[11px] opacity-80">
                      Per night stay
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setField("isHourly", true)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                      form.isHourly
                        ? "border-orange-500 bg-orange-500 text-white shadow-md"
                        : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"
                    }`}
                    data-ocid="invoice_form.hourly_basis_button"
                  >
                    <Clock className="w-6 h-6" />
                    <span className="text-sm font-bold">Hourly Basis</span>
                    <span className="text-[11px] opacity-80">
                      Charge by hour
                    </span>
                  </button>
                </div>

                {!form.isHourly && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleBreakfastToggle(false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        !form.includeBreakfast
                          ? "border-blue-600 bg-blue-600 text-white shadow-md"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                      }`}
                      data-ocid="invoice_form.no_breakfast_button"
                    >
                      <span className="text-xs font-bold">
                        Without Breakfast
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBreakfastToggle(true)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        form.includeBreakfast
                          ? "border-green-600 bg-green-600 text-white shadow-md"
                          : "border-gray-200 bg-white text-gray-600 hover:border-green-300"
                      }`}
                      data-ocid="invoice_form.with_breakfast_button"
                    >
                      <Coffee className="w-4 h-4" />
                      <span className="text-xs font-bold">With Breakfast</span>
                      {ratesForDisplay && (
                        <span className="text-[11px] opacity-90">
                          +₹
                          {(
                            ratesForDisplay.withBreakfast -
                            ratesForDisplay.withoutBreakfast
                          ).toLocaleString("en-IN")}
                          /room/night
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stay Details */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Stay Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!form.isHourly && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">
                        Check-in Date{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={form.checkIn}
                        onChange={(e) => setField("checkIn", e.target.value)}
                        className="mt-1 h-9 text-sm"
                        data-ocid="invoice_form.checkin_input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        Check-out Date{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={form.checkOut}
                        onChange={(e) => setField("checkOut", e.target.value)}
                        className="mt-1 h-9 text-sm"
                        data-ocid="invoice_form.checkout_input"
                      />
                    </div>
                  </div>
                )}

                {form.isHourly && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">
                        Number of Hours{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.hours || ""}
                        onChange={(e) =>
                          setField(
                            "hours",
                            Number.parseInt(e.target.value) || 1,
                          )
                        }
                        placeholder="e.g. 3"
                        className="mt-1 h-9 text-sm"
                        data-ocid="invoice_form.hours_input"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        Hourly Rate (₹, incl. GST){" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        value={form.hourlyRate || ""}
                        onChange={(e) =>
                          setField(
                            "hourlyRate",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                        className="mt-1 h-9 text-sm"
                        data-ocid="invoice_form.hourly_rate_input"
                      />
                    </div>
                  </div>
                )}

                {/* ── MULTI-ROOM SELECTION ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold">
                      Room Selection <span className="text-destructive">*</span>
                    </Label>
                    {validRooms.length > 0 && (
                      <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                        {validRooms.length} room
                        {validRooms.length > 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>

                  {/* Room list */}
                  {validRooms.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {validRooms.map((room, idx) => (
                        <div
                          key={room.roomNumber}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg"
                          data-ocid={`invoice_form.item.${idx + 1}`}
                        >
                          <span className="inline-flex items-center justify-center h-5 w-8 rounded bg-blue-600 text-white text-[11px] font-bold shrink-0">
                            {room.roomNumber}
                          </span>
                          <span className="flex-1 text-xs text-gray-700 font-medium">
                            {room.roomCategory}
                          </span>
                          <span className="text-xs text-gray-500">
                            ₹{room.tariffPerNight.toLocaleString("en-IN")}/night
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRoom(room.roomNumber)}
                            className="ml-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove room"
                            data-ocid={`invoice_form.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add room input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        ref={addInputRef}
                        value={addRoomInput}
                        onChange={(e) => {
                          setAddRoomInput(e.target.value);
                          setAddRoomError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddRoom();
                          }
                        }}
                        placeholder="Type room number (e.g. 601)"
                        className="h-9 text-sm pr-20"
                        data-ocid="invoice_form.room_input"
                      />
                      {addRoomCode && (
                        <span
                          className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isAddRoomValid
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {isAddRoomValid ? addRoomCategory : "Invalid"}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddRoom}
                      disabled={!addRoomCode}
                      className="h-9 px-3 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                      data-ocid="invoice_form.primary_button"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </div>

                  {addRoomError && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-700">{addRoomError}</p>
                      <p className="text-xs text-red-500 mt-0.5">
                        Valid codes: {validCodes.join(" · ")}
                      </p>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Add multiple rooms for a single guest invoice. Press Enter
                    or click Add.
                  </p>
                </div>

                {/* Tariff note */}
                {!form.isHourly && validRooms.length > 0 && (
                  <div className="text-[11px] italic text-gray-400">
                    Tariffs include 5% GST (2.5% SGST + 2.5% CGST)
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discount */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Discount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant={
                      form.discountType === "rupees" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setField("discountType", "rupees")}
                    data-ocid="invoice_form.discount_type_button"
                  >
                    ₹ Rupees
                  </Button>
                  <Button
                    variant={
                      form.discountType === "percentage" ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setField("discountType", "percentage")}
                  >
                    % Percent
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">
                    {form.discountType === "rupees"
                      ? "Discount Amount (₹)"
                      : "Discount (%)"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.discountValue || ""}
                    onChange={(e) =>
                      setField(
                        "discountValue",
                        Number.parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="mt-1 h-9 text-sm"
                    data-ocid="invoice_form.discount_input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Calculation Summary */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-semibold">
                    Calculation Summary
                  </CardTitle>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 text-sm">
                  {form.isHourly ? (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Hours × Rate</span>
                      <span className="font-medium text-foreground">
                        {form.hours} × ₹
                        {form.hourlyRate.toLocaleString("en-IN")} = ₹
                        {calc.roomAmount.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Nights</span>
                      <span className="font-medium text-foreground">
                        {calc.nights}
                      </span>
                    </div>
                  )}
                  {validRooms.length > 1 && !form.isHourly && (
                    <div className="space-y-0.5">
                      {validRooms.map((r) => (
                        <div
                          key={r.roomNumber}
                          className="flex justify-between text-xs text-muted-foreground pl-2 border-l-2 border-blue-200"
                        >
                          <span>
                            Room {r.roomNumber} ({r.roomCategory})
                          </span>
                          <span>
                            ₹{r.tariffPerNight.toLocaleString("en-IN")} ×{" "}
                            {calc.nights} = ₹
                            {(r.tariffPerNight * calc.nights).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tariff Total (incl. GST)</span>
                    <span className="font-medium text-foreground">
                      ₹{calc.totalInclusiveGST.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs border-t pt-1">
                    <span className="italic">Base (ex-GST)</span>
                    <span>₹{calc.baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span className="italic">SGST @ 2.5%</span>
                    <span>₹{calc.sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span className="italic">CGST @ 2.5%</span>
                    <span>₹{calc.cgst.toFixed(2)}</span>
                  </div>
                  {calc.discountAmount > 0 && (
                    <div className="flex justify-between text-blue-600 border-t pt-1">
                      <span>
                        Discount
                        {form.discountType === "percentage"
                          ? ` (${form.discountValue}%)`
                          : ""}
                      </span>
                      <span className="font-medium">
                        - ₹{calc.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base text-primary">
                    <span>Grand Total</span>
                    <span>₹{calc.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Additional notes, payment status, etc."
                  className="text-sm min-h-[70px]"
                  data-ocid="invoice_form.notes_textarea"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview */}
        {(showPreview || readOnly) && (
          <div className="bg-white rounded-xl shadow-card overflow-auto">
            <div className="px-4 py-3 bg-muted/40 border-b flex items-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {readOnly ? "Invoice Details" : "Invoice Preview"}
              </span>
            </div>
            <div className="p-2">
              <InvoicePreview
                invoice={previewInvoice}
                id="invoice-preview-print"
                rooms={validRooms.length > 0 ? validRooms : undefined}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
