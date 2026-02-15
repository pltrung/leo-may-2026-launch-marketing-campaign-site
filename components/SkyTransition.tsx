"use client";

export default function SkyTransition() {
  return (
    <div className="sky-transition" aria-hidden>
      <div className="sky-light" aria-hidden />
      {/* Top-left cloud: left half of cloud-transition */}
      <div
        className="cloud cloud-top-left"
        style={{
          backgroundImage: "url(/brand/cloud-transition.svg)",
          backgroundSize: "200% 100%",
          backgroundPosition: "0% 50%",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden
      />
      {/* Bottom-right cloud: right half of cloud-transition */}
      <div
        className="cloud cloud-bottom-right"
        style={{
          backgroundImage: "url(/brand/cloud-transition.svg)",
          backgroundSize: "200% 100%",
          backgroundPosition: "100% 50%",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden
      />
      <div className="volumetric-mist mist-layer-1" aria-hidden />
      <div className="volumetric-mist mist-layer-2" aria-hidden />
      <div className="sky-text">THE SKY OPENS</div>
    </div>
  );
}
