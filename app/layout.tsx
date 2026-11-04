import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { clerkAppearance } from "@/lib/clerk-appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AIVized Lead Tracker",
    template: "%s · AIVized Lead Tracker",
  },
  description:
    "Team lead tracker for LinkedIn, WhatsApp and Facebook outreach at AIVized.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const themeCookie = (await cookies()).get("theme")?.value;
  const themeClass =
    themeCookie === "dark" ? " dark" : themeCookie === "light" ? " light" : "";

  const content = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster richColors position="top-right" closeButton />
    </ThemeProvider>
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`h-full${themeClass}`}
    >
      <body className="min-h-full bg-background antialiased">
        {publishableKey ? (
          <ClerkProvider
            publishableKey={publishableKey}
            appearance={clerkAppearance}
          >
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
