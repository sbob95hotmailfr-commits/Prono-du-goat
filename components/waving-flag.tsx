"use client";
import { useEffect, useRef } from "react";

interface WavingFlagProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function WavingFlag({ src, alt, width = 130, height = 88 }: WavingFlagProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image(width, height);
    img.crossOrigin = "anonymous";
    img.src = src;

    let animId: number;
    let startTime: number | null = null;

    function startAnim(source: HTMLCanvasElement | HTMLImageElement) {
      function draw(timestamp: number) {
        if (!startTime) startTime = timestamp;
        const time = (timestamp - startTime) / 1000;

        ctx!.clearRect(0, 0, width, height);

        for (let x = 0; x < width; x++) {
          const progress = x / width;
          const amplitude = progress * progress * 10;
          const yOffset = Math.sin(progress * 3 * Math.PI - time * 2.5) * amplitude;

          ctx!.drawImage(source, x, 0, 1, height, x, yOffset, 1, height);
        }

        animId = requestAnimationFrame(draw);
      }
      animId = requestAnimationFrame(draw);
    }

    function onLoad() {
      // Pré-scale dans un canvas offscreen à taille exacte → taille identique pour tous les drapeaux
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d")!;
      offCtx.drawImage(img, 0, 0, width, height);
      startAnim(off);
    }

    if (img.complete && img.naturalWidth > 0) {
      onLoad();
    } else {
      img.onload = onLoad;
    }

    return () => cancelAnimationFrame(animId);
  }, [src, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      aria-label={alt}
      style={{ borderRadius: 6, display: "block" }}
    />
  );
}
