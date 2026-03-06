// dubai-control/src/pages/Login.tsx

import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Eye, EyeOff, Mail, Lock, User, Building2, MapPin, Camera, Clipboard, FileText, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

// Shield Logo SVG Component
const ShieldLogo = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"
      fill="url(#logo_g)"
      fillOpacity="0.12"
      stroke="url(#logo_g)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="url(#logo_g)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="logo_g" x1="4" y1="2" x2="20" y2="22">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  </svg>
);

// Custom Input with Icon
interface IconInputProps {
  icon: React.ReactNode;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  showToggle?: boolean;
  required?: boolean;
  disabled?: boolean;
}

function IconInput({
  icon,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  showToggle,
  required,
  disabled,
}: IconInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const actualType = showToggle ? (showPassword ? "text" : "password") : type;

  return (
    <div className="mb-[18px]">
      <Label className="block text-[13.5px] font-medium text-[#4B5161] mb-1.5">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      <div className="relative">
        <div className="absolute left-[13px] top-1/2 -translate-y-1/2 flex pointer-events-none">
          <div className={cn("transition-colors", focused ? "text-[#2563EB]" : "text-[#9CA3B0]")}>
            {icon}
          </div>
        </div>
        <Input
          type={actualType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            "h-[46px] pl-[42px] text-sm transition-all",
            "border-[1.5px] rounded-[10px]",
            focused
              ? "border-[#2563EB] bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
              : "border-[#E2E4E9] bg-[#F4F5F7]",
            showToggle && "pr-[46px]"
          )}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3B0] hover:text-[#6C7281]"
          >
            {showPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Proof Chain Cards Data
const proofSteps = [
  { icon: MapPin, color: "bg-[#EFF4FF]", iconColor: "text-[#2563EB]", title: "GPS Verification", desc: "Confirm presence at every location" },
  { icon: Camera, color: "bg-[#ECFDF5]", iconColor: "text-[#059669]", title: "Photo Evidence", desc: "Timestamped before & after documentation" },
  { icon: Clipboard, color: "bg-[#F5F3FF]", iconColor: "text-[#7C3AED]", title: "Smart Checklists", desc: "Track every task with SLA compliance" },
  { icon: FileText, color: "bg-[#EFF4FF]", iconColor: "text-[#2563EB]", title: "PDF Reports", desc: "Client-ready reports generated instantly" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: "signin" or "signup"
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [mounted, setMounted] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Sign in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign up fields
  const [signupCompany, setSignupCompany] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change flow state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Trial flow
  const trialTier = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tier = params.get("trial");
    if (tier === "standard" || tier === "pro" || tier === "enterprise") {
      return tier;
    }
    return null;
  }, [location.search]);

  const isTrialFlow = trialTier !== null;

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const switchMode = (m: "signin" | "signup") => {
    if (m === mode) return;
    setError(null);
    setMode(m);
    setAnimKey((k) => k + 1);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/manager/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Password change required
        if (response.status === 403 && data?.code === "PASSWORD_CHANGE_REQUIRED") {
          setPasswordChangeData({
            currentPassword: password,
            newPassword: "",
            confirmPassword: "",
          });
          setShowPasswordChange(true);
          setIsLoading(false);
          return;
        }

        const detail =
          (data && typeof data.detail === "string" && data.detail) ||
          (data && typeof data.message === "string" && data.message) ||
          "Unable to sign in. Please check your credentials.";
        throw new Error(detail);
      }

      if (data?.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("auth_token", data.token);
      }
      if (data?.role) {
        localStorage.setItem("authUserRole", data.role);
      }
      if (data?.email) {
        localStorage.setItem("authUserEmail", data.email);
      }

      if (isTrialFlow && trialTier) {
        localStorage.setItem("cleanproof_trial_entry", trialTier);
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Unable to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupCompany || !signupName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      setError("All fields are required");
      return;
    }

    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: signupCompany.trim(),
          full_name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });

      if (!res.ok) {
        let message = "Failed to create account. Please try again.";
        try {
          const data = (await res.json()) as any;
          if (typeof data?.detail === "string") {
            message = data.detail;
          } else if (typeof data?.error === "string") {
            message = data.error;
          }
        } catch {
          // ignore
        }
        setError(message);
        return;
      }

      // Success - switch to sign in mode with populated email
      setEmail(signupEmail.trim());
      setPassword("");
      setMode("signin");
      setAnimKey((k) => k + 1);
      setError(null);
      setSignupCompany("");
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);

    if (!passwordChangeData.newPassword) {
      setPasswordChangeError("New password is required");
      return;
    }

    if (passwordChangeData.newPassword.length < 8) {
      setPasswordChangeError("Password must be at least 8 characters");
      return;
    }

    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      setPasswordChangeError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      const changeResponse = await fetch(`${API_BASE_URL}/api/me/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordChangeData.currentPassword,
          new_password: passwordChangeData.newPassword,
        }),
      });

      const changeData = await changeResponse.json().catch(() => null);

      if (!changeResponse.ok) {
        const message = changeData?.message || changeData?.detail || "Failed to change password";
        throw new Error(message);
      }

      const newLoginResponse = await fetch(`${API_BASE_URL}/api/manager/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: passwordChangeData.newPassword }),
      });

      const newLoginData = await newLoginResponse.json().catch(() => null);

      if (!newLoginResponse.ok) {
        throw new Error("Password changed but auto-login failed. Please log in manually.");
      }

      if (newLoginData?.token) {
        localStorage.setItem("authToken", newLoginData.token);
        localStorage.setItem("auth_token", newLoginData.token);
      }
      if (newLoginData?.role) {
        localStorage.setItem("authUserRole", newLoginData.role);
      }
      if (newLoginData?.email) {
        localStorage.setItem("authUserEmail", newLoginData.email);
      }

      navigate("/dashboard");
    } catch (err: any) {
      setPasswordChangeError(err?.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password Change Modal
  if (showPasswordChange) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <ShieldLogo />
            <div>
              <span className="text-[19px] font-bold text-[#111318] tracking-tight">Proof</span>
              <span className="text-[19px] font-light text-[#9CA3B0] ml-1 tracking-tight">Platform</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E4E9] bg-white p-8 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-[#111318]">Password Change Required</h2>
                <p className="mt-2 text-sm text-[#6C7281]">
                  Your access has been reset. Please set a new password to continue.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm font-medium">
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordChangeData.currentPassword}
                  className="h-11 bg-[#F4F5F7] border-[#E2E4E9]"
                  readOnly
                />
                <p className="text-xs text-[#9CA3B0]">This is your temporary password</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordChangeData.newPassword}
                  onChange={(e) =>
                    setPasswordChangeData({
                      ...passwordChangeData,
                      newPassword: e.target.value,
                    })
                  }
                  className="h-11 bg-white border-[#E2E4E9] focus:border-[#2563EB]"
                  placeholder="Enter new password"
                  required
                  disabled={isChangingPassword}
                />
                <p className="text-xs text-[#9CA3B0]">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordChangeData.confirmPassword}
                  onChange={(e) =>
                    setPasswordChangeData({
                      ...passwordChangeData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="h-11 bg-white border-[#E2E4E9] focus:border-[#2563EB]"
                  placeholder="Confirm new password"
                  required
                  disabled={isChangingPassword}
                />
              </div>

              {passwordChangeError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {passwordChangeError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4FD7] text-white font-medium"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing password...
                  </>
                ) : (
                  "Change password and sign in"
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-[#9CA3B0]">
            Your new password will be used for future logins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: "#F8F9FB",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        className={cn(
          "flex w-full max-w-[1000px] min-h-[620px] rounded-[20px] overflow-hidden",
          "bg-white border border-[#E2E4E9]",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)]",
          "transition-all duration-500",
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
        )}
      >
        {/* LEFT: Form */}
        <div className="flex-[0_0_440px] max-w-[440px] px-9 py-10 flex flex-col justify-center border-r border-[#E2E4E9] bg-white auth-left-panel">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <ShieldLogo />
            <div>
              <span className="text-[19px] font-bold text-[#111318] tracking-tight">Proof</span>
              <span className="text-[19px] font-light text-[#9CA3B0] ml-1 tracking-tight">Platform</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-6 border-b border-[#E2E4E9]">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={cn(
                "relative pb-3.5 pt-2.5 px-0.5 text-sm font-medium transition-colors",
                "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0",
                "after:h-0.5 after:rounded-sm after:transition-all after:duration-250",
                mode === "signin"
                  ? "text-[#111318] after:bg-[#2563EB]"
                  : "text-[#9CA3B0] hover:text-[#6C7281]"
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={cn(
                "relative pb-3.5 pt-2.5 px-0.5 text-sm font-medium transition-colors",
                "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0",
                "after:h-0.5 after:rounded-sm after:transition-all after:duration-250",
                mode === "signup"
                  ? "text-[#111318] after:bg-[#2563EB]"
                  : "text-[#9CA3B0] hover:text-[#6C7281]"
              )}
            >
              Create account
            </button>
          </div>

          {/* Form */}
          <div key={animKey} className="animate-in fade-in slide-in-from-bottom-2 duration-350">
            {mode === "signin" ? (
              <>
                <p className="text-sm text-[#6C7281] mb-6 leading-relaxed">
                  Welcome back. Sign in to your workspace.
                </p>

                {error && (
                  <div className="px-3.5 py-2.5 mb-4 rounded-[9px] text-[13px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignIn}>
                  <IconInput
                    icon={<Mail className="h-[18px] w-[18px]" />}
                    label="Email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                  <IconInput
                    icon={<Lock className="h-[18px] w-[18px]" />}
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    showToggle
                    disabled={isLoading}
                  />
                  <div className="flex justify-end -mt-2.5 mb-5">
                    <a
                      href="#"
                      className="text-[12.5px] text-[#2563EB] font-medium hover:text-[#1D4FD7] hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full h-[46px] rounded-[10px] text-sm font-semibold bg-[#2563EB] text-white",
                      "hover:bg-[#1D4FD7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(37,99,235,0.25)]",
                      "transition-all duration-200 flex items-center justify-center gap-2",
                      isLoading && "opacity-80"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign in <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm text-[#6C7281] mb-5 leading-relaxed">
                  Start your 7-day free trial. No credit card required.
                </p>

                {error && (
                  <div className="px-3.5 py-2.5 mb-4 rounded-[9px] text-[13px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignUp}>
                  <IconInput
                    icon={<Building2 className="h-[18px] w-[18px]" />}
                    label="Company name"
                    placeholder="e.g., Sparkle Clean Services"
                    value={signupCompany}
                    onChange={(e) => setSignupCompany(e.target.value)}
                    autoComplete="organization"
                    required
                    disabled={isLoading}
                  />
                  <IconInput
                    icon={<User className="h-[18px] w-[18px]" />}
                    label="Your name"
                    placeholder="e.g., Aisha Khan"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    autoComplete="name"
                    required
                    disabled={isLoading}
                  />
                  <IconInput
                    icon={<Mail className="h-[18px] w-[18px]" />}
                    label="Work email"
                    type="email"
                    placeholder="name@company.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={isLoading}
                  />
                  <IconInput
                    icon={<Lock className="h-[18px] w-[18px]" />}
                    label="Password"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    autoComplete="new-password"
                    showToggle
                    required
                    disabled={isLoading}
                  />
                  <IconInput
                    icon={<Lock className="h-[18px] w-[18px]" />}
                    label="Confirm password"
                    placeholder="Confirm your password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    showToggle
                    required
                    disabled={isLoading}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "w-full h-[46px] rounded-[10px] text-sm font-semibold bg-[#2563EB] text-white",
                      "hover:bg-[#1D4FD7] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(37,99,235,0.25)]",
                      "transition-all duration-200 flex items-center justify-center gap-2",
                      isLoading && "opacity-80"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Create account <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-[11.5px] text-[#9CA3B0] text-center mt-3.5 leading-relaxed">
                    By creating an account you agree to our{" "}
                    <a href="/terms" className="text-[#2563EB] font-medium hover:text-[#1D4FD7] hover:underline">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-[#2563EB] font-medium hover:text-[#1D4FD7] hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Platform Showcase */}
        <div
          className="flex-1 px-10 py-11 flex flex-col justify-center relative overflow-hidden auth-right-panel"
          style={{
            background: "linear-gradient(160deg, #F8FAFF 0%, #F0F4FF 40%, #F5F0FF 100%)",
          }}
        >
          {/* Decorative shapes */}
          <div
            className="absolute -top-20 -right-20 w-[220px] h-[220px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(37,99,235,0.05), transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-[60px] -left-[60px] w-[180px] h-[180px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(124,58,237,0.04), transparent 70%)",
            }}
          />

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(37,99,235,0.06)] border border-[rgba(37,99,235,0.1)] mb-5">
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"
                style={{ boxShadow: "0 0 6px rgba(37,99,235,0.4)" }}
              />
              <span className="text-xs text-[#2563EB] font-semibold tracking-wide">
                Operational proof platform
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-[26px] font-bold text-[#111318] leading-tight tracking-tight mb-2">
              If it's not proven,
              <br />
              <span className="text-[#2563EB]">it didn't happen.</span>
            </h2>
            <p className="text-sm text-[#6C7281] leading-relaxed mb-8 max-w-[380px]">
              Every job verified. Every report audit-ready. Full operational transparency for service teams.
            </p>

            {/* Proof Chain */}
            <div className="flex flex-col gap-1.5 mb-8">
              {proofSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3.5 px-3.5 py-3 rounded-xl",
                      "bg-white/50 transition-all duration-200 cursor-default",
                      "hover:bg-white/85 hover:translate-x-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0",
                        step.color
                      )}
                    >
                      <Icon className={cn("h-5 w-5", step.iconColor)} />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-[#111318]">{step.title}</div>
                      <div className="text-[12.5px] text-[#6C7281] mt-0.5">{step.desc}</div>
                    </div>
                    {i < proofSteps.length - 1 && (
                      <div className="ml-auto text-[11px] text-[#9CA3B0] opacity-50">→</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Products */}
            <div className="pt-5 border-t border-black/[0.06] flex gap-3 items-center">
              <span className="text-xs text-[#9CA3B0] font-medium">Products:</span>
              {[
                { name: "CleanProof", color: "#2563EB", bg: "#EFF4FF" },
                { name: "MaintainProof", color: "#059669", bg: "#ECFDF5" },
              ].map((p, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: p.bg, color: p.color }}
                >
                  <div className="w-1.5 h-1.5 rounded-sm" style={{ background: p.color }} />
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-3.5 left-0 right-0 text-center text-[11.5px] text-[#9CA3B0]">
        © 2026 Proof Platform ·{" "}
        <a href="/privacy" className="text-[#6C7281] hover:underline">
          Privacy
        </a>
        {" · "}
        <a href="/terms" className="text-[#6C7281] hover:underline">
          Terms
        </a>
        {" · "}
        <a href="/refund" className="text-[#6C7281] hover:underline">
          Refund
        </a>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .auth-right-panel {
            display: none !important;
          }
          .auth-left-panel {
            max-width: 100% !important;
            flex: 1 !important;
            border-radius: 16px !important;
            border-right: none !important;
          }
        }
      `}</style>
    </div>
  );
}
