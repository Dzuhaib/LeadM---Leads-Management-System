import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AIVized Lead Tracker",
    template: "%s · AIVized Lead Tracker",
  },
  description:
    "Team lead tracker for LinkedIn, WhatsApp and Facebook outreach at AIVized.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#7C3AED",
    colorText: "#1B1033",
    colorTextSecondary: "#6B6480",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#1B1033",
    borderRadius: "0.7rem",
    fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
  },
  elements: {
    card: "shadow-xl border border-[#E4DCF5]",
    headerTitle: "text-[#1B1033] font-bold",
    headerSubtitle: "text-[#6B6480]",
    socialButtonsBlockButton:
      "border border-[#E4DCF5] text-[#1B1033] hover:bg-[#F4EFFE]",
    formButtonPrimary:
      "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm",
    footerActionLink: "text-[#7C3AED] hover:text-[#4C1D95]",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
