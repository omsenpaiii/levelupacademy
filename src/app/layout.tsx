import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  icons: { icon: "/images/logo.png" },
  title: {
    default: "Student portal | Level Up Academy",
    template: "%s | Level Up Academy",
  },
  description:
    "Your learning, your progress. The Level Up Academy student portal.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
