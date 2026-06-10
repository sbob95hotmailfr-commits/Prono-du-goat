import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
