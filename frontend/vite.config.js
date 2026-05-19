import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appBasePath = (env.VITE_APP_BASE_PATH || "/").replace(/\/+$/, "") || "/";
  const apiBaseUrl = stripTrailingSlash(env.VITE_API_BASE_URL || "http://localhost:7000/api");
  const proxyTarget = stripTrailingSlash(
    env.VITE_API_PROXY_TARGET ||
      (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://")
        ? apiBaseUrl.replace(/\/api$/, "")
        : "http://103.110.236.187:7000")
  );

  return {
    base: appBasePath.endsWith("/") ? appBasePath : `${appBasePath}/`,
    plugins: [react()],
    assetsInclude: ["**/*.xlsx"],
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  };
});
