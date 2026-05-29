import { redirect } from "@tanstack/react-router";

type StoredRole = "tenant" | "manager" | "owner" | null;

function getStoredRole(): StoredRole {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem("user_role");
  return role === "tenant" || role === "manager" || role === "owner" ? role : null;
}

function hasStoredTenant(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("current_tenant"));
}

function hasStoredManager(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("current_manager"));
}

export function requireTenantAuth() {
  const role = getStoredRole();
  if (role !== "tenant" || !hasStoredTenant()) {
    throw redirect({ to: "/" });
  }
}

export function requireManagerOrOwnerAuth() {
  const role = getStoredRole();
  if ((role !== "manager" && role !== "owner") || !hasStoredManager()) {
    throw redirect({ to: "/" });
  }
}

export function requireAuthenticatedUser() {
  const role = getStoredRole();
  if (!role) {
    throw redirect({ to: "/" });
  }

  if (role === "tenant" && !hasStoredTenant()) {
    throw redirect({ to: "/" });
  }

  if ((role === "manager" || role === "owner") && !hasStoredManager()) {
    throw redirect({ to: "/" });
  }
}
