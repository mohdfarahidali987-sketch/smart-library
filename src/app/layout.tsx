import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Library - Live Seat Availability & Check-in",
  description: "Check live desk availability and check in via desk QR code.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
