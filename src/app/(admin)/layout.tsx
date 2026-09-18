import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atlas Depeche",
  description: "Moroccan agentic newsroom — Arabic (Fusha) + French",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
