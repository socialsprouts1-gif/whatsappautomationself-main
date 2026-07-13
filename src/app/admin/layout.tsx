import { redirect } from "next/navigation";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import { ensureLoaded } from "@/lib/store";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureLoaded();
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  return <>{children}</>;
}
