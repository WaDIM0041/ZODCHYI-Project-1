
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types.ts";

const getAI = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = () => reject(new Error("Failed to read blob as base64"));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Zodchiy: Conversion error", err);
    throw err;
  }
}

export const analyzeConstructionTask = async (
  taskTitle: string,
  taskDescription: string,
  imageUrls: string[]
): Promise<AIAnalysisResult> => {
  if (!imageUrls || imageUrls.length === 0) {
    return {
      status: 'warning',
      feedback: 'Нет изображений для анализа.',
      detectedIssues: [],
      timestamp: new Date().toISOString()
    };
  }

  try {
    const ai = getAI();
    const imageParts = await Promise.all(
      imageUrls.slice(0, 3).map(async (url) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: await urlToBase64(url)
        }
      }))
    );

    const prompt = `
      Как профессиональный инженер технадзора, проанализируй качество работ по предоставленным фото:
      Задача: ${taskTitle}
      Описание: ${taskDescription}
      
      Выяви возможные нарушения СНиП и ГОСТ. Оцени результат (passed/warning/failed).
      Верни ответ строго в формате JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: prompt }, ...imageParts]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ['passed', 'warning', 'failed'] },
            feedback: { type: Type.STRING },
            detectedIssues: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['status', 'feedback', 'detectedIssues']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      ...result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Zodchiy: AI Analysis error", error);
    return {
      status: 'warning',
      feedback: 'Автоматический анализ временно недоступен. Требуется ручная проверка технадзором.',
      detectedIssues: ['Сбой сервиса ИИ'],
      timestamp: new Date().toISOString()
    };
  }
};

export const getAITechnicalAdvice = async (query: string, context: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Ты — ЗОДЧИЙ AI. Твоя специализация: строительный технадзор и нормы СНиП/ГОСТ.
        Контекст текущего объекта: ${context}
        Вопрос пользователя: ${query}
        Давай краткие, профессиональные и точные ответы.
      `,
    });
    return response.text || "Система не смогла сформировать ответ.";
  } catch (error) {
    return "Ошибка ИИ: сервис временно недоступен.";
  }
};
