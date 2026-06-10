"use client";

export function CopyCode({ code }: { code: string }) {
  function handleCopy() {
    navigator.clipboard.writeText(code);
  }

  return (
    <button
      onClick={handleCopy}
      className="font-mono font-bold text-primary hover:underline cursor-pointer"
      title="Cliquer pour copier"
    >
      {code} 📋
    </button>
  );
}
