import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Download,
  FileText,
  Plus,
  Printer,
  Save,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Invoice } from "../backend.d";
import { HOTEL } from "../constants/hotel";
import { useListInvoices } from "../hooks/useQueries";
import { exportToCSV } from "../utils/csvExport";

const MAX_MANUAL_ROWS = 80;

interface GSTRow {
  billDate: string;
  invoiceNo: string;
  partyGST: string;
  partyName: string;
  sacCode: string;
  taxPct: string;
  invoiceAmount: number;
  invoiceWithoutTax: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
}

interface ManualGSTEntry {
  _id: string;
  billDate: string;
  invoiceNo: string;
  partyGST: string;
  partyName: string;
  sacCode: string;
  taxPct: string;
  invoiceAmount: number;
  invoiceWithoutTax: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
}

function toGSTRow(inv: Invoice): GSTRow {
  const taxableAmount = inv.taxableAmount;
  return {
    billDate: inv.invoiceDate,
    invoiceNo: inv.invoiceNumber,
    partyGST: inv.guestGST || "N/A",
    partyName: inv.guestName,
    sacCode: "996311",
    taxPct: "5%",
    invoiceAmount: inv.grandTotal,
    invoiceWithoutTax: taxableAmount,
    taxableAmount: taxableAmount,
    cgst: inv.cgst,
    sgst: inv.sgst,
  };
}

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n,
  );

let _idCounter = 0;
function newId() {
  _idCounter += 1;
  return `entry-${_idCounter}`;
}

function emptyManualEntry(): ManualGSTEntry {
  return {
    _id: newId(),
    billDate: new Date().toISOString().split("T")[0],
    invoiceNo: "",
    partyGST: "",
    partyName: "",
    sacCode: "996311",
    taxPct: "5%",
    invoiceAmount: 0,
    invoiceWithoutTax: 0,
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
  };
}

