"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Triage + identification merged into the unified /identification demo page.
export default function TriagePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/identification");
  }, [router]);
  return null;
}
