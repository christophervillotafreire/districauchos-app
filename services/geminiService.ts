import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "../types";

// La API_KEY se inyecta desde Vite/Vercel
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const transactionSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Nombre del producto o descripción del gasto" },
          amount: { type: Type.NUMBER, description: "Valor monetario numérico puro" },
          type: { 
            type: Type.STRING, 
            description: "Categoria de transacción",
            enum: [
              TransactionType.CASH_SALE,
              TransactionType.NEQUI_SALE,
              TransactionType.RETURN,
              TransactionType.DAILY_EXPENSE
            ]
          }
        },
        required: ["description", "amount", "type"]
      }
    },
    dayEstimate: { type: Type.NUMBER, description: "Día del mes detectado (1-31)" }
  },
  required: ["items"]
};

export const parseNotebookPage = async (base64Data: string, mimeType: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Analiza este registro contable de 'Districauchos y Empaques del Sur'. 
            - Extrae todas las ventas (Efectivo o Nequi).
            - Extrae gastos (almuerzos, transportes, insumos).
            - Extrae devoluciones.
            - Si un valor dice '20' o '50' en un contexto de miles, conviértelo a '20000' o '50000'.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: transactionSchema,
        systemInstruction: "Eres un contador experto que digitaliza cuadernos manuales colombianos con precisión absoluta.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No se recibió respuesta de la IA");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Error en Gemini:", error);
    throw error;
  }
};