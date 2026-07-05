"use client";

interface WavingFlagProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function WavingFlag({ src, alt, width = 130, height = 88 }: WavingFlagProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="flag-wave"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        objectFit: "cover",
        display: "block",
        borderRadius: 6,
        flexShrink: 0,
      }}
    />
  );
}
