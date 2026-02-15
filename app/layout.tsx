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
              const images = Array.from(document.images);
              await Promise.all(
                images.map(img => {
                  if (img.complete) return Promise.resolve();
                  return new Promise(resolve => {
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
              return new Promise(resolve => requestAnimationFrame(resolve));
            }
            async function startApp() {
              const loading = document.getElementById("loading-screen");
              const site = document.getElementById("site-root");
              if (!loading || !site) return;
              const MIN_DURATION = 1800;
              const start = performance.now();
              await Promise.all([
                waitForFonts(),
                waitForImages(),
                waitForNextFrame()
              ]);
              const elapsed = performance.now() - start;
              if (elapsed < MIN_DURATION) {
                await new Promise(r => setTimeout(r, MIN_DURATION - elapsed));
              }
              loading.style.opacity = "0";
              setTimeout(() => {
                loading.remove();
                site.style.opacity = "1";
                site.style.transition = "opacity 1.2s cubic-bezier(.16,1,.3,1)";
              }, 900);
            }
            startApp();
          `}
        </Script>
      </body>
    </html>
  );
}
