/**
 * useDevOSAI
 *
 * A typed React hook that provides a clean interface for calling the
 * DevOS AI API endpoint (`POST /api/devos-ai`).
 *
 * Usage:
 *   const { ask, data, isLoading, error, reset } = useDevOSAI();
 *   await ask("How do I debounce a React hook?");
 *
 * The hook manages three UI-bindable state fields:
 *   - isLoading  whether a request is in flight
 *   - data       the last successful AI response text (null if none yet)
 *   - error      a user-friendly error message (null if no error)
 */

import { useState, useCallback, useRef } from "react";
import { auth } from "../lib/firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the JSON body sent to POST /api/devos-ai */
interface AIRequest {
  prompt: string;
  /** Max tokens to generate. Clamped server-side to [1, 2048]. Default: 512. */
  maxTokens?: number;
}

/** Successful response from POST /api/devos-ai */
interface AISuccessResponse {
  text: string;
}

/** Error response body returned by the API on failure */
interface AIErrorResponse {
  error: string;
  /** Seconds the client should wait before retrying (present on 503). */
  retryAfter?: number;
}

/** Public state shape returned by the hook */
export interface DevOSAIState {
  /** Whether a request is currently in-flight */
  isLoading: boolean;
  /** The most recent AI response text, or null if no successful call yet */
  data: string | null;
  /** A user-facing error message, or null if no error */
  error: string | null;
  /**
   * Call the AI with a prompt.
   * Resolves with the response text on success, or null on failure.
   * The hook state (isLoading / data / error) is updated automatically.
   */
  ask: (prompt: string, options?: { maxTokens?: number }) => Promise<string | null>;
  /** Clear the last response and error without making a new request */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * useDevOSAI — manages AI chat state for the glassmorphism chat UI.
 */
export function useDevOSAI(): DevOSAIState {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ref to hold the AbortController for the current in-flight fetch so that
   * unmounted components can safely cancel pending requests.
   */
  const abortRef = useRef<AbortController | null>(null);

  /**
   * ask — send a prompt to the DevOS AI endpoint and update hook state.
   *
   * @param prompt     The user's message / question.
   * @param options    Optional: { maxTokens } to control response length.
   * @returns          The AI response text on success, or null on error.
   */
  const ask = useCallback(
    async (
      prompt: string,
      options: { maxTokens?: number } = {}
    ): Promise<string | null> => {
      // Cancel any previous in-flight request.
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        // Obtain the current user's Firebase ID token to authenticate the call.
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setError("You must be signed in to use DevOS AI.");
          return null;
        }

        const idToken = await currentUser.getIdToken();

        const body: AIRequest = {
          prompt,
          ...(options.maxTokens !== undefined && { maxTokens: options.maxTokens }),
        };

        const response = await fetch("/api/devos-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          // Try to extract a friendly error message from the JSON body.
          let friendlyError = `Request failed (HTTP ${response.status}).`;
          try {
            const errBody: AIErrorResponse = await response.json();
            if (errBody.error) friendlyError = errBody.error;
          } catch {
            // Ignore JSON parse errors; stick with the generic message.
          }
          setError(friendlyError);
          return null;
        }

        const result: AISuccessResponse = await response.json();
        const text = result.text ?? "";
        setData(text);
        return text;
      } catch (err: unknown) {
        // Ignore abort errors — they are intentional cancellations.
        if (err instanceof DOMException && err.name === "AbortError") return null;

        const message =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /** reset — clear the last response and error. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { isLoading, data, error, ask, reset };
}
