import { cn } from "@/lib/utils";

export function Avatar({ name, size = 36, glow = true }: { name: string; size?: number; glow?: boolean }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-ranting-ice select-none",
        glow && "ring-2 ring-ranting-sky/60"
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: "linear-gradient(180deg, rgba(126,200,227,0.45), rgba(45,106,159,0.55))",
        boxShadow: glow ? "0 0 14px rgba(126,200,227,0.5), inset 0 1px 0 rgba(255,255,255,0.3)" : "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      {initials}
    </div>
  );
}
