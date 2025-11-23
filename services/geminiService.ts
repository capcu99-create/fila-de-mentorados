import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AITags } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Um resumo muito curto (máx 5 palavras) do problema.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tags técnicas ou comportamentais relacionadas (ex: React, Carreira, Backend).",
    },
    complexity: {
      type: Type.STRING,
      enum: ["Baixa", "Média", "Alta"],
      description: "Nível estimado de complexidade para resolver o problema.",
    },
  },
  required: ["summary", "tags", "complexity"],
};

export const analyzeTicketRequest = async (reason: string): Promise<AITags> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analise o seguinte pedido de mentoria e categorize-o para o mentor. O pedido é: "${reason}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "Você é um assistente de triagem para um mentor técnico sênior. Seja direto e técnico.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AITags;
  } catch (error) {
    console.error("Erro ao analisar ticket com Gemini:", error);
    // Fallback manual if AI fails
    return {
      summary: "Análise Indisponível",
      tags: ["Geral"],
      complexity: "Média",
    };
  }
};