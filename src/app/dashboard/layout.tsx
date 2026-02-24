import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-hub-bg flex flex-col">
      <Header username={user.username} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <Footer
        userId={user.id}
        username={user.username}
        userRole={user.role}
      />
    </div>
  );
}