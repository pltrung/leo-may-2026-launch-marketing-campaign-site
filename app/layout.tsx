import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Leo Mây | Climb the Clouds. Build a Culture.",
  description: "Premium climbing gym — Ho Chi Minh City. Launching soon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/MiSans-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/MiSans-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/brand/ip-climbing-on-hold.svg" as="image" />
        <link rel="preload" href="/brand/ip-on-cloud.svg" as="image" />
        <link rel="preload" href="/brand/ip-city.svg" as="image" />
        <link rel="preload" href="/brand/cloud-singing.svg" as="image" />
        <link rel="preload" href="/logo-white.svg" as="image" />
        <link rel="preload" href="/brand/cloud-copyright.svg" as="image" />
        <link rel="preload" href="/brand/big-cloud-transition.svg" as="image" />
      </head>
      <body className="min-h-screen antialiased overflow-x-hidden">
        <div id="loading-screen">
          <div className="loading-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.svg" className="loading-logo" alt="" />
            <div className="loading-cloud">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/cloud-copyright.svg" alt="" />
            </div>
            <div className="loading-text">Preparing the sky</div>
          </div>
        </div>
        <div id="site-root" style={{ opacity: 0 }}>
          {children}
        </div>
        <Script id="load-controller" strategy="afterInteractive">
          {`
            async function waitForImages() {
              var images = Array.from(document.images);
              await Promise.all(
                images.map(function(img) {
                  if (img.complete) return Promise.resolve();
                  return new Promise(function(resolve) {
                    img.onload = img.onerror = resolve;
                  });
                })
              );
            }
            async function waitForFonts() {
              if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
              }
            }
            async function waitForNextFrame() {
              return new Promise(function(resolve) { requestAnimationFrame(resolve); });
            }
            async function startApp() {
              var loading = document.getElementById("loading-screen");
              var site = document.getElementById("site-root");
              if (!loading || !site) return;
              var MIN_DURATION = 1800;
              var start = performance.now();
              await Promise.all([
                waitForFonts(),
                waitForImages(),
                waitForNextFrame()
              ]);
              var elapsed = performance.now() - start;
              if (elapsed < MIN_DURATION) {
                await new Promise(function(r) { setTimeout(r, MIN_DURATION - elapsed); });
              }
              loading.classList.add("fade-out");
              setTimeout(function() {
                loading.remove();
                site.style.opacity = "1";
                site.style.transition = "opacity 1.2s cubic-bezier(.16,1,.3,1)";
                document.documentElement.dataset.leomayLoadComplete = "1";
                document.dispatchEvent(new CustomEvent("leomay-load-complete"));
                var logo = document.querySelector(".hero-logo");
                var title = document.querySelector(".hero-title");
                var btn = document.querySelector(".know-cloud-btn");
                var scrollEl = document.querySelector(".hero-scroll");
                setTimeout(function(){ if(logo) logo.classList.add("animate"); }, 200);
                setTimeout(function(){ if(title) title.classList.add("animate"); }, 400);
                setTimeout(function(){ if(btn) btn.classList.add("animate"); }, 600);
                setTimeout(function(){ if(scrollEl) scrollEl.classList.add("animate"); }, 800);
              }, 800);
            }
            startApp();
          `}
        </Script>
      </body>
    </html>
  );
}
