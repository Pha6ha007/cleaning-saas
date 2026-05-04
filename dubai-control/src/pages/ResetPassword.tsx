// dubai-control/src/pages/ResetPassword.tsx
// Password reset page — handles /reset-password?token=<uuid>
// Also serves as "forgot password" form when no token is present

import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "@/lib/env";

type Mode = "request" | "requesting" | "requested" | "reset" | "resetting" | "done" | "error";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [mode, setMode] = useState<Mode>(token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Request password reset email
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setMode("requesting");
    setError("");

    try {
      await fetch(`${API_BASE_URL}/api/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setMode("requested");
    } catch {
      setMode("requested"); // Still show success to prevent enumeration
    }
  };

  // Confirm password reset with token
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("auth.errors.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.errors.passwordMismatch"));
      return;
    }

    setMode("resetting");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setMode("done");
      } else {
        setError(data.message || t("common.unknownError"));
        setMode("reset");
      }
    } catch {
      setError(t("common.unknownError"));
      setMode("reset");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Request form — no token */}
        {(mode === "request" || mode === "requesting") && (
          <div className="text-center space-y-6">
            <div className="mx-auto rounded-full bg-muted p-4 w-fit">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("auth.resetPassword.forgotTitle")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("auth.resetPassword.forgotDescription")}
              </p>
            </div>
            <form onSubmit={handleRequest} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" className="w-full" disabled={mode === "requesting"}>
                {mode === "requesting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("auth.resetPassword.sending")}</>
                ) : (
                  t("auth.resetPassword.sendLink")
                )}
              </Button>
            </form>
            <Link to="/login" className="text-sm text-muted-foreground hover:underline block">
              ← {t("auth.verification.backToSignIn")}
            </Link>
          </div>
        )}

        {/* Email sent confirmation */}
        {mode === "requested" && (
          <div className="text-center space-y-6">
            <div className="mx-auto rounded-full bg-green-100 dark:bg-green-900/30 p-4 w-fit">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("auth.resetPassword.checkEmail")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("auth.resetPassword.checkEmailDescription", { email })}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{t("auth.resetPassword.linkExpires")}</p>
            <Link to="/login" className="text-sm text-muted-foreground hover:underline block">
              ← {t("auth.verification.backToSignIn")}
            </Link>
          </div>
        )}

        {/* Reset form — has token */}
        {(mode === "reset" || mode === "resetting") && (
          <div className="text-center space-y-6">
            <div className="mx-auto rounded-full bg-muted p-4 w-fit">
              <KeyRound className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("auth.resetPassword.setNewTitle")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("auth.resetPassword.setNewDescription")}
              </p>
            </div>
            {error && (
              <div className="px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
            <form onSubmit={handleReset} className="space-y-4 text-left">
              <div>
                <label htmlFor="new-password" className="text-sm font-medium block mb-1.5">{t("auth.resetPassword.newPassword")}</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordMinLength")}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium block mb-1.5">{t("auth.resetPassword.confirmPassword")}</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("auth.resetPassword.confirmPassword")}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button type="submit" className="w-full" disabled={mode === "resetting"}>
                {mode === "resetting" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("auth.resetPassword.resetting")}</>
                ) : (
                  t("auth.resetPassword.resetButton")
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Success */}
        {mode === "done" && (
          <div className="text-center space-y-6">
            <div className="mx-auto rounded-full bg-green-100 dark:bg-green-900/30 p-4 w-fit">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t("auth.resetPassword.successTitle")}</h1>
              <p className="text-muted-foreground mt-2">
                {t("auth.resetPassword.successDescription")}
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">{t("auth.signIn")}</Link>
            </Button>
          </div>
        )}

        {/* Error */}
        {mode === "error" && (
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">{t("common.error")}</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">{t("auth.verification.backToSignIn")}</Link>
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
