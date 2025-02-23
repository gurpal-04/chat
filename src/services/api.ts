import { Message } from "../types";

const TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";

export async function streamCompletion(messages: Message[]) {
  const apiKey = import.meta.env.VITE_TOGETHER_API_KEY;

  if (!apiKey) {
    throw new Error("Together API key is not configured");
  }

  const response = await fetch(TOGETHER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free",
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      top_p: 0.7,
      top_k: 50,
      repetition_penalty: 1,
      stop: ["<｜end▁of▁sentence｜>"],
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.body;
}
