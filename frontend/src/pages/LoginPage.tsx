import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setSession } from "@/lib/session";

export default function LoginPage() {
  const navigate = useNavigate();
  const [tName, setTName] = useState("");
  const [tUnit, setTUnit] = useState("");
  const [mName, setMName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function tenantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tName.trim() || !tUnit.trim()) return setErr("Please enter your name and unit.");
    setErr(null);
    setSession({ role: "tenant", name: tName.trim(), unit: tUnit.trim() });
    navigate("/chat");
  }
  function managerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mName.trim()) return setErr("Please enter your name.");
    setErr(null);
    setSession({ role: "manager", name: mName.trim() });
    navigate("/management");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel-strong w-full max-w-[420px] p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-sm text-ranting-muted">AI-Powered Property Operations</p>
        </div>

        <Tabs defaultValue="tenant" className="w-full" onValueChange={() => setErr(null)}>
          <TabsList className="mb-5 grid w-full grid-cols-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <TabsTrigger value="tenant" className="rounded-lg data-[state=active]:bg-ranting-accent/60 data-[state=active]:text-white">
              I'm a Tenant
            </TabsTrigger>
            <TabsTrigger value="manager" className="rounded-lg data-[state=active]:bg-ranting-accent/60 data-[state=active]:text-white">
              I'm a Manager
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenant">
            <form onSubmit={tenantSubmit} className="flex flex-col gap-3">
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Full name" value={tName} onChange={(e) => setTName(e.target.value)} />
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Unit / Apartment #" value={tUnit} onChange={(e) => setTUnit(e.target.value)} />
              {err && <p className="text-xs text-red-300">{err}</p>}
              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm">Enter Ranting Chant</button>
            </form>
          </TabsContent>

          <TabsContent value="manager">
            <form onSubmit={managerSubmit} className="flex flex-col gap-3">
              <input className="aero-input px-3.5 py-2.5 text-sm" placeholder="Full name" value={mName} onChange={(e) => setMName(e.target.value)} />
              {err && <p className="text-xs text-red-300">{err}</p>}
              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm">Enter Dashboard</button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-[11px] text-ranting-muted">
          Demo · no real authentication
        </p>
      </div>
    </main>
  );
}
