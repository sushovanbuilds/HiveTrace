import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan & Verify",
  description:
    "Scan the QR code on your honey package to verify its batch, journey and laboratory evidence with HiveTrace.",
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
