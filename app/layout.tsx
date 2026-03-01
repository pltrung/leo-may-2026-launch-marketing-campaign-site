import type { Metadata, Viewport } from "next";
import Script from "next/script";
import LoadingScreen from "@/components/LoadingScreen";
import GlobalImgSafeguard from "@/components/GlobalImgSafeguard";
import TimeOfDayProvider from "@/components/TimeOfDayProvider";
import GlobalSkyLayer from "@/components/GlobalSkyLayer";
import ContrastOverlay from "@/components/ContrastOverlay";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Leo Mây | Climb the Clouds. Build a Culture.",
  description: "Premium climbing gym — Ho Chi Minh City. Launching soon.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /** Helps iOS Chrome/Safari with viewport resize when address bar shows/hides */
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/MiSans-Bold.ttf" as="font" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/MiSans-Regular.ttf" as="font" crossOrigin="anonymous" />
        <link rel="preload" href="/brand/ip-climbing-on-hold.svg" as="image" />
        <link rel="preload" href="/brand/ip-on-cloud.svg" as="image" />
        <link rel="preload" href="/brand/ip-city.svg" as="image" />
        <link rel="preload" href="/brand/cloud-singing.svg" as="image" />
        <link rel="preload" href="/brand/background.svg" as="image" />
        <link rel="preload" href="/brand/holds.svg" as="image" />
        <link rel="preload" href="/logo-white.svg" as="image" />
        <link rel="preload" href="/brand/cloud-copyright.svg" as="image" />
      </head>
      <body className="min-h-[100dvh] antialiased overflow-x-hidden time-night">
        <TimeOfDayProvider />
        <GlobalSkyLayer />
        <ContrastOverlay />
        <div style={{ position: "relative", zIndex: 10 }}>
          <GlobalImgSafeguard />
          <LoadingScreen />
          {children}
        </div>
        <Script id="loading-controller" strategy="afterInteractive">
          {`setTimeout(function(){var e=document.getElementById("loading-screen");e&&e.remove();document.body.classList.add("loaded");setTimeout(function(){document.body.classList.add("hero-ready");},600);},2000);`}
        </Script>
      </body>
    </html>
  );
}
