import type { Metadata } from "next";
import Script from "next/script";
import LoadingScreen from "@/components/LoadingScreen";
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
      <body className="min-h-screen antialiased overflow-x-hidden">
        <LoadingScreen />
        {children}
        <Script id="loading-controller" strategy="afterInteractive">
          {`setTimeout(function(){var e=document.getElementById("loading-screen");e&&e.remove();document.body.classList.add("loaded");setTimeout(function(){document.body.classList.add("hero-ready");},600);},2000);`}
        </Script>
      </body>
    </html>
  );
}
