// dubai-control/src/components/maintenance/UpgradeDialog.tsx
/**
 * UpgradeDialog — shown when a maintenance write action is blocked
 * because the company's trial has expired or plan is suspended.
 *
 * Owner: sees Paddle checkout buttons (Standard / Pro)
 * Non-owner: sees message + link to /settings/billing
 */

import { Loader2, Zap, CreditCard, Clock, ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePaddle } from "@/hooks/usePaddle";
import { useUserRole, canModifyBilling } from "@/hooks/useUserRole";

const PRICE_ID_STANDARD = import.meta.env.VITE_PADDLE_PRICE_ID_STANDARD as string;
const PRICE_ID_PRO = import.meta.env.VITE_PADDLE_PRICE_ID_PRO as string;

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  reason: "trial_expired" | "company_blocked";
}

export function UpgradeDialog({ open, onClose, reason }: UpgradeDialogProps) {
  const user = useUserRole();
  const isOwner = canModifyBilling(user.role);
  const { openCheckout, isReady: paddleReady } = usePaddle();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const isTrialExpired = reason === "trial_expired";

  const handleUpgrade = (priceId: string) => {
    if (!paddleReady || !user.companyId) return;
    setCheckoutLoading(priceId);
    try {
      openCheckout(priceId, user.companyId);
      onClose();
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isTrialExpired ? "bg-amber-100" : "bg-red-100"
            }`}>
              {isTrialExpired
                ? <Clock className="h-5 w-5 text-amber-600" />
                : <ShieldOff className="h-5 w-5 text-red-600" />
              }
            </div>
            <DialogTitle>
              {isTrialExpired ? "Trial ended" : "Account suspended"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isTrialExpired
              ? "Your free trial has ended. You can still view existing records, but creating or editing requires an active subscription."
              : "Your account is currently suspended. Please upgrade your subscription to restore full access."}
          </DialogDescription>
        </DialogHeader>

        {isOwner ? (
          <>
            <div className="py-2">
              <p className="text-sm text-muted-foreground mb-4">
                Choose a plan to continue with full access:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Standard plan card */}
                {PRICE_ID_STANDARD && (
                  <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Standard</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to 5 team members</p>
                    <Button
                      size="sm"
                      className="w-full mt-1 bg-accent-primary text-white hover:bg-accent-primary/90"
                      disabled={checkoutLoading === PRICE_ID_STANDARD || !paddleReady}
                      onClick={() => handleUpgrade(PRICE_ID_STANDARD)}
                    >
                      {checkoutLoading === PRICE_ID_STANDARD
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Zap className="h-3 w-3 mr-1" />Upgrade</>
                      }
                    </Button>
                  </div>
                )}

                {/* Pro plan card */}
                {PRICE_ID_PRO && (
                  <div className="rounded-lg border-2 border-accent-primary p-4 flex flex-col gap-2 relative">
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Popular
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-accent-primary" />
                      <span className="text-sm font-medium">Pro</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Unlimited team members</p>
                    <Button
                      size="sm"
                      className="w-full mt-1 bg-accent-primary text-white hover:bg-accent-primary/90"
                      disabled={checkoutLoading === PRICE_ID_PRO || !paddleReady}
                      onClick={() => handleUpgrade(PRICE_ID_PRO)}
                    >
                      {checkoutLoading === PRICE_ID_PRO
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Zap className="h-3 w-3 mr-1" />Upgrade</>
                      }
                    </Button>
                  </div>
                )}

                {/* Fallback if no price IDs configured */}
                {!PRICE_ID_STANDARD && !PRICE_ID_PRO && (
                  <div className="col-span-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/settings/billing" onClick={onClose}>
                        Go to Billing
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Maybe later
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/billing" onClick={onClose}>
                  View plans
                </Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Non-owner: direct to billing page */
          <>
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                Only the account owner can manage the subscription. Ask your owner to upgrade
                from the{" "}
                <Link
                  to="/settings/billing"
                  className="text-accent-primary underline underline-offset-2"
                  onClick={onClose}
                >
                  Billing page
                </Link>
                .
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/billing" onClick={onClose}>
                  View billing
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeDialog;
