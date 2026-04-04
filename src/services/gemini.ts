import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFormula(fileBase64: string, mimeType: string) {
  // Using gemini-3.1-flash-lite-preview for faster response as requested
  const model = "gemini-3.1-flash-lite-preview";
  
  const prompt = `You are an expert tutor for Tribhuvan University (T.U.) BBS 4th year students. 
  Analyze the formula(s) in the provided image or document.
  
  CRITICAL INSTRUCTIONS:
  1. Identify ALL formulas in the image. If there are 16, explain all 16. If there are 26, explain all 26. DO NOT MISS ANY.
  2. Explain each formula in a simple way using a mix of Nepali (MUST use Devanagari script, e.g., नेपाली) and English.
  3. Use English terms like "vdw" or other technical terms if needed, but explain them in simple Nepali Devanagari.
  4. Break down each component of every formula.
  5. Provide a simple example for each.
  6. This is for an EXAM, so accuracy is mandatory. No mistakes.
  7. Do not cut down or summarize. Provide full explanations for every single formula found.
  8. Use the word "उत्तरहरू" (which means Answers) to label your sections.
  9. IMPORTANT: Use LaTeX notation for all mathematical formulas and expressions (e.g., use $...$ for inline math and $$...$$ for block math). This ensures they are rendered clearly.
  
  Format your response in clear Markdown with numbered sections for each formula.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
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

  return response.text;
}

export async function generateSpeech(text: string) {
  const model = "gemini-2.5-flash-preview-tts";
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: `Explain this formula clearly: ${text}` }] }],
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
