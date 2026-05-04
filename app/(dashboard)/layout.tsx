import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0A0A0A" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-[240px] overflow-y-auto pt-14 lg:pt-0 relative">
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
