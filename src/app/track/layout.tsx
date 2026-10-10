import type { Metadata } from "next";

/** The tracking link is a bearer credential — never let search engines index any of it. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
