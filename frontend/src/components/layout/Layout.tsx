import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ListPageEnhancer from "../common/ListPageEnhancer";
import { useLocation } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(208,218,173,0.24),_transparent_24%),linear-gradient(180deg,#fbfcf7_0%,#f5f7ef_100%)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 max-w-full overflow-x-hidden lg:ml-[248px]">
        <Navbar onToggleSidebar={() => setSidebarOpen((p) => !p)} />
        <main className="mt-[72px] flex min-h-[calc(100vh-72px)] min-w-0 max-w-full flex-col overflow-x-hidden bg-transparent px-3 pb-3 lg:px-4 lg:pb-4">
          <ListPageEnhancer />
          <div className="min-w-0 max-w-full flex-1">{children}</div>

          <div className="mt-4 flex items-center justify-between gap-2 rounded-[24px] border border-[#e4e8d7] bg-white/70 px-4 py-3 shadow-[0_14px_28px_rgba(59,73,35,0.06)] backdrop-blur flex-wrap">
            <span className="text-[11.5px] text-[#7d8665]">© 2026 Ascent IT. All rights reserved.</span>
            <span className="text-[11.5px] font-semibold text-[#5f7427]">Crafted by the Ascent IT Team</span>
          </div>
        </main>
      </div>
    </div>
  );
}


