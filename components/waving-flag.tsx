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

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    let animId: number;
    let startTime: number | null = null;

    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const time = (timestamp - startTime) / 1000;

      ctx!.clearRect(0, 0, width, height);

      if (img.complete && img.naturalWidth > 0) {
        // Dessin colonne par colonne — ondulation sinusoïdale
        for (let x = 0; x < width; x++) {
          const progress = x / width;
          // Amplitude croît vers le bord libre (loin du mât)
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

    if (img.complete) {
      animId = requestAnimationFrame(draw);
    } else {
      img.onload = () => { animId = requestAnimationFrame(draw); };
    }

    return () => cancelAnimationFrame(animId);
  }, [src, width, height]);

  return (
    <div style={{ display: "flex", alignItems: "stretch" }}>
      {/* Mât */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Boule dorée */}
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a017", flexShrink: 0 }} />
        <div style={{
          width: 4,
          height: height + 12,
          background: "linear-gradient(to right, #d4a017, #8a6510, #d4a017)",
          borderRadius: 2,
          flexShrink: 0,
        }} />
      </div>
      {/* Canvas drapeau */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-label={alt}
        style={{ borderRadius: "0 6px 6px 0", display: "block" }}
      />
    </div>
  );
}
