const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface KoraRequestPayload {
  model?: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stream?: boolean;
}

/**
 * Sends a chat completion request to the live KORA API.
 * Includes automatic retry logic to gracefully handle server cold-starts.
 */
export async function postKoraChat(payload: KoraRequestPayload): Promise<Response> {
  // Use import.meta.env for Vite, or process.env for Next.js
  const baseUrl = import.meta.env.VITE_KORA_API_URL || "https://professorceo-kora-api.hf.space";
  
  const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  
  const requestInit: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "KORA",
      stream: true,
      ...payload
    }),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(endpoint, requestInit);

      if (response.ok) {
        return response; // Success! Return the stream.
      }

      const errorBody = await response.text();
      lastError = new Error(`KORA API request failed (${response.status}): ${errorBody}`);

      // Only retry on server errors (5xx)
      if (response.status < 500) break;
      
    } catch (err: any) {
      lastError = err;
    }

    if (attempt < MAX_RETRIES) {
      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError ?? new Error("KORA API request failed");
}
