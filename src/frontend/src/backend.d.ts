import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Invoice {
    breakfastCharge: number;
    checkIn: string;
    discountValue: number;
    taxableAmount: number;
    breakfastAmount: number;
    isHourly: boolean;
    hours: number;
    cgst: number;
    discountAmount: number;
    createdAt: bigint;
    discountType: string;
    sgst: number;
    hourlyRate: number;
    guestAddress: string;
    guestName: string;
    roomNumber: string;
    grandTotal: number;
    invoiceDate: string;
    tariffPerNight: number;
    invoiceNumber: string;
    includeBreakfast: boolean;
    notes: string;
    roomAmount: number;
    checkOut: string;
    nights: bigint;
    roomCategory: string;
    guestGST: string;
}
export interface backendInterface {
    createInvoice(invoice: Invoice): Promise<string>;
    deleteInvoice(invoiceNumber: string): Promise<void>;
    getInvoice(invoiceNumber: string): Promise<Invoice>;
    getInvoicesByDateRange(startDate: string, endDate: string): Promise<Array<Invoice>>;
    getNextInvoiceNumber(): Promise<string>;
    listInvoices(): Promise<Array<Invoice>>;
    updateInvoice(invoiceNumber: string, invoice: Invoice): Promise<void>;
}
