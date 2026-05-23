import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" } as const;
  return (
    <div className={cn("font-semibold tracking-tight text-ranting-ice text-glow-sky", sizes[size], className)}>
      Ranting<span className="text-ranting-sky">·</span>Chant
    </div>
  );
}
