import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Together Wellness · Studio OS",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
