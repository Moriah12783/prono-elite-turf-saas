import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AdminLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await requireAdmin();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
      <Sidebar />
      <main className="flex-1 space-y-6">
        <Topbar user={user} />
        {children}
      </main>
    </div>
  );
}
