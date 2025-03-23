import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vitePluginFaviconsInject from "vite-plugin-favicons-inject";

export default defineConfig({
  plugins: [
    tailwindcss(),
    process.env.NODE_ENV === "production"
      ? vitePluginFaviconsInject("./assets/logo.png", {
          background: "#1e293b",
          theme_color: "#1e293b",
          appName: "Countries Game",
          appShortName: "Countries Game",
        })
      : false,
  ],
});
