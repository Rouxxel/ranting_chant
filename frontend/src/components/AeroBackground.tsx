// Frutiger Aero background: sky + grass wallpaper, soft white clouds,
// floating glossy bubbles, and a warm sunlight halo.
export function AeroBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base photo: sky / clouds / city / grass */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/aero_wallpaper.jpg')" }}
        //style={{ backgroundImage: "url('/aero_wallpaper_2.jpg')" }}
        //style={{ backgroundImage: "url('/asadal_stock_33.jpg')" }}
      />
      {/* Soft sky tint to unify with palette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(126,200,227,0.18) 0%, rgba(255,255,255,0.05) 45%, rgba(140,210,140,0.12) 100%)",
        }}
      />
      {/* Sun halo */}
      <div
        className="absolute -top-24 right-10 h-[420px] w-[420px] rounded-full blur-3xl opacity-70"
        style={{ background: "radial-gradient(circle, rgba(255,255,230,0.85), rgba(255,255,200,0) 70%)" }}
      />
      {/* Bokeh blobs */}
      <div
        className="absolute top-1/4 -left-32 h-[460px] w-[460px] rounded-full blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, rgba(180,230,255,0.7), transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, rgba(170,230,180,0.65), transparent 70%)" }}
      />

      {/* Floating glossy bubbles */}
      <Bubble size={140} top="12%" left="22%" delay="0s" />
      <Bubble size={90} top="60%" left="8%" delay="2s" />
      <Bubble size={180} top="30%" left="72%" delay="4s" />
      <Bubble size={60} top="78%" left="55%" delay="1s" />
      <Bubble size={110} top="8%" left="86%" delay="3s" />
      <Bubble size={70} top="48%" left="40%" delay="5s" />
    </div>
  );
}

function Bubble({ size, top, left, delay }: { size: number; top: string; left: string; delay: string }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none aero-bubble"
      style={{
        width: size,
        height: size,
        top,
        left,
        animationDelay: delay,
        background:
          "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 18%, rgba(170,220,255,0.18) 45%, rgba(120,180,230,0.10) 70%, rgba(80,140,200,0.05) 100%)",
        boxShadow:
          "inset 0 0 24px rgba(255,255,255,0.55), inset 6px -6px 28px rgba(120,180,230,0.35), 0 8px 28px rgba(60,120,180,0.25)",
        border: "1px solid rgba(255,255,255,0.45)",
        backdropFilter: "blur(2px)",
      }}
    >
      {/* Specular highlight */}
      <div
        className="absolute rounded-full"
        style={{
          top: "12%",
          left: "18%",
          width: "32%",
          height: "22%",
          background: "radial-gradient(ellipse, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}
