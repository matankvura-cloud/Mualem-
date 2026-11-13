import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TestBanner } from "@/components/site/TestBanner";
import { he } from "../../messages/he";

const frank = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], weight: ["400", "500", "700"], variable: "--font-frank", display: "swap" });
const heebo = Heebo({ subsets: ["hebrew", "latin"], weight: ["300", "400", "500", "700"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${he.brand} — ${he.tagline}`, template: `%s · ${he.brand}` },
  description: "שוברים דיגיטליים והטבות שמסייעים למשפחה בתקופת האבל: ארוחות לשבעה, ציוד, עזרה בבית והנצחה.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: he.brand, statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#182a4a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${frank.variable} ${heebo.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <TestBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
