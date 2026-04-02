import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsApp Contact Page",
  description:
    "Collect contact details and send an instant WhatsApp confirmation from your authenticated account.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
