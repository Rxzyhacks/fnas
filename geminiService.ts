
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchSpookyLore(): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a single cryptic, terrifying, one-sentence security log entry for a haunted pizzeria. Keep it brief and unsettling. Use classic Five Nights at Freddy's themes.",
      config: {
        temperature: 0.9,
        topP: 0.95,
      }
    });
    return response.text?.trim() || "The cameras are offline... again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Something is in the kitchen.";
  }
}
