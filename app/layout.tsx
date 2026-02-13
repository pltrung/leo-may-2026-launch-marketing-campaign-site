import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";

const leoFont = localFont({
  src: [
    { path: "../public/fonts/MiSans-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/MiSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/MiSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/MiSans-Demibold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/MiSans-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-leo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Leo Mây | Climb the Clouds. Build a Culture.",
  description:
    "Leo Mây Climbing Gym — Ho Chi Minh City. Launching 2026. Mist minimalism meets electric sky.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={leoFont.variable}>
      <body className="min-h-screen bg-[#f8f9fb] antialiased">{children}</body>
    </html>
  );
}
