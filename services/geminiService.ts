import { GoogleGenAI, Type } from "@google/genai";
import { AITaskSuggestion } from "../types";

// Lazy Initialization
const getAiClient = () => {
  // The API key must be obtained exclusively from process.env.API_KEY
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing in process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const suggestTasksFromGoal = async (goal: string): Promise<AITaskSuggestion[]> => {
  try {
    const ai = getAiClient();
    
    if (!ai) {
      throw new Error("API Key is missing.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Break down the following goal into 3-5 specific, actionable tasks for a daily to-do list: "${goal}". 
      Assign a realistic time of day (e.g. '9:00 am') and a category (Work, Health, Personal, Shopping, Other).
      Keep descriptions short and motivational.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              time: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["title", "description", "time", "category"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AITaskSuggestion[];
    }
    return [];
  } catch (error) {
    console.error("Error generating tasks:", error);
    return [];
  }
};