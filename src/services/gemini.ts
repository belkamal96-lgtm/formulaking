import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFormula(fileBase64: string, mimeType: string) {
  // Step 1: Use Gemini to extract raw formulas from the image
  const ocrModel = "gemini-3.1-flash-lite-preview";
  const ocrPrompt = `Extract ALL mathematical formulas from the provided image. 
  Return ONLY the formulas themselves, one per line. 
  Do not explain them yet. Just list them clearly.`;

  const ocrResponse = await ai.models.generateContent({
    model: ocrModel,
    contents: [
      {
        role: "user",
        parts: [
          { text: ocrPrompt },
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
        ],
      },
    ],
  });

  const extractedFormulas = ocrResponse.text;

  if (!extractedFormulas || extractedFormulas.trim().length === 0) {
    return "No formulas found in the image. Please try again with a clearer picture.";
  }

  // Step 2: Use the new RapidAPI ChatGPT endpoint for high-quality explanations
  const chatPrompt = `You are an expert tutor for Tribhuvan University (T.U.) BBS 4th year students. 
  Explain the following formulas in the SIMPLEST way possible (like explaining to a 10-year-old) using a mix of Nepali (MUST use Devanagari script, e.g., नेपाली) and English.
  
  FORMULAS TO EXPLAIN:
  ${extractedFormulas}
  
  CRITICAL INSTRUCTIONS (NEW VERSION 2.0):
  1. Explain ALL formulas listed above. DO NOT MISS ANY.
  2. Use English terms like "vdw" or other technical terms if needed, but explain them in simple Nepali Devanagari.
  3. Break down each component of every formula clearly. Tell the student exactly what each letter or symbol means in very simple words.
  4. EXAMPLES (MANDATORY & PLENTIFUL): 
     - You MUST provide AT LEAST 2-3 practical examples for EVERY SINGLE formula identified. 
     - Each example must have different numbers to show how the formula works in different scenarios.
     - Make the examples very easy to follow with step-by-step calculations.
  5. This is for an EXAM, so accuracy is mandatory. No mistakes.
  6. Do not cut down or summarize. Provide full, detailed, and high-quality explanations for every single formula found.
  7. Use the word "उत्तरहरू" (which means Answers) to label your sections.
  8. IMPORTANT: Use LaTeX notation for all mathematical formulas and expressions (e.g., use $...$ for inline math and $$...$$ for block math). This ensures they are rendered clearly.
  
  Format your response in clear Markdown with numbered sections for each formula. Take your time to ensure the best, simplest, and most complete answer with lots of examples. This is the new enhanced version, so provide much more detail than before.`;

  try {
    const response = await axios.post("/api/analyze", { prompt: chatPrompt });
    // The server returns { text: ... }
    return response.data.text || response.data;
  } catch (error) {
    console.error("RapidAPI Error:", error);
    return "Failed to get explanation from ChatGPT. Please check your API key or try again later.";
  }
}

export async function generateSpeech(text: string) {
  const model = "gemini-2.5-flash-preview-tts";
  
  // Clean up markdown for better TTS
  const cleanText = text
    .replace(/[#*`$]/g, '') // Remove markdown symbols
    .replace(/\\/g, '') // Remove backslashes
    .substring(0, 1000); // Limit to 1000 chars for stability
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Read this formula explanation clearly: ${cleanText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}
