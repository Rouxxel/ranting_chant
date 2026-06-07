import { cn } from "@/lib/utils";
import "@/public/frut_logo.jpeg";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" } as const;
  return (
    <div className={cn(
      "flex items-center gap-2 font-semibold tracking-tight text-ranting-ice text-glow-sky",
      sizes[size],
      className
    )}>
      <img
        src="/src/public/frut_logo.jpeg"
        alt="Ranting Chant Logo"
        className="h-8 w-8"
      />
      <span>
        Ranting<span className="text-ranting-sky"> · </span>Chant
      </span>
    </div>
  );
}
