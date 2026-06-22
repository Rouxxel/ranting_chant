import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { resetPassword } from "@/services/api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Ranting Chant" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get the token from the URL hash (Supabase sends it as #access_token=...)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const token = hashParams.get("access_token") || (search as any).token || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return setError("Please enter a new password.");
    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!token) return setError("Invalid reset link. Please request a new password reset.");
    
    setError(null);
    setIsLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (error: unknown) {
      const isAxiosError = (e: unknown): e is { response?: { status?: number; data?: { detail?: string } } } =>
        typeof e === 'object' && e !== null && 'response' in e;

      if (isAxiosError(error)) {
        setError(error.response?.data?.detail || "Failed to reset password. The link may be invalid or expired.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
      console.error("Reset password error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="glass-panel-strong w-full max-w-[420px] p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Logo size="lg" />
            <p className="text-sm text-ranting-muted">AI-Powered Property Operations</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-400">
              Invalid reset link. Please request a new password reset.
            </p>
            <button
              onClick={() => navigate({ to: "/forgot-password" })}
              className="mt-4 w-full glossy-btn px-4 py-2.5 text-sm"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel-strong w-full max-w-[420px] p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-sm text-ranting-muted">AI-Powered Property Operations</p>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-ranting-ice">Reset Password</h1>
        <p className="mb-6 text-sm text-ranting-deep">
          Enter your new password below.
        </p>

        {success ? (
          <div className="rounded-lg bg-green-500/10 p-4 text-center">
            <p className="text-sm text-green-400">
              Your password has been reset successfully.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-4 w-full glossy-btn px-4 py-2.5 text-sm"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              className="aero-input px-3.5 py-2.5 text-sm"
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
            />
            <input
              className="aero-input px-3.5 py-2.5 text-sm"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              className="glossy-btn mt-2 px-4 py-2.5 text-sm"
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="text-color-black text-xs underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
