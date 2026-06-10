import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export function Button({ variant = "primary", loading, className, children, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary hover:bg-primary-dark text-white px-6 py-3",
    secondary: "bg-transparent border border-primary text-primary hover:bg-primary hover:text-white px-6 py-3",
    danger: "bg-danger hover:bg-red-700 text-white px-6 py-3",
  };

  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="animate-pulse">Chargement…</span> : children}
    </button>
  );
}
