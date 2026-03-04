import type { Metadata, Viewport } from "next";
import Script from "next/script";
import LoadingScreen from "@/components/LoadingScreen";
import GlobalImgSafeguard from "@/components/GlobalImgSafeguard";
import LandingGate from "@/components/LandingGate";
import { InAppBrowserProvider } from "@/context/InAppBrowserContext";
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
        {/* Hero 3D models: start fetching early so they’re cached by the time user clicks Explore (files are large; internet speed affects load). */}
        <link rel="preload" href="/glb-rotating-bouldering-island.glb" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/glb-leo-climbing-hold.glb" as="fetch" crossOrigin="anonymous" />
        {/* Hero music: preload so it starts with hero elements when user taps Explore. */}
        <link rel="preload" href="/As%20We%20Are.mp3" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="min-h-[100dvh] antialiased overflow-x-hidden">
        <GlobalImgSafeguard />
        <InAppBrowserProvider>
          <LandingGate>{children}</LandingGate>
        </InAppBrowserProvider>
      </body>
    </html>
  );
}
