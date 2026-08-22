import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export const generateChatCompletion = async (
  messages: ChatMessage[],
): Promise<string> => {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq API request failed (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as GroqResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Groq API returned an empty response.");
    }

    return content;
  } catch (error) {
    throw new AppError(
      "LLM provider is unavailable.",
      502,
      "LLM_GENERATION_FAILED",
    );
  }
};
