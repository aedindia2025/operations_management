const TOKEN_STORAGE_KEY = "otm_token";

export function installTenantFetch() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const isApiRequest = url.startsWith("/api") || url.includes("127.0.0.1:7000/api") || url.includes("localhost:7000/api");
    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
    if (!token) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers });
  };
}
