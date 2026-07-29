import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baboons Planning — Manage Projects, Tasks & Teams",
  description:
    "Plan projects, manage tasks, assign team members and keep every client and deadline organized in one clear workspace.",
  icons: { icon: "/faviconbaboons.png", apple: "/faviconbaboons.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jakarta.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
          <Toaster position="bottom-left" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
