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

    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const time = (timestamp - startTime) / 1000;

      ctx!.clearRect(0, 0, width, height);

      if (img.complete && img.naturalWidth > 0) {
        for (let x = 0; x < width; x++) {
          const progress = x / width;
          const amplitude = progress * progress * 10;
          const yOffset = Math.sin(progress * 3 * Math.PI - time * 2.5) * amplitude;

          ctx!.drawImage(
            img,
            (x / width) * img.naturalWidth, 0,
            img.naturalWidth / width, img.naturalHeight,
            x, yOffset,
            1, height
          );
        }
      }

      animId = requestAnimationFrame(draw);
    }

    if (img.complete && img.naturalWidth > 0) {
      animId = requestAnimationFrame(draw);
    } else {
      img.onload = () => { animId = requestAnimationFrame(draw); };
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
