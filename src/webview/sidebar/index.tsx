import React from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./Sidebar";
import "../tailwind.css";

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<Sidebar />);
}
