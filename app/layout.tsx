import type { Metadata } from "next";
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
        <link rel="preload" href="/brand/cloud-with-eyes.svg" as="image" />
        <link rel="preload" href="/leo-may-ip.png" as="image" />
      </head>
      <body className="min-h-screen antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
