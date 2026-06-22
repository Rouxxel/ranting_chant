import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { getTenants, authLogin } from "@/services/api";
import { Tenant } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Ranting Chant — Sign in" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentTenant, setCurrentManager, setUserRole } = useApp();
  const [tName, setTName] = useState("");
  const [tUnit, setTUnit] = useState("");
  const [mIdentifier, setMIdentifier] = useState("");
  const [mPassword, setMPassword] = useState("");
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
    if (!mIdentifier.trim() || !mPassword.trim()) return setErr("Please enter your email/username and password.");
    setErr(null);
    setIsLoading(true);

    try {
      const result = await authLogin(mIdentifier.trim(), mPassword);

      // Store tokens
      localStorage.setItem('auth_token', result.access_token);
      if (result.refresh_token) {
        localStorage.setItem('auth_refresh_token', result.refresh_token);
      }

      // Clear tenant data when logging in as manager/owner
      localStorage.removeItem('current_tenant');
      setCurrentTenant(null);

      // Persist actor + role synchronously so route guard passes on first navigation
      localStorage.setItem('current_manager', JSON.stringify(result.actor));
      localStorage.setItem('user_role', result.role);
      setCurrentManager(result.actor);
      setUserRole(result.role as 'manager' | 'owner');

      navigate({ to: "/management" });
    } catch (error: unknown) {
      const isAxiosError = (e: unknown): e is { response?: { status?: number } } =>
        typeof e === 'object' && e !== null && 'response' in e;

      if (isAxiosError(error) && error.response?.status === 401) {
        setErr("Invalid credentials. Please check your email and password.");
      } else if (isAxiosError(error) && !error.response) {
        setErr("Failed to connect to server. Please try again.");
      } else {
        setErr("Failed to connect to server. Please try again.");
      }
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
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Email" value={mIdentifier} onChange={(e) => setMIdentifier(e.target.value)} disabled={isLoading} autoComplete="username" />
              <input className="aero-input px-3.5 py-2.5 text-sm" type="password" placeholder="Password" value={mPassword} onChange={(e) => setMPassword(e.target.value)} disabled={isLoading} autoComplete="current-password" />
              {/* TODO: Disabled until database is correctly configured
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/forgot-password" })}
                  className="text-color-black text-xs underline"
                >
                  Forgot password?
                </button>
              </div>
              */}
              {err && <p className="text-xs text-red-300">{err}</p>}
              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Enter Dashboard"}
              </button>
              <div className="text-center">
                <p className="text-color-black text-xs">
                  No account? {" "}
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/signup" })}
                    className="text-color-black text-xs underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
