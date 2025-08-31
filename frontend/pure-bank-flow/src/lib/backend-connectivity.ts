export const API_ENDPOINT = "http://localhost:4464/api/v1";
export async function checkBackendConnectivity(): Promise<boolean> {
  try {
    // Egyszerű GET kérés a /health végpontra (vagy /ping, ha van)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_ENDPOINT}/health`, { 
      method: "GET", 
      credentials: "include",
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}
