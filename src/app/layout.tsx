import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pi Package Index — unofficial community index",
  description:
    "Unofficial community index of Pi coding-agent packages, ranked by downloads + GitHub stars + maintenance. Not affiliated with earendil-works.",
  metadataBase: new URL("https://pi-package.rectorspace.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}