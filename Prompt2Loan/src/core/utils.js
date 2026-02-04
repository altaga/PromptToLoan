import { useCallback, useEffect, useRef, useState } from "react";
import { fetch } from "expo/fetch";

export async function fetchWithRetries(url, options = {}, retryOptions = {}) {
  const {
    retries = 10,
    delay = 3000, // 3 seconds
    backoff = 2,
    nullOnStatuses = [],
  } = retryOptions;

  let attempts = 0;
  let currentDelay = delay;

  while (attempts < retries) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response; // Success!
      }

      if (nullOnStatuses.includes(response.status)) {
        console.warn(
          `Request failed with non-retryable status ${response.status}. Returning null.`,
        );
        return { result: null };
      }

      console.warn(
        `Request failed with status ${response.status}. Attempting retry ${
          attempts + 1
        }/${retries}...`,
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      attempts++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Fetch attempt ${attempts} failed:`, errorMessage);

      if (attempts < retries) {
        console.log(`Retrying in ${currentDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoff;
      } else {
        throw new Error(
          `Failed to fetch ${url} after ${retries} attempts. Last error: ${errorMessage}`,
        );
      }
    }
  }

  return { result: null };
}

export function useStateAsync(initialValue) {
  const [state, setState] = useState(initialValue);
  const resolverRef = useRef(null);

  const asyncSetState = useCallback((newValue) => {
    setState(newValue);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Resolve the promise after state updates
  useEffect(() => {
    if (resolverRef.current) {
      resolverRef.current(state);
      resolverRef.current = null;
    }
  }, [state]);

  return [state, asyncSetState];
}
