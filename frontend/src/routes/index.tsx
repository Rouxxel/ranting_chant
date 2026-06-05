import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { getTenants, getManagers, getOwners } from "@/services/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Ranting Chant — Sign in" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentTenant, setCurrentManager, setUserRole } = useApp();
  const [tName, setTName] = useState("");
  const [tUnit, setTUnit] = useState("");
  const [mName, setMName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function tenantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tName.trim() || !tUnit.trim()) return setErr("Please enter your name and unit.");
    setErr(null);
    setIsLoading(true);

    try {
      // 1. Try cache first
      let tenants: Tenant[] = [];
      const cached = localStorage.getItem('tenants');
      if (cached) {
        try {
          tenants = JSON.parse(cached);
        } catch (e) {
          console.error("Failed to parse cached tenants:", e);
        }
      }

      let matchedTenant = tenants.find(
        t => t.name.toLowerCase() === tName.trim().toLowerCase() && 
             t.unit.toLowerCase() === tUnit.trim().toLowerCase()
      );

      // 2. Fetch fresh from network if not cached or if lookup failed
      if (!matchedTenant) {
        const freshTenants = await getTenants();
        localStorage.setItem('tenants', JSON.stringify(freshTenants));
        matchedTenant = freshTenants.find(
          t => t.name.toLowerCase() === tName.trim().toLowerCase() && 
               t.unit.toLowerCase() === tUnit.trim().toLowerCase()
        );
      }

      if (matchedTenant) {
        // Persist synchronously: route guards read localStorage in beforeLoad,
        // which runs before AppContext's post-render effects would write it.
        localStorage.setItem('current_tenant', JSON.stringify(matchedTenant));
        localStorage.setItem('user_role', 'tenant');
        setCurrentTenant(matchedTenant);
        setUserRole('tenant');
        navigate({ to: "/chat" });
      } else {
        setErr("No tenant found with that name and unit. Please check your information.");
      }
    } catch (error) {
      setErr("Failed to connect to server. Please try again.");
      console.error("Tenant login error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function managerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mName.trim()) return setErr("Please enter your name.");
    setErr(null);
    setIsLoading(true);

    try {
      // 1. Try cache first
      let managers: Manager[] = [];
      let owners: Owner[] = [];
      const cachedManagers = localStorage.getItem('managers');
      const cachedOwners = localStorage.getItem('owners');
      
      if (cachedManagers) {
        try { managers = JSON.parse(cachedManagers); } catch {}
      }
      if (cachedOwners) {
        try { owners = JSON.parse(cachedOwners); } catch {}
      }

      let matchedManager = managers.find(
        m => m.name.toLowerCase() === mName.trim().toLowerCase()
      );
      let matchedOwner = owners.find(
        o => o.name.toLowerCase() === mName.trim().toLowerCase()
      );

      // 2. Fetch fresh from network if not cached or lookup failed
      if (!matchedManager && !matchedOwner) {
        const [freshManagers, freshOwners] = await Promise.all([getManagers(), getOwners()]);
        localStorage.setItem('managers', JSON.stringify(freshManagers));
        localStorage.setItem('owners', JSON.stringify(freshOwners));
        
        matchedManager = freshManagers.find(
          m => m.name.toLowerCase() === mName.trim().toLowerCase()
        );
        matchedOwner = freshOwners.find(
          o => o.name.toLowerCase() === mName.trim().toLowerCase()
        );
      }

      if (matchedManager) {
        // Persist synchronously so the route guard (which reads localStorage) passes on first click.
        localStorage.setItem('current_manager', JSON.stringify(matchedManager));
        localStorage.setItem('user_role', 'manager');
        setCurrentManager(matchedManager);
        setUserRole('manager');
        navigate({ to: "/management" });
      } else if (matchedOwner) {
        localStorage.setItem('current_manager', JSON.stringify(matchedOwner));
        localStorage.setItem('user_role', 'owner');
        setCurrentManager(matchedOwner);
        setUserRole('owner');
        navigate({ to: "/management" });
      } else {
        setErr("No manager or owner found with that name. Please check your information.");
      }
    } catch (error) {
      setErr("Failed to connect to server. Please try again.");
      console.error("Manager/Owner login error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel-strong w-full max-w-[420px] p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-sm text-ranting-muted">AI-Powered Property Operations</p>
        </div>

        <Tabs defaultValue="tenant" className="w-full" onValueChange={() => setErr(null)}>
          <TabsList className="mb-5 grid w-full grid-cols-2 gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger value="tenant" className="aero-tab px-4 py-2 text-sm font-semibold">
              I'm a Tenant
            </TabsTrigger>
            <TabsTrigger value="manager" className="aero-tab px-4 py-2 text-sm font-semibold">
              I'm a Manager/Owner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenant">
            <form onSubmit={tenantSubmit} className="flex flex-col gap-3">
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Full name" value={tName} onChange={(e) => setTName(e.target.value)} disabled={isLoading} />
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Unit / Apartment #" value={tUnit} onChange={(e) => setTUnit(e.target.value)} disabled={isLoading} />
              {err && <p className="text-xs text-red-300">{err}</p>}
              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Enter Ranting Chant"}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="manager">
            <form onSubmit={managerSubmit} className="flex flex-col gap-3">
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Full name" value={mName} onChange={(e) => setMName(e.target.value)} disabled={isLoading} />
              {err && <p className="text-xs text-red-300">{err}</p>}
              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Enter Dashboard"}
              </button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
