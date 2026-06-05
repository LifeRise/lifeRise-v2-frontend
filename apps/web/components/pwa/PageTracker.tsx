"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageVisit } from "@/lib/pwa";

export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      trackPageVisit(pathname);
    }
  }, [pathname]);

  return null;
}
