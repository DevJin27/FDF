import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "FDF",
  description: "FDF auth and user foundation",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background:
            "radial-gradient(circle at top, #eef6ff 0%, #f8fafc 45%, #ffffff 100%)",
          color: "#0f172a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
