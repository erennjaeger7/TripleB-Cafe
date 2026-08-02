import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bento Café & Atelier",
  description: "Artisanal Coffee & Premium Pastries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
