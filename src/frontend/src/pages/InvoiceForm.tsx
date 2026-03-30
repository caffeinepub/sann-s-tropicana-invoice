import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Printer,
  Save,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Invoice } from "../backend.d";
import InvoicePreview from "../components/InvoicePreview";
import type { Page } from "../components/Sidebar";
import { ROOM_CATEGORIES, ROOM_CODE_MAP, ROOM_RATES } from "../constants/hotel";
import {
  useCreateInvoice,
  useGetInvoice,
  useNextInvoiceNumber,
  useUpdateInvoice,
} from "../hooks/useQueries";
import { calcInvoice } from "../utils/calculations";
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

const DEFAULT_CATEGORY = "Deluxe Double";

const EMPTY_FORM = {
  guestName: "",
  guestAddress: "",
  guestGST: "",
  checkIn: "",
  checkOut: "",
  roomCategory: DEFAULT_CATEGORY as string,
  roomNumber: "",
  tariffPerNight: ROOM_RATES[DEFAULT_CATEGORY].withoutBreakfast,
  includeBreakfast: false,
  breakfastCharge: 0,
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

  const { data: nextNumber } = useNextInvoiceNumber();
  const { data: existingInvoice } = useGetInvoice(existingInvoiceNumber || "");
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const [form, setForm] = useState(EMPTY_FORM);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [numberAllocated, setNumberAllocated] = useState(false);

  useEffect(() => {
    if (existingInvoice) {
      setForm({
        guestName: existingInvoice.guestName,
        guestAddress: existingInvoice.guestAddress,
        guestGST: existingInvoice.guestGST,
        checkIn: existingInvoice.checkIn,
        checkOut: existingInvoice.checkOut,
        roomCategory: existingInvoice.roomCategory,
        roomNumber: existingInvoice.roomNumber,
        tariffPerNight: existingInvoice.tariffPerNight,
        includeBreakfast: existingInvoice.includeBreakfast,
        breakfastCharge: existingInvoice.breakfastCharge,
        isHourly: existingInvoice.isHourly,
        hours: existingInvoice.hours,
        hourlyRate: existingInvoice.hourlyRate,
        discountValue: existingInvoice.discountValue,
        discountType: existingInvoice.discountType,
        notes: existingInvoice.notes,
      });
      setRoomCodeInput(existingInvoice.roomNumber);
      setInvoiceNumber(existingInvoice.invoiceNumber);
    } else if (!isEdit && !isView) {
      const localNum = peekLocalInvoiceNumber();
      setInvoiceNumber(nextNumber || localNum);
    } else if (nextNumber && !existingInvoice) {
      setInvoiceNumber(nextNumber);
    }
  }, [existingInvoice, nextNumber, isEdit, isView]);

  const today = new Date().toISOString().split("T")[0];

  const setField = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // Room code validation
  const resolvedCategory = roomCodeInput
    ? ROOM_CODE_MAP[roomCodeInput]
    : undefined;
  const isValidCode = !!resolvedCategory;
  const validCodes = Object.keys(ROOM_CODE_MAP).sort();

  const handleRoomCodeChange = (code: string) => {
    setRoomCodeInput(code);
    const cat = ROOM_CODE_MAP[code];
    if (cat) {
      setForm((prev) => {
        const rate = ROOM_RATES[cat];
        const tariff = prev.includeBreakfast
          ? rate.withBreakfast
          : rate.withoutBreakfast;
        const breakfast = prev.includeBreakfast
          ? rate.withBreakfast - rate.withoutBreakfast
          : 0;
        return {
          ...prev,
          roomCategory: cat,
          roomNumber: code,
          tariffPerNight: tariff,
          breakfastCharge: breakfast,
        };
      });
    } else {
      setForm((prev) => ({ ...prev, roomNumber: code }));
    }
  };

  const handleBreakfastToggle = (val: boolean) => {
    setForm((prev) => {
      const cat = prev.roomCategory as keyof typeof ROOM_RATES;
      const rates = ROOM_RATES[cat];
      if (rates) {
        const tariff = val ? rates.withBreakfast : rates.withoutBreakfast;
        const breakfast = val
          ? rates.withBreakfast - rates.withoutBreakfast
          : 0;
        return {
          ...prev,
          includeBreakfast: val,
          tariffPerNight: tariff,
          breakfastCharge: breakfast,
        };
      }
      return { ...prev, includeBreakfast: val };
    });
  };

  const handleCategoryChange = (cat: string) => {
    setForm((prev) => {
      const rates = ROOM_RATES[cat as keyof typeof ROOM_RATES];
      if (rates) {
        const tariff = prev.includeBreakfast
          ? rates.withBreakfast
          : rates.withoutBreakfast;
        const breakfast = prev.includeBreakfast
          ? rates.withBreakfast - rates.withoutBreakfast
          : 0;
        return {
          ...prev,
          roomCategory: cat,
          tariffPerNight: tariff,
          breakfastCharge: breakfast,
        };
      }
      return { ...prev, roomCategory: cat };
    });
  };

  const calc = calcInvoice({
    tariffPerNight: form.tariffPerNight,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    includeBreakfast: form.includeBreakfast,
    breakfastCharge: form.breakfastCharge,
    isHourly: form.isHourly,
    hours: form.hours,
    hourlyRate: form.hourlyRate,
    discountValue: form.discountValue,
    discountType: form.discountType,
  });

  const previewInvoice: Partial<Invoice> = {
    ...form,
    invoiceNumber,
    invoiceDate: today,
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
    if (!form.guestName || !form.roomNumber) {
      toast.error("Please fill in all required fields");
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
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: today,
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

  const ratesForCategory = form.roomCategory
    ? ROOM_RATES[form.roomCategory as keyof typeof ROOM_RATES]
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

            {/* Billing Type -- PROMINENT SECTION */}
            <Card className="shadow-card border-2 border-blue-200 bg-blue-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-700">
                  Billing Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Day / Hourly buttons */}
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

                {/* Breakfast toggle -- only for Day Basis */}
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
                      {ratesForCategory && (
                        <span className="text-[11px] opacity-90">
                          ₹
                          {ratesForCategory.withoutBreakfast.toLocaleString(
                            "en-IN",
                          )}
                          /night
                        </span>
                      )}
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
                      {ratesForCategory && (
                        <span className="text-[11px] opacity-90">
                          ₹
                          {ratesForCategory.withBreakfast.toLocaleString(
                            "en-IN",
                          )}
                          /night
                          <span className="ml-1 font-normal">
                            (+₹
                            {(
                              ratesForCategory.withBreakfast -
                              ratesForCategory.withoutBreakfast
                            ).toLocaleString("en-IN")}
                            )
                          </span>
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
              <CardContent className="space-y-3">
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

                {/* Room code */}
                <div>
                  <Label className="text-xs">
                    Room Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={roomCodeInput}
                      onChange={(e) => handleRoomCodeChange(e.target.value)}
                      placeholder="e.g. 601, 603, 609"
                      className="h-9 text-sm"
                      data-ocid="invoice_form.room_input"
                    />
                    {roomCodeInput && (
                      <Badge
                        className={`whitespace-nowrap shrink-0 ${
                          isValidCode
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }`}
                        variant="outline"
                      >
                        {isValidCode ? `✓ ${resolvedCategory}` : "✗ Invalid"}
                      </Badge>
                    )}
                  </div>
                  {roomCodeInput && !isValidCode && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-700 font-medium mb-1">
                        Valid room codes:
                      </p>
                      <p className="text-xs text-red-600 leading-relaxed">
                        {validCodes.join(" · ")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Room Category */}
                <div>
                  <Label className="text-xs">Room Category</Label>
                  <Select
                    value={form.roomCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger
                      className="mt-1 h-9 text-sm"
                      data-ocid="invoice_form.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_CATEGORIES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                          {ROOM_RATES[r] && (
                            <span className="text-muted-foreground ml-2">
                              ₹
                              {ROOM_RATES[r].withoutBreakfast.toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tariff */}
                {!form.isHourly && (
                  <div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">
                        Tariff per Night (₹, incl. GST)
                      </Label>
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <Input
                      type="number"
                      value={form.tariffPerNight || ""}
                      onChange={(e) =>
                        setField(
                          "tariffPerNight",
                          Number.parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                      className="mt-1 h-9 text-sm"
                      data-ocid="invoice_form.tariff_input"
                    />
                    <p className="text-[11px] italic text-gray-400 mt-1">
                      Tariff includes 5% GST (2.5% SGST + 2.5% CGST)
                    </p>
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
