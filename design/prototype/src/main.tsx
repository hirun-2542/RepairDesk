import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans-thai/thai-400.css";
import "@fontsource/ibm-plex-sans-thai/thai-500.css";
import "@fontsource/ibm-plex-sans-thai/thai-600.css";
import "@fontsource/ibm-plex-sans-thai/thai-700.css";
import "@fontsource/ibm-plex-sans-thai/latin-400.css";
import "@fontsource/ibm-plex-sans-thai/latin-500.css";
import "@fontsource/ibm-plex-sans-thai/latin-600.css";
import "@fontsource/ibm-plex-sans-thai/latin-700.css";
import "./styles/tokens.css";
import "./styles/app.css";
import App from "./App";
import { DEMO_LOGINS } from "./data/mock";
import { StoreProvider } from "./store";

const qs = new URLSearchParams(location.hash.split("?")[1] ?? "");
const initial = DEMO_LOGINS.find((d) => d.key === qs.get("as"))?.userId ?? null;
createRoot(document.getElementById("root")!).render(
  <StrictMode><StoreProvider initialUser={initial}><App dock={qs.get("nodock") !== "1"} /></StoreProvider></StrictMode>,
);
