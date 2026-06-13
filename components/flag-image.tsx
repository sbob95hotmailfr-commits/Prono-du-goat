import { getFlagUrl } from "@/lib/flags";

interface FlagImageProps {
  team: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FlagImage({ team, size = "md", className = "" }: FlagImageProps) {
  const url = getFlagUrl(team, size);
  const dims = { sm: "w-5 h-4", md: "w-8 h-6", lg: "w-12 h-9" };

  if (!url) {
    return (
      <div className={`${dims[size]} rounded bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 ${className}`}>
        ?
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={team}
      className={`${dims[size]} object-cover rounded shadow-sm ${className}`}
    />
  );
}
