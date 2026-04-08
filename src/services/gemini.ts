import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

const getApiKey = () => {
  // Use the key provided by Vite's define or from import.meta.env
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    return null;
  }
  return key;
};

export async function analyzeFormula(fileBase64: string, mimeType: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing on Vercel. Please go to Vercel Settings > Environment Variables and add 'VITE_GEMINI_API_KEY' with your Google AI Studio API key.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  // Switching to gemini-2.0-flash for better reliability and higher rate limits on free tier
  const model = "gemini-2.0-flash";
  
  const prompt = `You are an expert tutor for Tribhuvan University (T.U.) BBS 4th year students. 
  Analyze the formula(s) in the provided image or document.
  
  CRITICAL INSTRUCTIONS:
  1. Identify ALL formulas in the image. If there are 18 formulas, you must explain all 18. If there are 26, explain all 26. DO NOT MISS ANY.
  2. Explain each formula in the SIMPLEST way possible (like explaining to a 10-year-old) using a mix of Nepali (MUST use Devanagari script, e.g., नेपाली) and English.
  3. Use English terms like "vdw" or other technical terms if needed, but explain them in simple Nepali Devanagari.
  4. Break down each component of every formula clearly. Tell the student exactly what each letter or symbol means in very simple words.
  5. EXAMPLES (MANDATORY & PLENTIFUL): 
     - You MUST provide AT LEAST 2-3 practical examples for EVERY SINGLE formula identified. 
     - If you find 18 formulas, there MUST be at least 36-54 examples in your response.
     - Each example must have different numbers to show how the formula works in different scenarios.
     - Make the examples very easy to follow with step-by-step calculations.
  6. This is for an EXAM, so accuracy is mandatory. No mistakes.
  7. Do not cut down or summarize. Provide full, detailed, and high-quality explanations for every single formula found.
  8. Use the word "उत्तरहरू" (which means Answers) to label your sections.
  9. IMPORTANT: Use LaTeX notation for all mathematical formulas and expressions (e.g., use $...$ for inline math and $$...$$ for block math). This ensures they are rendered clearly.
  
  Format your response in clear Markdown with numbered sections for each formula. Take your time to ensure the best, simplest, and most complete answer with lots of examples. Provide high-quality detail.`;

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
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
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
