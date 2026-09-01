/**
 * Safe API request helper with resilient error extraction and JSON parsing.
 * Protects against HTML error responses, reverse-proxy errors (502/504),
 * and invalid JSON syntax crashes.
 */
export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data: any = null;

  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    // If response is text/html, get text safely
    try {
      const rawText = await response.text();
      // Try to parse if it's formatted as JSON despite missing header
      try {
        data = JSON.parse(rawText);
      } catch {
        if (!response.ok) {
          // Check for common HTML or gateway errors
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html') || rawText.includes('The page')) {
            throw new Error(`Server temporarily unavailable (${response.status}). Please try again in a few moments.`);
          }
          throw new Error(rawText.slice(0, 150) || `Request failed with status ${response.status}`);
        }
      }
    } catch (textErr: any) {
      throw new Error(textErr?.message || `Request failed with status ${response.status}`);
    }
  }

  if (!response.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      (response.status === 401 ? 'Invalid password or unauthorized session.' : `Server error (${response.status})`);
    throw new Error(errorMsg);
  }

  return data as T;
}
