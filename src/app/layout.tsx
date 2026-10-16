import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { IntroAnimation } from "@/components/intro-animation";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playd",
  description:
    "Personal log of every movie, TV series and game watched or played.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <IntroAnimation />
        {children}
      </body>
    </html>
  );
}
