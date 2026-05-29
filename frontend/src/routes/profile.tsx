import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { TenantProfile } from "@/components/TenantProfile";
import { PropertyRepresentative } from "@/components/PropertyRepresentative";
import { useApp } from "@/context/AppContext";
import { requireAuthenticatedUser } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Ranting Chant" }] }),
  beforeLoad: () => requireAuthenticatedUser(),
  component: ProfilePage,
});

function ProfilePage() {
  const { userRole } = useApp();

  return (
    <AuthenticatedLayout>
      <main className="mx-auto min-h-[calc(100vh-130px)] max-w-[960px] py-3">
        <header className="mb-8">
          <h1 className="underline-glow text-3xl font-semibold tracking-tight text-ranting-ice">Profile</h1>
        </header>

        {userRole === "tenant" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <TenantProfile />
            <PropertyRepresentative />
          </div>
        ) : (
          <div className="glass-panel p-8 text-center text-ranting-muted">
            <p>Profile management is available in the Management tab for managers and owners.</p>
          </div>
        )}
      </main>
    </AuthenticatedLayout>
  );
}
