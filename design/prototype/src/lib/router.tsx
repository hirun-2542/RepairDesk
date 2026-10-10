import { useEffect, useState, type AnchorHTMLAttributes } from "react";

export interface Route { path: string; query: URLSearchParams }
const parse = (): Route => {
  const raw = window.location.hash.replace(/^#/, "") || "/login";
  const [path, qs = ""] = raw.split("?");
  return { path, query: new URLSearchParams(qs) };
};
export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => setR(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}
export const go = (to: string) => { window.location.hash = to; };
export function Link({ to, ...p }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...p} />;
}
