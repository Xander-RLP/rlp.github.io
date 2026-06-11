import SidebarShell from "@/components/SidebarShell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <SidebarShell>{children}</SidebarShell>;
}
