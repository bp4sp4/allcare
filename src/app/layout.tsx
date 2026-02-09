import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../../styles/base.css"  
import "../../styles/components.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "한평생 올케어",
  description: "한평생 올케어 - 한평생 올케어로 실습 설계부터 관리까지 한 번에!",
  openGraph: {
    title: '한평생 올케어',
    description: '한평생 올케어 - 한평생 올케어로 실습 설계부터 관리까지 한 번에!',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        alt: '한평생 올케어',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '한평생 올케어',
    description: '한평생 올케어 - 한평생 올케어로 실습 설계부터 관리까지 한 번에!',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif" }}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
