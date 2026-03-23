import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";
import GlobalErrorHandlers from "@/components/GlobalErrorHandlers";
import GlobalImgSafeguard from "@/components/GlobalImgSafeguard";
import LandingGate from "@/components/LandingGate";
import MetaPixelRouteTracker from "@/components/MetaPixelRouteTracker";
import { AuthProvider } from "@/context/AuthContext";
import AttributionCapture from "@/components/AttributionCapture";
import { InAppBrowserProvider } from "@/context/InAppBrowserContext";
import { META_PIXEL_ID } from "@/lib/metaPixel";
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
  const pixelIdJs = JSON.stringify(META_PIXEL_ID);

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
        {/* Explore page clouds: preload so they appear fast on mobile. */}
        <link rel="preload" href="/brand/cloud-eyes-left.svg" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/brand/cloud-eyes-right.svg" as="fetch" crossOrigin="anonymous" />
        {/* Hero 3D models: start fetching early so they’re cached by the time user clicks Explore (files are large; internet speed affects load). */}
        <link rel="preload" href="/glb-rotating-bouldering-island.glb" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/glb-leo-climbing-hold.glb" as="fetch" crossOrigin="anonymous" />
        {/* Ambient music (prelaunch / countdown / gym): preload after first interaction. */}
        <link rel="preload" href="/audio/beta-drift-demo-v1.mp3" as="fetch" crossOrigin="anonymous" />
        <Script
          id="meta-pixel-bootstrap"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${pixelIdJs});
fbq('track', 'PageView');
`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] antialiased overflow-x-hidden">
        <noscript>
          <img
            height={1}
            width={1}
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <GlobalErrorHandlers />
        <GlobalErrorBoundary>
          <MetaPixelRouteTracker />
          <GlobalImgSafeguard />
          <AuthProvider>
            <AttributionCapture />
            <InAppBrowserProvider>
              <LandingGate>{children}</LandingGate>
            </InAppBrowserProvider>
          </AuthProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
