"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function ConfettiClient() {
  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#16A34A", "#D97706", "#FEF3C7", "#FFFFFF"],
    });
  }, []);

  return null;
}
