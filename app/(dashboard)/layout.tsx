import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden grid-bg" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-[240px] overflow-y-auto pt-14 lg:pt-0 relative">
        {/* Ambient glow top */}
        <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[400px] opacity-30"
          style={{ background: "radial-gradient(ellipse at top right, rgba(6,182,212,0.08), transparent 70%)" }} />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-7 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
