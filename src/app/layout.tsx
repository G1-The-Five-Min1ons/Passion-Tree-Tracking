import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Passion Tree — Tracking",
  description: "Minimalist project tracking for agile teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
