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
        <link rel="preload" href="/brand/background.svg" as="image" />
        <link rel="preload" href="/brand/holds.svg" as="image" />
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
        <div id="site-root">{children}</div>
        <Script id="load-controller" strategy="afterInteractive">
          {`setTimeout(function(){var e=document.getElementById("loading-screen");e&&e.remove();},2000);`}
        </Script>
      </body>
    </html>
  );
}
