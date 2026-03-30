import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Invoice } from "../backend.d";
import { localInvoiceStore } from "../utils/localInvoiceStore";
import { useActor } from "./useActor";

export function useListInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      const local = localInvoiceStore.list();
      if (!actor) return local;
      try {
        const remote = await actor.listInvoices();
        const remoteNumbers = new Set(remote.map((i) => i.invoiceNumber));
        const localOnly = local.filter(
          (i) => !remoteNumbers.has(i.invoiceNumber),
        );
        return [...remote, ...localOnly];
      } catch {
        return local;
      }
    },
    enabled: !isFetching,
  });
}

export function useGetInvoice(invoiceNumber: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice>({
    queryKey: ["invoice", invoiceNumber],
    queryFn: async () => {
      if (actor) {
        try {
          return await actor.getInvoice(invoiceNumber);
        } catch {
          // fall through to local
        }
      }
      const local = localInvoiceStore.get(invoiceNumber);
      if (!local) throw new Error("Invoice not found");
      return local;
    },
    enabled: !isFetching && !!invoiceNumber,
  });
}

export function useNextInvoiceNumber() {
  const { actor, isFetching } = useActor();
  return useQuery<string>({
    queryKey: ["nextInvoiceNumber"],
    queryFn: async () => {
      if (!actor) return "INV-001";
      try {
        return await actor.getNextInvoiceNumber();
      } catch {
        return "INV-001";
      }
    },
    enabled: !isFetching,
  });
}

export function useInvoicesByDateRange(startDate: string, endDate: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Invoice[]>({
    queryKey: ["invoices", "range", startDate, endDate],
    queryFn: async () => {
      if (actor) {
        try {
          return await actor.getInvoicesByDateRange(startDate, endDate);
        } catch {
          // fall through
        }
      }
      return localInvoiceStore
        .list()
        .filter(
          (inv) => inv.invoiceDate >= startDate && inv.invoiceDate <= endDate,
        );
    },
    enabled: !isFetching && !!startDate && !!endDate,
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      // Always save locally first — guaranteed to succeed
      localInvoiceStore.create(invoice);
      // Then sync to backend (best-effort)
      if (actor) {
        try {
          await actor.createInvoice(invoice);
        } catch {
          // local save already succeeded
        }
      }
      return invoice.invoiceNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["nextInvoiceNumber"] });
    },
  });
}

export function useUpdateInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceNumber,
      invoice,
    }: { invoiceNumber: string; invoice: Invoice }) => {
      localInvoiceStore.update(invoiceNumber, invoice);
      if (actor) {
        try {
          await actor.updateInvoice(invoiceNumber, invoice);
        } catch {
          // local update already succeeded
        }
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["invoice", vars.invoiceNumber],
      });
    },
  });
}

export function useDeleteInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceNumber: string) => {
      localInvoiceStore.delete(invoiceNumber);
      if (actor) {
        try {
          await actor.deleteInvoice(invoiceNumber);
        } catch {
          // local delete already succeeded
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
