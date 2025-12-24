import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "../types";

// La API_KEY se inyecta desde el entorno
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

export interface FileData {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export const parseNotebookPage = async (files: FileData[]) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...files,
          {
            text: `Analiza estas fotos de un registro contable de 'Districauchos y Empaques del Sur'. 
            IMPORTANTE: Has recibido ${files.length} imágenes. Pueden ser varias páginas o fotos del MISMO DÍA. 
            
            - Debes leer CADA UNA de las imágenes proporcionadas.
            - Consolida TODOS los ítems de todas las imágenes en una sola lista final. No omitas nada.
            - Clasifica cada ítem:
              * Venta Efectivo: Dinero físico recibido.
              * Venta Nequi: Pagos por transferencia.
              * Gasto Diario: Egresos (compras, comida, aseo).
              * Devolución: Dinero devuelto al cliente.
            - Si un valor dice '20' en columna de miles, interpreta como 20000.
            - Si encuentras un encabezado de fecha, extrae el número del día.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: transactionSchema,
        systemInstruction: "Eres un contador experto que digitaliza cuadernos manuales. Tu prioridad es la precisión y no omitir ninguna línea de las múltiples fotos que se te envían. Une todo el contenido en un solo objeto JSON.",
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