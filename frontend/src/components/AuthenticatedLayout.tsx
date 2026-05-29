import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/context/AppContext";

type AppRole = "tenant" | "manager" | "owner";

function getNavLinks(role: AppRole) {
  if (role === "tenant") {
    return [
      { to: "/chat", label: "Chat" },
      { to: "/requests", label: "Requests" },
      { to: "/profile", label: "Profile" },
      { to: "/vendors", label: "Vendors" },
    ] as const;
  }

  return [
    { to: "/management", label: "Management" },
    { to: "/vendors", label: "Vendors" },
  ] as const;
}

export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { currentTenant, currentManager, userRole, clearUser } = useApp();
  const role = userRole as AppRole;

  const displayName = currentTenant?.name || currentManager?.name || "User";
  const roleLabel = role === "tenant" ? "Tenant" : role === "owner" ? "Owner" : "Manager";
  const navLinks = getNavLinks(role);

  function handleLogout() {
    clearUser();

    const keysToClear = Object.keys(localStorage).filter(
      (key) => key.startsWith("requests_") || key === "vendors" || key === "auth_token",
    );
    keysToClear.forEach((key) => localStorage.removeItem(key));

    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen px-5 py-5">
      <header className="glass-panel mx-auto mb-5 flex w-full max-w-[1400px] items-center justify-between px-5 py-4">
        <Logo size="sm" />
        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="glossy-btn-ghost px-3 py-1.5 text-xs"
              activeProps={{ className: "glossy-btn-ghost-active px-3 py-1.5 text-xs" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold text-ranting-ice">{displayName}</div>
            <div className="text-[11px] text-ranting-muted">{roleLabel}</div>
          </div>
          <Avatar name={displayName} size={36} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="glossy-btn-ghost px-3 py-1.5 text-xs">
                Logout
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-ranting-sky/30 bg-ranting-navy text-ranting-ice">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                <AlertDialogDescription className="text-ranting-muted">
                  You will return to the login screen and your current local session will be cleared.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="glossy-btn-ghost border-ranting-sky/25 bg-ranting-deep text-ranting-ice hover:bg-ranting-accent hover:text-white">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="glossy-btn">
                  Log out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>
      {children}
    </div>
  );
}
