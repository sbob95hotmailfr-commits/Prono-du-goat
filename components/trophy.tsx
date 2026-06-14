export function Trophy() {
  return (
    <>
      <style>{`
        @keyframes spin-cup {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .trophy-spin {
          animation: spin-cup 3s linear infinite;
          transform-style: preserve-3d;
        }
      `}</style>
      <img
        src="/wc2026.png"
        alt="FIFA World Cup 2026"
        className="trophy-spin drop-shadow-[0_0_40px_rgba(217,119,6,0.7)]"
        style={{ height: "160px", width: "auto", objectFit: "contain" }}
      />
    </>
  );
}
