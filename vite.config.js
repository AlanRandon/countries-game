import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vitePluginFaviconsInject from "vite-plugin-favicons-inject";

export default defineConfig({
  plugins: [
    tailwindcss(),
    process.env.NODE_ENV === "production"
      ? vitePluginFaviconsInject("./assets/logo.png")
      : false,
  ],
});
