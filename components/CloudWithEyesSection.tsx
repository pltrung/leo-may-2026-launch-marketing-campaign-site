"use client";

export default function CloudWithEyesSection() {
  return (
    <section className="hero-section hero-section-scroll hero-cloud-section relative overflow-hidden px-6">
      <div className="hero-text cloud-eyes-text max-w-2xl">
        <p className="cloud-eyes-line-1 font-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-headline leading-tight">
          Every cloud moves <span className="emphasis-blue">DIFFERENTLY</span>.
        </p>
        <p className="cloud-eyes-line-2 font-headline text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white/85 tracking-headline leading-tight mt-3">
          So should <span className="emphasis-blue">YOU</span>.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/cloud-singing.svg"
        alt="Singing Cloud"
        className="hero-ip w-[70%] max-w-[400px] h-auto object-contain"
        loading="eager"
        fetchPriority="high"
      />
    </section>
  );
}