// Standard GST table used in daily / all-invoices view
function GSTTable({
  rows,
  showTotal = false,
}: { rows: GSTRow[]; showTotal?: boolean }) {
  const total = rows.reduce(
    (acc, r) => ({
      invoiceAmount: acc.invoiceAmount + r.invoiceAmount,
      invoiceWithoutTax: acc.invoiceWithoutTax + r.invoiceWithoutTax,
      taxableAmount: acc.taxableAmount + r.taxableAmount,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
    }),
    {
      invoiceAmount: 0,
      invoiceWithoutTax: 0,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
    },
  );

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40">
          {[
            "INVOICE DATE",
            "INVOICE NO.",
            "GUEST GST NO.",
            "GUEST NAME",
            "SAC CODE",
            "TAX % (5%)",
            "INVOICE VALUE",
            "INVOICE VALUE WITHOUT TAX",
            "TAXABLE VALUE",
            "CGST 2.5%",
            "SGST 2.5%",
          ].map((h) => (
            <TableHead
              key={h}
              className="text-xs font-semibold whitespace-nowrap"
            >
              {h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow
            key={`${row.invoiceNo}-${i}`}
            className="hover:bg-muted/20 text-xs"
            data-ocid={`gst.item.${i + 1}`}
          >
            <TableCell className="whitespace-nowrap">
              {new Date(row.billDate).toLocaleDateString("en-IN")}
            </TableCell>
            <TableCell className="font-medium text-primary">
              {row.invoiceNo}
            </TableCell>
            <TableCell>{row.partyGST}</TableCell>
            <TableCell className="font-medium">{row.partyName}</TableCell>
            <TableCell>{row.sacCode}</TableCell>
            <TableCell>{row.taxPct}</TableCell>
            <TableCell className="text-right font-semibold">
              {INR(row.invoiceAmount)}
            </TableCell>
            <TableCell className="text-right">
              {INR(row.invoiceWithoutTax)}
            </TableCell>
            <TableCell className="text-right">
              {INR(row.taxableAmount)}
            </TableCell>
            <TableCell className="text-right">{INR(row.cgst)}</TableCell>
            <TableCell className="text-right">{INR(row.sgst)}</TableCell>
          </TableRow>
        ))}
        {showTotal && rows.length > 0 && (
          <TableRow className="bg-primary/5 font-bold text-xs">
            <TableCell colSpan={6} className="font-bold">
              Total
            </TableCell>
            <TableCell className="text-right">
              {INR(total.invoiceAmount)}
            </TableCell>
            <TableCell className="text-right">
              {INR(total.invoiceWithoutTax)}
            </TableCell>
            <TableCell className="text-right">
              {INR(total.taxableAmount)}
            </TableCell>
            <TableCell className="text-right">{INR(total.cgst)}</TableCell>
            <TableCell className="text-right">{INR(total.sgst)}</TableCell>
          </TableRow>
        )}
        {rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={11}
              className="text-center py-8 text-muted-foreground text-sm"
              data-ocid="gst.empty_state"
            >
              No data for selected range
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

// Tax Filing Report table -- yellow header, exact format for GST filing
function TaxFilingTable({ rows, month }: { rows: GSTRow[]; month: string }) {
  const total = rows.reduce(
    (acc, r) => ({
      invoiceAmount: acc.invoiceAmount + r.invoiceAmount,
      invoiceWithoutTax: acc.invoiceWithoutTax + r.invoiceWithoutTax,
      taxableAmount: acc.taxableAmount + r.taxableAmount,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
    }),
    {
      invoiceAmount: 0,
      invoiceWithoutTax: 0,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
    },
  );

  const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const COLS = 11;

  return (
    <div className="mb-8 overflow-auto border border-gray-300 rounded">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th
              colSpan={COLS}
              className="py-2 px-3 text-center font-bold text-black border border-gray-300"
              style={{ backgroundColor: "#FFFF00" }}
            >
              {HOTEL.name
                .toUpperCase()
                .replace("'", "'")
                .replace("HOTEL", "")
                .trim()}{" "}
              TROPICANA - {HOTEL.gstNo} — {monthLabel.toUpperCase()}
            </th>
          </tr>
          <tr style={{ backgroundColor: "#FFFF00" }}>
            {[
              "INVOICE DATE",
              "INVOICE NO.",
              "GUEST GST NO.",
              "GUEST NAME",
              "SAC CODE",
              "TAX % (5%)",
              "INVOICE VALUE",
              "INVOICE VALUE WITHOUT TAX",
              "TAXABLE VALUE",
              "CGST 2.5%",
              "SGST 2.5%",
            ].map((h) => (
              <th
                key={h}
                className="py-1.5 px-2 text-left font-bold text-black border border-gray-300 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
          <tr style={{ backgroundColor: "#FFFDE7" }}>
            <td
              colSpan={COLS}
              className="py-1 px-2 text-[10px] text-yellow-800 border-b border-gray-300 italic"
            >
              ↳ Each row shows the tax breakdown (CGST + SGST) for that
              individual bill
            </td>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.invoiceNo}-${i}`}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="py-1.5 px-2 border border-gray-200 whitespace-nowrap">
                {new Date(row.billDate).toLocaleDateString("en-IN")}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 font-medium">
                {row.invoiceNo}
              </td>
              <td className="py-1.5 px-2 border border-gray-200">
                {row.partyGST}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 font-medium">
                {row.partyName}
              </td>
              <td className="py-1.5 px-2 border border-gray-200">
                {row.sacCode}
              </td>
              <td className="py-1.5 px-2 border border-gray-200">
                {row.taxPct}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 text-right font-semibold">
                {INR(row.invoiceAmount)}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 text-right">
                {INR(row.invoiceWithoutTax)}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 text-right">
                {INR(row.taxableAmount)}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 text-right">
                {INR(row.cgst)}
              </td>
              <td className="py-1.5 px-2 border border-gray-200 text-right">
                {INR(row.sgst)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={COLS}
                className="py-6 text-center text-gray-500 text-sm"
              >
                No invoices for this month
              </td>
            </tr>
          )}
          {rows.length > 0 && (
            <tr className="font-bold" style={{ backgroundColor: "#FFF9C4" }}>
              <td
                colSpan={6}
                className="py-1.5 px-2 border border-gray-300 font-bold"
              >
                TOTAL
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right">
                {INR(total.invoiceAmount)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right">
                {INR(total.invoiceWithoutTax)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right">
                {INR(total.taxableAmount)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right">
                {INR(total.cgst)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right">
                {INR(total.sgst)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const MANUAL_COLUMNS = [
  { key: "billDate", label: "INVOICE DATE", type: "date", width: "110px" },
  { key: "invoiceNo", label: "INVOICE NO.", type: "text", width: "110px" },
  { key: "partyGST", label: "GUEST GST NO.", type: "text", width: "140px" },
  { key: "partyName", label: "GUEST NAME", type: "text", width: "140px" },
  { key: "sacCode", label: "SAC CODE", type: "text", width: "90px" },
  { key: "taxPct", label: "TAX % (5%)", type: "text", width: "90px" },
  {
    key: "invoiceAmount",
    label: "INVOICE VALUE",
    type: "number",
    width: "110px",
  },
  {
    key: "invoiceWithoutTax",
    label: "INVOICE WITHOUT TAX",
    type: "number",
    width: "130px",
  },
  {
    key: "taxableAmount",
    label: "TAXABLE VALUE",
    type: "number",
    width: "110px",
  },
  { key: "cgst", label: "CGST 2.5%", type: "number", width: "90px" },
  { key: "sgst", label: "SGST 2.5%", type: "number", width: "90px" },
] as const;

// GST Monthly Filing -- manual entry tab
function GSTMonthlyFiling() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [entries, setEntries] = useState<ManualGSTEntry[]>([
    emptyManualEntry(),
  ]);
  const [savedMsg, setSavedMsg] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `gst_manual_filing_${selectedMonth}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Omit<ManualGSTEntry, "_id">[];
        const withIds = parsed.map((e) => ({ ...e, _id: newId() }));
        setEntries(withIds.length > 0 ? withIds : [emptyManualEntry()]);
      } catch {
        setEntries([emptyManualEntry()]);
      }
    } else {
      setEntries([emptyManualEntry()]);
    }
  }, [storageKey]);

  const updateEntry = (
    id: string,
    field: keyof ManualGSTEntry,
    value: string | number,
  ) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e._id !== id) return e;
        const updated = { ...e, [field]: value };
        if (field === "invoiceAmount") {
          const inv = Number(value) || 0;
          const taxable = Math.round((inv / 1.05) * 100) / 100;
          updated.taxableAmount = taxable;
          updated.invoiceWithoutTax = taxable;
          updated.cgst = Math.round(taxable * 0.025 * 100) / 100;
          updated.sgst = Math.round(taxable * 0.025 * 100) / 100;
        }
        return updated;
      }),
    );
  };

  const addRow = () => {
    if (entries.length >= MAX_MANUAL_ROWS) return;
    setEntries((prev) => [...prev, emptyManualEntry()]);
  };

  const removeRow = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e._id !== id);
      return next.length > 0 ? next : [emptyManualEntry()];
    });
  };

  const handleSave = () => {
    const toSave = entries.map(({ _id: _dropped, ...rest }) => rest);
    localStorage.setItem(storageKey, JSON.stringify(toSave));
    setSavedMsg("Saved!");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSavedMsg(""), 2000);
  };

  const handleExportCSV = () => {
    const monthLabel = new Date(`${selectedMonth}-01`).toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" },
    );
    exportToCSV(
      entries.map((r) => ({
        "Invoice Date": r.billDate,
        "Invoice No": r.invoiceNo,
        "Guest GST No": r.partyGST,
        "Guest Name": r.partyName,
        "SAC Code": r.sacCode,
        "Tax %": r.taxPct,
        "Invoice Value": r.invoiceAmount,
        "Invoice Value Without Tax": r.invoiceWithoutTax,
        "Taxable Value": r.taxableAmount,
        "CGST 2.5%": r.cgst,
        "SGST 2.5%": r.sgst,
      })),
      `GST-Manual-Filing-${monthLabel}.csv`,
    );
  };

  const handlePrint = () => window.print();

  const totals = entries.reduce(
    (acc, r) => ({
      invoiceAmount: acc.invoiceAmount + (Number(r.invoiceAmount) || 0),
      invoiceWithoutTax:
        acc.invoiceWithoutTax + (Number(r.invoiceWithoutTax) || 0),
      taxableAmount: acc.taxableAmount + (Number(r.taxableAmount) || 0),
      cgst: acc.cgst + (Number(r.cgst) || 0),
      sgst: acc.sgst + (Number(r.sgst) || 0),
    }),
    {
      invoiceAmount: 0,
      invoiceWithoutTax: 0,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
    },
  );

  const monthLabel = new Date(`${selectedMonth}-01`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" },
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div>
          <Label className="text-xs font-semibold text-yellow-800 mb-1 block">
            Select Month
          </Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 text-sm w-44"
            data-ocid="gst_manual.select"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleSave}
            className="gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white"
            data-ocid="gst_manual.save_button"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
            data-ocid="gst_manual.export_button"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
            data-ocid="gst_manual.print_button"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
        </div>
        {savedMsg && (
          <span
            className="text-sm font-semibold text-green-700"
            data-ocid="gst_manual.success_state"
          >
            ✓ {savedMsg}
          </span>
        )}
        <span className="text-xs text-yellow-700 ml-auto">
          {entries.length} / {MAX_MANUAL_ROWS} rows
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto border border-gray-300 rounded">
        <table
          className="w-full text-xs border-collapse"
          style={{ minWidth: 1300 }}
        >
          <thead>
            <tr>
              <th
                colSpan={MANUAL_COLUMNS.length + 2}
                className="py-2 px-3 text-center font-bold text-black border border-gray-300"
                style={{ backgroundColor: "#FFFF00" }}
              >
                {HOTEL.name.toUpperCase()} - {HOTEL.gstNo} —{" "}
                {monthLabel.toUpperCase()} — GST MONTHLY FILING
              </th>
            </tr>
            <tr style={{ backgroundColor: "#FFFF00" }}>
              <th className="py-1.5 px-2 text-left font-bold text-black border border-gray-300 whitespace-nowrap w-8">
                #
              </th>
              {MANUAL_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="py-1.5 px-2 text-left font-bold text-black border border-gray-300 whitespace-nowrap"
                  style={{ minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="py-1.5 px-2 text-center font-bold text-black border border-gray-300 w-10">
                Del
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry._id}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                data-ocid={`gst_manual.item.${i + 1}`}
              >
                <td className="py-1 px-2 border border-gray-200 text-gray-400 text-center">
                  {i + 1}
                </td>
                {MANUAL_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="py-1 px-1 border border-gray-200"
                  >
                    <input
                      type={col.type === "number" ? "number" : col.type}
                      value={
                        entry[col.key as keyof ManualGSTEntry] as
                          | string
                          | number
                      }
                      onChange={(e) =>
                        updateEntry(
                          entry._id,
                          col.key as keyof ManualGSTEntry,
                          col.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                        )
                      }
                      className="w-full px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-transparent"
                      style={{ minWidth: col.width }}
                      step={col.type === "number" ? "0.01" : undefined}
                    />
                  </td>
                ))}
                <td className="py-1 px-1 border border-gray-200 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(entry._id)}
                    className="text-red-400 hover:text-red-600 p-0.5 rounded"
                    title="Remove row"
                    data-ocid={`gst_manual.delete_button.${i + 1}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="font-bold" style={{ backgroundColor: "#FFF9C4" }}>
              <td
                colSpan={7}
                className="py-1.5 px-2 border border-gray-300 font-bold text-xs"
              >
                TOTAL
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right text-xs">
                {INR(totals.invoiceAmount)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right text-xs">
                {INR(totals.invoiceWithoutTax)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right text-xs">
                {INR(totals.taxableAmount)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right text-xs">
                {INR(totals.cgst)}
              </td>
              <td className="py-1.5 px-2 border border-gray-300 text-right text-xs">
                {INR(totals.sgst)}
              </td>
              <td className="border border-gray-300" />
            </tr>
          </tbody>
        </table>
      </div>

      {entries.length < MAX_MANUAL_ROWS ? (
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-1.5 border-dashed"
          data-ocid="gst_manual.primary_button"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row ({entries.length}/{MAX_MANUAL_ROWS})
        </Button>
      ) : (
        <p className="text-xs text-red-500" data-ocid="gst_manual.error_state">
          Maximum {MAX_MANUAL_ROWS} entries reached.
        </p>
      )}
    </div>
  );
}

export default function GSTReports() {
  const { data: invoices = [], isLoading } = useListInvoices();
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const filtered = invoices.filter(
    (inv) => inv.invoiceDate >= startDate && inv.invoiceDate <= endDate,
  );

  const rows = filtered.map(toGSTRow);

  const byDate = rows.reduce<Record<string, GSTRow[]>>((acc, r) => {
    const key = r.billDate;
    acc[key] = acc[key] || [];
    acc[key].push(r);
    return acc;
  }, {});

  const byMonth = rows.reduce<Record<string, GSTRow[]>>((acc, r) => {
    const key = r.billDate.slice(0, 7);
    acc[key] = acc[key] || [];
    acc[key].push(r);
    return acc;
  }, {});

  const allRows = invoices.map(toGSTRow);
  const allByMonth = allRows.reduce<Record<string, GSTRow[]>>((acc, r) => {
    const key = r.billDate.slice(0, 7);
    acc[key] = acc[key] || [];
    acc[key].push(r);
    return acc;
  }, {});

  const handleExportCSV = (data: GSTRow[], filename: string) => {
    exportToCSV(
      data.map((r) => ({
        "Invoice Date": r.billDate,
        "Invoice No": r.invoiceNo,
        "Guest GST No": r.partyGST,
        "Guest Name": r.partyName,
        "SAC Code": r.sacCode,
        "Tax %": r.taxPct,
        "Invoice Value": r.invoiceAmount,
        "Invoice Value Without Tax": r.invoiceWithoutTax,
        "Taxable Value": r.taxableAmount,
        "CGST 2.5%": r.cgst,
        "SGST 2.5%": r.sgst,
      })),
      filename,
    );
  };

  const handlePrintTaxFiling = () => {
    window.print();
  };

  const totalRevenue = rows.reduce((s, r) => s + r.invoiceAmount, 0);
  const totalTax = rows.reduce((s, r) => s + r.cgst + r.sgst, 0);

  return (
    <div className="p-6 space-y-5 animate-fade-in" data-ocid="gst_reports.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GST Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tax summary for filing and auditing · GST No: {HOTEL.gstNo}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Invoices in Range", value: rows.length, icon: Calendar },
          {
            label: "Taxable Amount",
            value: INR(rows.reduce((s, r) => s + r.taxableAmount, 0)),
            icon: TrendingUp,
          },
          {
            label: "Total Tax (CGST+SGST)",
            value: INR(totalTax),
            icon: TrendingUp,
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {item.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <p className="text-xl font-bold">{item.value}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Date filter */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label className="text-xs mb-1">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm w-40"
                data-ocid="gst_reports.start_input"
              />
            </div>
            <div>
              <Label className="text-xs mb-1">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm w-40"
                data-ocid="gst_reports.end_input"
              />
            </div>
            <p className="text-sm text-muted-foreground pb-1">
              {rows.length} invoice{rows.length !== 1 ? "s" : ""} | Revenue:{" "}
              <strong>{INR(totalRevenue)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="taxfiling">
        <div className="flex items-center justify-between">
          <TabsList data-ocid="gst_reports.tab">
            <TabsTrigger value="taxfiling" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Monthly Tax Filing
            </TabsTrigger>
            <TabsTrigger value="manualfiling" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              GST Monthly Filing
            </TabsTrigger>
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="monthly">Monthly View</TabsTrigger>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleExportCSV(rows, `GST-Report-${startDate}-to-${endDate}.csv`)
            }
            className="gap-1.5"
            data-ocid="gst_reports.export_button"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        {/* TAX FILING TAB */}
        <TabsContent value="taxfiling">
          <div className="space-y-2 mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-yellow-800">
                Monthly Tax Filing Report — {HOTEL.name} | GST: {HOTEL.gstNo}
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Each row shows the CGST &amp; SGST for that individual bill. Use
                "Export CSV" or "Print" to submit for GST filing.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintTaxFiling}
              className="gap-1.5 ml-4 shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
              data-ocid="gst_reports.print_button"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : Object.keys(allByMonth).length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No invoices found
            </div>
          ) : (
            <div>
              {Object.keys(allByMonth)
                .sort()
                .reverse()
                .map((month) => (
                  <TaxFilingTable
                    key={month}
                    rows={allByMonth[month]}
                    month={month}
                  />
                ))}
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintTaxFiling}
              className="gap-1.5"
              data-ocid="gst_reports.print_button"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExportCSV(
                  allRows,
                  `Tax-Filing-Report-${new Date().getFullYear()}.csv`,
                )
              }
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Full Year CSV
            </Button>
          </div>
        </TabsContent>

        {/* MANUAL GST FILING TAB */}
        <TabsContent value="manualfiling">
          <div className="space-y-2 mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-semibold text-yellow-800">
              GST Monthly Filing — Manual Entry | {HOTEL.name} | GST:{" "}
              {HOTEL.gstNo}
            </p>
            <p className="text-xs text-yellow-700">
              Manually enter up to {MAX_MANUAL_ROWS} GST entries per month for
              your GST filing submission. Data is saved locally per month.
            </p>
          </div>
          <GSTMonthlyFiling />
        </TabsContent>

        <TabsContent value="daily">
          <Card className="shadow-card">
            <CardContent className="p-0 overflow-auto">
              {isLoading ? (
                <div
                  className="p-4 space-y-2"
                  data-ocid="gst_reports.loading_state"
                >
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                Object.keys(byDate)
                  .sort()
                  .reverse()
                  .map((date) => (
                    <div key={date}>
                      <div className="px-4 py-2 bg-muted/40 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">
                          {new Date(date).toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {byDate[date].length} invoice(s)
                        </span>
                      </div>
                      <GSTTable rows={byDate[date]} showTotal />
                    </div>
                  ))
              )}
              {!isLoading && Object.keys(byDate).length === 0 && (
                <div
                  className="py-10 text-center text-sm text-muted-foreground"
                  data-ocid="gst_reports.empty_state"
                >
                  No invoices in selected date range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="shadow-card">
            <CardContent className="p-0 overflow-auto">
              {Object.keys(byMonth)
                .sort()
                .reverse()
                .map((month) => (
                  <div key={month}>
                    <div className="px-4 py-2 bg-primary/10 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">
                        {new Date(`${month}-01`).toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {byMonth[month].length} invoice(s)
                      </span>
                    </div>
                    <GSTTable rows={byMonth[month]} showTotal />
                  </div>
                ))}
              {Object.keys(byMonth).length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No invoices in selected range
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card className="shadow-card">
            <CardContent className="p-0 overflow-auto">
              <GSTTable rows={rows} showTotal />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
