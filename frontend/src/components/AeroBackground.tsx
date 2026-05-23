export function AeroBackground() {
  return (
    <div className="aero-bg fixed inset-0 -z-10 overflow-hidden">
      {/* Bokeh blobs */}
      <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(126,200,227,0.45), transparent 70%)" }} />
      <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(45,106,159,0.55), transparent 70%)" }} />
      <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(200,230,245,0.4), transparent 70%)" }} />
    </div>
  );
}
