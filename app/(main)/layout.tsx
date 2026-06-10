import Sidebar from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[1fr_320px]">
      <main className="overflow-x-auto px-4 py-5 md:px-7 md:py-6">{children}</main>
      <Sidebar />
    </div>
  );
}
