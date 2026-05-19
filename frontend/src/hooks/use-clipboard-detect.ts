import { useEffect, useRef } from "react";

function looksLikeToken(value: string): boolean {
  return value.length >= 20 && !/\s/.test(value);
}

export function useClipboardDetect(
  onDetect: (text: string) => void,
  enabled: boolean
) {
  const lastSeen = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.clipboard?.readText) return;

    const tryRead = async () => {
      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (!text || text === lastSeen.current) return;
        if (!looksLikeToken(text)) return;
        lastSeen.current = text;
        onDetect(text);
      } catch {
        // Permission denied or focus required — silent fallback to manual paste.
      }
    };

    tryRead();
    window.addEventListener("focus", tryRead);
    return () => window.removeEventListener("focus", tryRead);
  }, [onDetect, enabled]);
}
