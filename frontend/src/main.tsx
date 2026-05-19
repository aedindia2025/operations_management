import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installTenantFetch } from "./api/installTenantFetch";
import "./index.css";

installTenantFetch();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
