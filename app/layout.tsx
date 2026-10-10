import "./globals.css";
import { Sora, Public_Sans } from "next/font/google";

const display = Sora({ subsets: ["latin"], variable: "--f-display", weight: ["500", "600", "700"] });
const body = Public_Sans({ subsets: ["latin"], variable: "--f-body" });

export const metadata = {
  title: "LaunchCode Bootcamp, Winter Edition | SynthaxLab Technologies",
  description: "Register for the LaunchCode Winter Edition bootcamp, December 2026 to February 2027.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>
  );
}
