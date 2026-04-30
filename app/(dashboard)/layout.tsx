import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#080c14" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-[260px] overflow-y-auto pt-14 lg:pt-0 relative">

        {/* Background: grid + orbs */}
        <div className="fixed inset-0 lg:left-[260px] pointer-events-none overflow-hidden">
          {/* Grid */}
          <div className="absolute inset-0 bg-grid opacity-100" />

          {/* Orbs */}
          <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full blur-[160px]"
            style={{ background: "radial-gradient(circle, rgba(20,184,166,0.055) 0%, transparent 70%)" }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full blur-[130px]"
            style={{ background: "radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)" }} />
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.025) 0%, transparent 70%)" }} />

          {/* Vignette edges */}
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(8,12,20,0.6) 100%)" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
