// dubai-control/src/hooks/usePaddle.ts
/**
 * usePaddle — lazy Paddle.js initialization hook.
 *
 * Paddle.js is initialized once (module-level singleton) to avoid reinit
 * on re-renders. `openCheckout` embeds `company_id` in `custom_data` so
 * the backend webhook handler can link the new subscription to the company.
 *
 * Usage:
 *   const { openCheckout, isReady, error } = usePaddle();
 *   <button onClick={() => openCheckout(priceId, companyId)}>Upgrade</button>
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

// Module-level singleton — survives component remounts
let _paddleInstance: Paddle | null = null;
let _initPromise: Promise<Paddle | null> | null = null;

async function getPaddleInstance(): Promise<Paddle | null> {
  if (_paddleInstance) return _paddleInstance;
  if (_initPromise) return _initPromise;

  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string;
  const environment = (import.meta.env.VITE_PADDLE_ENVIRONMENT as "sandbox" | "production") || "sandbox";

  if (!token || token.startsWith("test_placeholder")) {
    console.warn("[usePaddle] VITE_PADDLE_CLIENT_TOKEN not configured — checkout unavailable");
    return null;
  }

  _initPromise = initializePaddle({ environment, token })
    .then((paddle) => {
      _paddleInstance = paddle ?? null;
      return _paddleInstance;
    })
    .catch((err) => {
      console.error("[usePaddle] Initialization failed:", err);
      _initPromise = null;
      return null;
    });

  return _initPromise;
}

interface UsePaddleReturn {
  openCheckout: (priceId: string, companyId: number | string) => void;
  isReady: boolean;
  error: string | null;
}

export function usePaddle(): UsePaddleReturn {
  const [isReady, setIsReady] = useState(!!_paddleInstance);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (_paddleInstance) {
      setIsReady(true);
      return;
    }

    getPaddleInstance().then((paddle) => {
      if (!mountedRef.current) return;
      if (paddle) {
        setIsReady(true);
      } else {
        setError("Paddle checkout is not available. Please contact support.");
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openCheckout = useCallback((priceId: string, companyId: number | string) => {
    if (!_paddleInstance) {
      console.error("[usePaddle] openCheckout called before Paddle is ready");
      return;
    }

    const successUrl = `${window.location.origin}/settings/billing?checkout=success`;

    _paddleInstance.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { company_id: String(companyId) },
      settings: {
        successUrl,
        displayModeTheme: "light",
      },
    });
  }, []);

  return { openCheckout, isReady, error };
}
