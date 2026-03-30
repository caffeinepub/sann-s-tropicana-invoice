export async function exportInvoiceToPDF(
  elementId: string,
  invoiceNumber: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Invoice element not found");

  // Use window.print() as fallback if html2canvas/jspdf not available
  // The print CSS in index.css handles A4 layout
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");

  const content = element.outerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice-${invoiceNumber}</title>
        <style>
          ${styles}
          @page { size: A4; margin: 10mm; }
          body { margin: 0; padding: 0; background: white; }
          .invoice-print-area { padding: 10mm; font-size: 11pt; }
        </style>
      </head>
      <body>
        ${content}
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
