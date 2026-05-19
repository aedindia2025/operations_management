// vite.config.js
import { defineConfig, loadEnv } from "file:///R:/otm/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///R:/otm/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appBasePath = (env.VITE_APP_BASE_PATH || "/").replace(/\/+$/, "") || "/";
  const apiBaseUrl = stripTrailingSlash(env.VITE_API_BASE_URL || "http://localhost:7000/api");
  const proxyTarget = stripTrailingSlash(
    env.VITE_API_PROXY_TARGET || (apiBaseUrl.startsWith("http://") || apiBaseUrl.startsWith("https://") ? apiBaseUrl.replace(/\/api$/, "") : "http://103.110.236.187:7000")
  );
  return {
    base: appBasePath.endsWith("/") ? appBasePath : `${appBasePath}/`,
    plugins: [react()],
    assetsInclude: ["**/*.xlsx"],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        }
      },
      watch: {
        usePolling: true,
        interval: 1e3
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJSOlxcXFxvdG1cXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIlI6XFxcXG90bVxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vUjovb3RtL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5cclxuZnVuY3Rpb24gc3RyaXBUcmFpbGluZ1NsYXNoKHZhbHVlKSB7XHJcbiAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1xcLyskLywgXCJcIik7XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCBcIlwiKTtcbiAgY29uc3QgYXBwQmFzZVBhdGggPSAoZW52LlZJVEVfQVBQX0JBU0VfUEFUSCB8fCBcIi9cIikucmVwbGFjZSgvXFwvKyQvLCBcIlwiKSB8fCBcIi9cIjtcbiAgY29uc3QgYXBpQmFzZVVybCA9IHN0cmlwVHJhaWxpbmdTbGFzaChlbnYuVklURV9BUElfQkFTRV9VUkwgfHwgXCJodHRwOi8vbG9jYWxob3N0OjcwMDAvYXBpXCIpO1xuICBjb25zdCBwcm94eVRhcmdldCA9IHN0cmlwVHJhaWxpbmdTbGFzaChcbiAgICBlbnYuVklURV9BUElfUFJPWFlfVEFSR0VUIHx8XG4gICAgICAoYXBpQmFzZVVybC5zdGFydHNXaXRoKFwiaHR0cDovL1wiKSB8fCBhcGlCYXNlVXJsLnN0YXJ0c1dpdGgoXCJodHRwczovL1wiKVxuICAgICAgICA/IGFwaUJhc2VVcmwucmVwbGFjZSgvXFwvYXBpJC8sIFwiXCIpXG4gICAgICAgIDogXCJodHRwOi8vMTAzLjExMC4yMzYuMTg3OjcwMDBcIilcbiAgKTtcblxyXG4gIHJldHVybiB7XG4gICAgYmFzZTogYXBwQmFzZVBhdGguZW5kc1dpdGgoXCIvXCIpID8gYXBwQmFzZVBhdGggOiBgJHthcHBCYXNlUGF0aH0vYCxcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgYXNzZXRzSW5jbHVkZTogW1wiKiovKi54bHN4XCJdLFxuICAgIHNlcnZlcjoge1xyXG4gICAgICBob3N0OiBcIjAuMC4wLjBcIixcclxuICAgICAgcG9ydDogNTE3MyxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICBcIi9hcGlcIjoge1xyXG4gICAgICAgICAgdGFyZ2V0OiBwcm94eVRhcmdldCxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICB3YXRjaDoge1xyXG4gICAgICAgIHVzZVBvbGxpbmc6IHRydWUsXHJcbiAgICAgICAgaW50ZXJ2YWw6IDEwMDAsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFPLFNBQVMsY0FBYyxlQUFlO0FBQzNRLE9BQU8sV0FBVztBQUVsQixTQUFTLG1CQUFtQixPQUFPO0FBQ2pDLFNBQU8sTUFBTSxRQUFRLFFBQVEsRUFBRTtBQUNqQztBQUVBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUMzQyxRQUFNLGVBQWUsSUFBSSxzQkFBc0IsS0FBSyxRQUFRLFFBQVEsRUFBRSxLQUFLO0FBQzNFLFFBQU0sYUFBYSxtQkFBbUIsSUFBSSxxQkFBcUIsMkJBQTJCO0FBQzFGLFFBQU0sY0FBYztBQUFBLElBQ2xCLElBQUksMEJBQ0QsV0FBVyxXQUFXLFNBQVMsS0FBSyxXQUFXLFdBQVcsVUFBVSxJQUNqRSxXQUFXLFFBQVEsVUFBVSxFQUFFLElBQy9CO0FBQUEsRUFDUjtBQUVBLFNBQU87QUFBQSxJQUNMLE1BQU0sWUFBWSxTQUFTLEdBQUcsSUFBSSxjQUFjLEdBQUcsV0FBVztBQUFBLElBQzlELFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUNqQixlQUFlLENBQUMsV0FBVztBQUFBLElBQzNCLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxRQUNoQjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLE9BQU87QUFBQSxRQUNMLFlBQVk7QUFBQSxRQUNaLFVBQVU7QUFBQSxNQUNaO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
