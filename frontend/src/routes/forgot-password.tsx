import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { Logo } from "@/components/Logo";
import { forgotPassword } from "@/services/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password — Ranting Chant" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError("Please enter your email address.");
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (error: unknown) {
      const isAxiosError = (e: unknown): e is { response?: { status?: number } } =>
        typeof e === 'object' && e !== null && 'response' in e;

      if (isAxiosError(error) && !error.response) {
        setError("Failed to connect to server. Please try again.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
      console.error("Forgot password error:", error);
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

        <h1 className="mb-2 text-2xl font-semibold text-ranting-ice">Forgot Password</h1>
        <p className="mb-6 text-sm text-ranting-deep">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {success ? (
          <div className="rounded-lg bg-green-500/10 p-4 text-center">
            <p className="text-sm text-green-400">
              If an account exists with that email, you'll receive a password reset link shortly.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-4 w-full glossy-btn px-4 py-2.5 text-sm"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              className="aero-input px-3.5 py-2.5 text-sm"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
            />
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              className="glossy-btn mt-2 px-4 py-2.5 text-sm"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
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
