import { useState } from "react";

interface StreamOptions {
  url: string;
  body: any;
  onText: (text: string) => void;
  onMetadata: (data: any) => void;
  onError: (error: string) => void;
  onDone: (metadata: any) => void;
}

export function useTutorStream() {
  const [loading, setLoading] = useState(false);

  const startStream = async (options: StreamOptions) => {
    setLoading(true);
    try {
      const response = await fetch(options.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options.body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let metadata: any = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              options.onError(parsed.error);
              break;
            }
            if (parsed.text) {
              options.onText(parsed.text);
            }
            if (parsed.prerequisites !== undefined || parsed.relatedConcepts !== undefined) {
              metadata = { ...metadata, ...parsed };
              options.onMetadata(metadata);
            }
          } catch (e) {
            console.error("Failed to parse streaming data:", e);
          }
        }
      }

      options.onDone(metadata);
    } catch (error) {
      options.onError(String(error));
    } finally {
      setLoading(false);
    }
  };

  return { startStream, loading };
}