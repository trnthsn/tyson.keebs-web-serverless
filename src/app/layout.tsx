import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import I18nProvider from "@/components/I18nProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "TysonKeebs - VIA Config & Resources",
  description: "VIA keyboard configurator and firmware resources for TysonKeebs PCBs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Questrial&family=Open+Sans:ital,wght@1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function() {
            var theme = localStorage.getItem('tysonkeebs-theme');
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            }
          })();`}
        </Script>
        <ThemeProvider>
          <I18nProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
