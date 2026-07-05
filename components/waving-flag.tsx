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
    let offscreen: HTMLCanvasElement | null = null;

    function buildOffscreen() {
      offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      offscreen.getContext("2d")!.drawImage(img, 0, 0, width, height);
    }

    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const time = (timestamp - startTime) / 1000;
      ctx!.clearRect(0, 0, width, height);

      if (offscreen) {
        for (let x = 0; x < width; x++) {
          const progress = x / width;
          const amplitude = progress * progress * 12;
          const yOffset = Math.sin(progress * 3 * Math.PI - time * 2.5) * amplitude;
          ctx!.drawImage(offscreen, x, 0, 1, height, x, yOffset, 1, height);
        }
      }

      animId = requestAnimationFrame(draw);
    }

    function start() {
      buildOffscreen();
      animId = requestAnimationFrame(draw);
    }

    if (img.complete && img.naturalWidth > 0) {
      start();
    } else {
      img.onload = start;
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
