import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The app is one static page. The host answers every path with index.html, and the app reads the path itself.
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
  },
});
