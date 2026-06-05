import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "teal" | "gold" | "purple" | null;
  dark?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = false, glow = null, dark = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        dark ? "glass-dark" : "glass",
        "rounded-2xl border border-white/[0.07]",
        hover && "transition-all duration-200 hover:border-white/[0.12] hover:-translate-y-0.5",
        onClick && "cursor-pointer",
        glow === "teal" && "teal-glow",
        glow === "gold" && "gold-glow",
        glow === "purple" && "shadow-[0_0_32px_rgba(129,140,248,0.18)]",
        className
      )}
    >
      {children}
    </div>
  );
}
