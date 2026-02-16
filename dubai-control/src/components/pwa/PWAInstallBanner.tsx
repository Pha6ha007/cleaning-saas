// src/components/pwa/PWAInstallBanner.tsx
// PWA install prompt banner for Stage 12

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallBanner() {
  const { isInstallable, install, dismiss } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[hsl(188,45%,24%)] text-white shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm">Install MaintainProof</p>
            <p className="text-xs text-white/70 truncate">Add to home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={dismiss}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 bg-white text-[hsl(188,45%,24%)] hover:bg-white/90 rounded-[6px]"
            onClick={install}
          >
            Install
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallBanner;
