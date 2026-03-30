import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import Sidebar, { type Page } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import GSTReports from "./pages/GSTReports";
import InvoiceForm from "./pages/InvoiceForm";

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [pageParams, setPageParams] = useState<string | undefined>();

  const handleNavigate = (page: Page, params?: string) => {
    setActivePage(page);
    setPageParams(params);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage={activePage} onNavigate={(p) => handleNavigate(p)} />

      <main className="flex-1 overflow-y-auto">
        {activePage === "dashboard" && (
          <Dashboard onNavigate={handleNavigate} />
        )}
        {activePage === "new-invoice" && (
          <InvoiceForm onNavigate={handleNavigate} params={pageParams} />
        )}
        {activePage === "gst-reports" && <GSTReports />}
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
