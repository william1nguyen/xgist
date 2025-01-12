import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import "./globals.css";
import Navigation from "./components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduVideo - Nền tảng chia sẻ video học tập",
  description: "Nền tảng chia sẻ video học tập hàng đầu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
        <body className={inter.className}>
          <UserProvider>
            <Navigation />
            <main className="pt-16">{children}</main>
          </UserProvider>
        </body>
    </html>
  );
}
