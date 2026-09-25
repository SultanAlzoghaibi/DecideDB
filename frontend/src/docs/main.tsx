import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DocsPage } from "./DocsPage";
import "../styles/tokens.css";
import "../styles/app.css";
import "../styles/docs.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocsPage />
  </StrictMode>,
);
