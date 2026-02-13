import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Leo Mây | Climb the Clouds. Build a Culture.",
  description:
    "Leo Mây Climbing Gym — Ho Chi Minh City. Launching 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
