import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types.ts";

// Always initialize with the required named parameter and use process.env.API_KEY directly.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeConstructionTask = async (
  taskTitle: string,
  taskDescription: string,
  imagesBase64: string[]
): Promise<AIAnalysisResult> => {
  const ai = getAI();
  
  const prompt = `
    Как профессиональный инженер технадзора, проанализируй качество работ по фото:
    Задача: ${taskTitle}
    Описание: ${taskDescription}
    
    Выяви нарушения СНиП и ГОСТ. Оцени результат.
    Верни строго JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          ...imagesBase64.map(data => ({
            inlineData: {
              mimeType: 'image/jpeg',
              data: data.includes(',') ? data.split(',')[1] : data
            }
          }))
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

    // Access the text property directly on the GenerateContentResponse object.
    const result = JSON.parse(response.text || '{}');
    return {
      ...result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("AI Analysis error:", error);
    return {
      status: 'warning',
      feedback: 'Автоматический анализ временно недоступен. Требуется ручная проверка.',
      detectedIssues: ['Ошибка связи с нейросетью'],
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
        Ты — ЗОДЧИЙ AI. Специализация: технадзор, СНиП.
        Контекст объекта: ${context}
        Вопрос: ${query}
      `,
    });
    // Access the text property directly on the GenerateContentResponse object.
    return response.text || "Нет ответа от системы.";
  } catch (error) {
    return "Ошибка ИИ: " + (error instanceof Error ? error.message : "неизвестная ошибка");
  }
};