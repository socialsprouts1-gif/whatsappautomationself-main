import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { ensureLoaded } from "@/lib/store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureLoaded();
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8f9fa" }}>
      <Sidebar user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, companyName: user.companyName }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ background: "#f8f9fa" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
