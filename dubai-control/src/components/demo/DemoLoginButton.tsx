// dubai-control/src/components/demo/DemoLoginButton.tsx
// "Try Demo" button — logs into a shared demo account

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

interface DemoLoginButtonProps {
  context?: "cleaning" | "maintenance";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function DemoLoginButton({
  context = "cleaning",
  variant = "outline",
  size = "default",
  className = "",
}: DemoLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/demo-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      if (!res.ok) {
        throw new Error("Demo unavailable");
      }

      const data = await res.json();

      // Store token + user info (same shape as normal login)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("is_demo", "true");

      // Navigate to the appropriate dashboard
      const target = context === "maintenance"
        ? "/maintenance/dashboard"
        : "/dashboard";
      navigate(target);
      // Force full reload so AppContext picks up the new token
      window.location.href = target;
    } catch {
      // Silently fail — button will just stop loading
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDemo}
      disabled={loading}
    >
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading demo...</>
      ) : (
        <><Play className="mr-2 h-4 w-4" /> Try demo</>
      )}
    </Button>
  );
}
