"use client";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  fallback?: string;
  className?: string;
}

export function BackButton({ fallback = "/leagues", className = "text-gray-400 hover:text-white text-sm transition-colors" }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }

  return (
    <button onClick={handleBack} className={className}>
      ←
    </button>
  );
}
