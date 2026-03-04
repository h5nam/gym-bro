import BottomNav from "@/components/layout/BottomNav";
import QueryProvider from "@/components/providers/QueryProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="mx-auto min-h-dvh max-w-lg pb-16">
        {children}
        <BottomNav />
      </div>
    </QueryProvider>
  );
}
