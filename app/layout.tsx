import type { Metadata } from "next";
import localFont from "next/font/local";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    template: "%s | NobisGym",
    default: "",
  },
  description: "강릉 노비스짐",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased max-w-screen-md mx-auto h-screen flex p-3`}
      >
        {children}
      </body>
    </html>
  );
}
