import { GoogleGenAI } from "@google/genai";
import { GroundingChunk } from "../types.ts";

// Helper to get AI instance safely
const getAI = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const searchMarketTrends = async (query: string) => {
  try {
    const ai = getAI();
    // Corrected model to gemini-3-flash-preview for search grounding as per guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

    return { text, groundingChunks };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const analyzeComplexData = async (query: string, contextData: string) => {
  try {
    const ai = getAI();
    // Using gemini-3-pro-preview for complex reasoning with thinking budget
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Context Data: ${contextData}\n\nUser Query: ${query}`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking budget for deep analysis
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Thinking Error:", error);
    throw error;
  }
};