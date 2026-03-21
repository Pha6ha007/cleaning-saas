// dubai-control/src/pages/VerifyEmail.tsx
// Email verification page — handles /verify-email?token=<uuid>
// Called when user clicks the verification link from their email

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

type VerifyState = "loading" | "success" | "error" | "expired" | "missing";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>(token ? "loading" : "missing");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("missing");
      setMessage("No verification token found. Please check your email for the verification link.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/verify-email/?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();

        if (res.ok) {
          setState("success");
          setMessage(data.message || "Email verified successfully! Your trial has started.");
        } else if (data.code === "TOKEN_EXPIRED") {
          setState("expired");
          setMessage("This verification link has expired. Please request a new one.");
          if (data.email) setResendEmail(data.email);
        } else {
          setState("error");
          setMessage(data.message || "Invalid verification token.");
        }
      } catch {
        setState("error");
        setMessage("Could not connect to the server. Please try again.");
      }
    };

    verify();
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      if (res.ok) {
        setResendDone(true);
      }
    } catch {
      // silently fail
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          {state === "loading" && (
            <div className="rounded-full bg-muted p-4">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          )}
          {state === "success" && (
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          )}
          {(state === "error" || state === "missing") && (
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          )}
          {state === "expired" && (
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4">
              <Mail className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight">
          {state === "loading" && "Verifying your email..."}
          {state === "success" && "Email verified!"}
          {state === "error" && "Verification failed"}
          {state === "expired" && "Link expired"}
          {state === "missing" && "Missing token"}
        </h1>

        {/* Message */}
        <p className="text-muted-foreground">{message}</p>

        {/* Actions */}
        <div className="space-y-3">
          {state === "success" && (
            <Button asChild className="w-full">
              <Link to="/login">Sign in to your account</Link>
            </Button>
          )}

          {state === "expired" && resendEmail && !resendDone && (
            <Button onClick={handleResend} disabled={resending} className="w-full">
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend verification email"
              )}
            </Button>
          )}

          {state === "expired" && resendDone && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Verification email sent! Check your inbox.
            </p>
          )}

          {(state === "error" || state === "missing" || state === "expired") && (
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
