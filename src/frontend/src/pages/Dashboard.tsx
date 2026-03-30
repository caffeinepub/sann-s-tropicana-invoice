import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Clock,
  Edit,
  Eye,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Invoice } from "../backend.d";
import type { Page } from "../components/Sidebar";
import { useDeleteInvoice, useListInvoices } from "../hooks/useQueries";

interface DashboardProps {
  onNavigate: (page: Page, invoiceNumber?: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: invoices = [], isLoading } = useListInvoices();
  const deleteInvoice = useDeleteInvoice();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const filtered = invoices.filter(
    (inv) =>
      inv.guestName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()),
  );

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthInvoices = invoices.filter((inv) =>
    inv.invoiceDate.startsWith(thisMonth),
  );
  const totalRevenue = monthInvoices.reduce((s, i) => s + i.grandTotal, 0);

  const kpis = [
    {
      label: "Total Invoices",
      value: invoices.length,
      icon: Receipt,
      color: "text-primary",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "This Month Count",
      value: monthInvoices.length,
      icon: Clock,
      color: "text-orange-500",
    },
    {
      label: "Active Guests",
      value: invoices.length,
      icon: Users,
      color: "text-purple-500",
    },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice.mutateAsync(deleteTarget);
      toast.success("Invoice deleted");
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in" data-ocid="dashboard.page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage invoices and track revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onNavigate("gst-reports")}
            className="gap-2 border-primary text-primary hover:bg-primary/5"
            data-ocid="dashboard.gst_report_button"
          >
            <BarChart3 className="w-4 h-4" />
            GST Report
          </Button>
          <Button
            onClick={() => onNavigate("new-invoice")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            data-ocid="dashboard.primary_button"
          >
            <Plus className="w-4 h-4" />
            Create New Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">
                    {kpi.value}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Invoices
            </CardTitle>
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
                data-ocid="dashboard.search_input"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2" data-ocid="dashboard.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="py-12 text-center"
              data-ocid="dashboard.empty_state"
            >
              <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No invoices found</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onNavigate("new-invoice")}
              >
                Create your first invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold">
                    Invoice No.
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Guest Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Room</TableHead>
                  <TableHead className="text-xs font-semibold">
                    Nights
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv: Invoice, idx: number) => (
                  <TableRow
                    key={inv.invoiceNumber}
                    className="hover:bg-muted/20"
                    data-ocid={`invoice.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs font-medium text-primary">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {inv.guestName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inv.roomCategory} #{inv.roomNumber}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {Number(inv.nights)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(inv.grandTotal)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="text-[10px] px-2 py-0.5"
                        style={
                          inv.notes?.toLowerCase().includes("pending")
                            ? {
                                background: "oklch(0.95 0.07 55)",
                                color: "oklch(0.45 0.15 55)",
                              }
                            : {
                                background: "oklch(0.95 0.06 151)",
                                color: "oklch(0.38 0.15 151)",
                              }
                        }
                      >
                        {inv.notes?.toLowerCase().includes("pending")
                          ? "Pending"
                          : "Paid"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-primary"
                          onClick={() =>
                            onNavigate(
                              "new-invoice",
                              `view:${inv.invoiceNumber}`,
                            )
                          }
                          data-ocid={`invoice.edit_button.${idx + 1}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-primary"
                          onClick={() =>
                            onNavigate(
                              "new-invoice",
                              `edit:${inv.invoiceNumber}`,
                            )
                          }
                          data-ocid={`invoice.secondary_button.${idx + 1}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-destructive"
                          onClick={() => setDeleteTarget(inv.invoiceNumber)}
                          data-ocid={`invoice.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent data-ocid="invoice.dialog">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete invoice{" "}
            <strong>{deleteTarget}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-ocid="invoice.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
              data-ocid="invoice.confirm_button"
            >
              {deleteInvoice.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
