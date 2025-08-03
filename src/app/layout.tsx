// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MochaFolk",
  description: "Digital Coffee Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Poppins:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          // --- PERUBAHAN DI SINI ---
          defaultTheme="dark" // 1. Atur tema default menjadi gelap
          // enableSystem // 2. Hapus atau beri komentar pada baris ini
          // --------------------------
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
