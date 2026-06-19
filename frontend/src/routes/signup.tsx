import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signupManager, signupOwner } from "@/services/api";
import { User, Building2, Mail, Lock, UserCircle, Phone, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    // Redirect authenticated users away from sign-up page
    const token = localStorage.getItem('auth_token');
    const currentManager = localStorage.getItem('current_manager');
    const userRole = localStorage.getItem('user_role');

    if (token && (currentManager || userRole)) {
      throw redirect({ to: "/management" as any });
    }
  },
  head: () => ({ meta: [{ title: "Ranting Chant — Sign Up" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"manager" | "owner">("manager");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone) return true; // Optional field
    const re = /^[\d\s\-\(\)\+]{10,}$/;
    return re.test(phone);
  };

  const checkPasswordStrength = (password: string) => {
    if (password.length < 8) return "weak";
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return "weak";
    if (strength <= 3) return "medium";
    return "strong";
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(checkPasswordStrength(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (phone && !validatePhone(phone)) {
      setError("Please enter a valid phone number");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the terms of service");
      return;
    }

    setIsLoading(true);

    try {
      const signupData = {
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        username: username.trim() || undefined,
      };

      if (role === "manager") {
        await signupManager(signupData);
      } else {
        await signupOwner(signupData);
      }

      setSuccess(true);
    } catch (err: unknown) {
      const isAxiosError = (e: unknown): e is { response?: { data?: { detail?: string }; status?: number } } =>
        typeof e === "object" && e !== null && "response" in e;

      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (isAxiosError(err) && err.response?.status === 400) {
        setError("An account with this email already exists");
      } else {
        setError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="glass-panel-strong w-full max-w-[420px] p-8 text-center">
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-ranting-ice text-2xl font-semibold">Check Your Email</h2>
          </div>
          <p className="text-ranting-muted mb-6 text-sm">
            We've sent a confirmation link to <span className="text-ranting-ice font-semibold">{email}</span>.
            Please check your inbox and click the link to activate your account.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="glossy-btn w-full px-4 py-2.5 text-sm"
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel-strong w-full max-w-[420px] p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <button
            onClick={() => navigate({ to: "/" })}
            className="absolute left-4 top-4 flex items-center gap-2 text-ranting-muted hover:text-ranting-ice transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>
          <Logo size="lg" />
          <p className="text-sm text-ranting-muted">Create Your Account</p>
        </div>

        <Tabs defaultValue="manager" value={role} onValueChange={(v) => setRole(v as "manager" | "owner")} className="w-full">
          <TabsList className="mb-5 grid w-full grid-cols-2 gap-2 bg-transparent p-0 h-auto">
            <TabsTrigger value="manager" className="aero-tab px-4 py-2 text-sm font-semibold">
              <Building2 className="mr-2 h-4 w-4" />
              Manager
            </TabsTrigger>
            <TabsTrigger value="owner" className="aero-tab px-4 py-2 text-sm font-semibold">
              <UserCircle className="mr-2 h-4 w-4" />
              Owner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manager">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              {password && passwordStrength && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-ranting-deep/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength === "weak"
                          ? "w-1/3 bg-red-400"
                          : passwordStrength === "medium"
                          ? "w-2/3 bg-yellow-400"
                          : "w-full bg-green-400"
                      }`}
                    />
                  </div>
                  <span className="text-xs text-ranting-muted capitalize">{passwordStrength}</span>
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  placeholder="Username (Optional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-ranting-sky/50 bg-ranting-deep/30 text-ranting-sky focus:ring-ranting-sky"
                />
                <span className="text-xs text-ranting-muted">
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-400/50 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Sign Up as Manager"}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="owner">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              {password && passwordStrength && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-ranting-deep/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength === "weak"
                          ? "w-1/3 bg-red-400"
                          : passwordStrength === "medium"
                          ? "w-2/3 bg-yellow-400"
                          : "w-full bg-green-400"
                      }`}
                    />
                  </div>
                  <span className="text-xs text-ranting-muted capitalize">{passwordStrength}</span>
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ranting-muted" />
                <input
                  className="aero-input w-full pl-10 pr-4 py-2.5 text-sm"
                  placeholder="Username (Optional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-ranting-sky/50 bg-ranting-deep/30 text-ranting-sky focus:ring-ranting-sky"
                />
                <span className="text-xs text-ranting-muted">
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/20 border border-red-400/50 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button type="submit" className="glossy-btn mt-2 px-4 py-2.5 text-sm" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Sign Up as Owner"}
              </button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <p className="text-color-black text-xs">
            Already have an account?{" "}
            <button
              onClick={() => navigate({ to: "/" })}
              className="text-color-blue underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
