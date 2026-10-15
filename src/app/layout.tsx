import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const poppins = localFont({
  src: [
    {
      path: "../../public/fonts/poppins/poppins-latin-300.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/poppins/poppins-latin-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/poppins/poppins-latin-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/poppins/poppins-latin-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/poppins/poppins-latin-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "The Pour Over · Reader Intelligence",
  description:
    "A unified view of your readers, their journeys, and what comes next.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
