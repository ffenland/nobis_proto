import type { Metadata } from "next";
import localFont from "next/font/local";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import "./globals.css";
import SWRProvider from "./components/swrProvider";
import GlobalHeader from "./components/layout/GlobalHeader";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}
      >
        <SWRProvider>
          <div className="h-full flex flex-col max-w-5xl mx-auto px-2 md:px-6">
            <GlobalHeader />
            <main className="flex-1 mx-auto w-full overflow-auto">
              {children}
            </main>
          </div>
        </SWRProvider>
      </body>
    </html>
  );
}
