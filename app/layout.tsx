import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "马泽闰 Mark",
  description: "人不能活一辈子。最后只有两个字——严父，或者慈母。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
