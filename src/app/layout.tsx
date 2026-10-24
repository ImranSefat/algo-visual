import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { categoryById } from "@/algorithms/categories";
import { algorithmHref, algorithmList } from "@/algorithms/registry";
import { CommandPalette, type PaletteItem } from "@/components/site/command-palette";
import { Providers } from "@/components/site/providers";
import { SiteHeader } from "@/components/site/site-header";
import { themeScript } from "@/components/site/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Code and labels only: not needed for first paint, so not preloaded.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "algo·visual — see algorithms think",
    template: "%s · algo·visual",
  },
  description:
    "Interactive data-structures and algorithms visualizer: smooth animations, a scrubbable timeline, and the real source code highlighted line by line.",
};

const paletteItems: PaletteItem[] = algorithmList.map((m) => ({
  name: m.name,
  href: algorithmHref(m),
  group: categoryById[m.category].name,
  complexity: m.complexity.time.average,
}));

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          {children}
          <CommandPalette items={paletteItems} />
        </Providers>
      </body>
    </html>
  );
}
