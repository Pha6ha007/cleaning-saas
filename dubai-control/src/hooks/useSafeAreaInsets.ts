// dubai-control/src/hooks/useSafeAreaInsets.ts
// Returns CSS env() safe area insets for notched devices (iPhone X+)
// Use to add padding that avoids the notch and home indicator

import { useState, useEffect } from "react";

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const update = () => {
      const style = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(style.getPropertyValue("--sat") || "0", 10),
        right: parseInt(style.getPropertyValue("--sar") || "0", 10),
        bottom: parseInt(style.getPropertyValue("--sab") || "0", 10),
        left: parseInt(style.getPropertyValue("--sal") || "0", 10),
      });
    };

    // Set CSS custom properties from env() values
    const css = `
      :root {
        --sat: env(safe-area-inset-top, 0px);
        --sar: env(safe-area-inset-right, 0px);
        --sab: env(safe-area-inset-bottom, 0px);
        --sal: env(safe-area-inset-left, 0px);
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    update();
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      document.head.removeChild(style);
    };
  }, []);

  return insets;
}
