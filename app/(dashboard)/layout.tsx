import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { ActiveCompanyProvider } from "@/components/ActiveCompanyProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ActiveCompanyProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ActiveCompanyProvider>
  );
}
