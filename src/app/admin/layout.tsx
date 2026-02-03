import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AllCare Admin",
  description: "AllCare Admin Dashboard",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
