import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** The port of the dev server. The live relay answers this origin and no other port of localhost. */
export const DEV_PORT = 5181;

// The app is one static page. The host answers every path with index.html, and the app reads the path itself.
export default defineConfig({
  plugins: [react()],
  // A port of its own, not the default of Vite, so that no other dev server on this machine shares the origin that
  // the live relay answers (D-10 of the scan of 12 Oct 2026); a taken port stops the server instead of moving it.
  server: { port: DEV_PORT, strictPort: true },
  build: {
    target: "es2022",
  },
});
