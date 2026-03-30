import type { Invoice } from "../backend.d";

const KEY = "invoices_local";

type SerializedInvoice = Omit<Invoice, "createdAt" | "nights"> & {
  createdAt: string;
  nights: string;
};

function loadAll(): Invoice[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: SerializedInvoice[] = JSON.parse(raw);
    return parsed.map((inv) => ({
      ...inv,
      createdAt: BigInt(inv.createdAt),
      nights: BigInt(inv.nights),
    }));
  } catch {
    return [];
  }
}

function saveAll(invoices: Invoice[]): void {
  const serializable = invoices.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toString(),
    nights: inv.nights.toString(),
  }));
  localStorage.setItem(KEY, JSON.stringify(serializable));
}

export const localInvoiceStore = {
  list(): Invoice[] {
    return loadAll();
  },
  get(invoiceNumber: string): Invoice | undefined {
    return loadAll().find((inv) => inv.invoiceNumber === invoiceNumber);
  },
  create(invoice: Invoice): string {
    const invoices = loadAll();
    invoices.unshift(invoice);
    saveAll(invoices);
    return invoice.invoiceNumber;
  },
  update(invoiceNumber: string, invoice: Invoice): void {
    const invoices = loadAll();
    const idx = invoices.findIndex((i) => i.invoiceNumber === invoiceNumber);
    if (idx !== -1) {
      invoices[idx] = invoice;
    } else {
      invoices.unshift(invoice);
    }
    saveAll(invoices);
  },
  delete(invoiceNumber: string): void {
    const invoices = loadAll().filter((i) => i.invoiceNumber !== invoiceNumber);
    saveAll(invoices);
  },
};
