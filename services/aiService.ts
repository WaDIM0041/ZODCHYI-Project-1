import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types.ts";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Вспомогательная функция для конвертации blob url в base64
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]); // Возвращаем только чистый base64
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const analyzeConstructionTask = async (
  taskTitle: string,
  taskDescription: string,
  imageUrls: string[]
): Promise<AIAnalysisResult> => {
  const ai = getAI();
  
  const prompt = `
    Как профессиональный инженер технадзора, проанализируй качество работ по предоставленным фото:
    Задача: ${taskTitle}
    Описание: ${taskDescription}
    
    Выяви возможные нарушения СНиП и ГОСТ. Оцени результат (passed/warning/failed).
    Верни ответ строго в формате JSON.
  `;

  try {
    // Конвертируем все локальные ссылки в base64 для API
    const imageParts = await Promise.all(
      imageUrls.map(async (url) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: await urlToBase64(url)
        }
      }))
    );

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          ...imageParts
        ]
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
    console.error("AI Analysis error:", error);
    return {
      status: 'warning',
      feedback: 'Автоматический анализ временно недоступен из-за ошибки обработки изображений. Требуется ручная проверка.',
      detectedIssues: ['Ошибка обработки медиа-данных'],
      timestamp: new Date().toISOString()
    };
  }
};

export const getAITechnicalAdvice = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  try {
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
    return "Ошибка ИИ: " + (error instanceof Error ? error.message : "сервис временно недоступен");
  }
};