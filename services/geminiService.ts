import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const reviewCode = async (code: string, language: string): Promise<{ review: string; score: number | null }> => {
  if (!code.trim()) {
    throw new Error("程式碼片段不可為空。");
  }

  const prompt = `
    As an expert senior software engineer and world-class code reviewer, your task is to provide a thorough and constructive code review for the following ${language} code snippet or multi-file project.

    **VERY IMPORTANT:** At the absolute beginning of your response, you MUST provide an overall score. The format must be exactly: **總體評分：XX/100**. Do not add any other text before this line.

    After the score, conduct the review based on the following comprehensive scoring mechanism. Use your expert knowledge to evaluate the code within each category.

    ### 程式碼審查評分機制 (總分 100 分)

    | 評分面向 | 權重 (滿分) |
    | :--- | :--- |
    | **A. 正確性與功能 (Correctness & Functionality)** | **30 分** |
    | **B. 可讀性與樣式 (Readability & Style)** | **20 分** |
    | **C. 設計與架構 (Design & Architecture)** | **20 分** |
    | **D. 安全與依賴項檢查 (Security & Dependencies)** | **20 分** |
    | **E. 測試與文件 (Testing & Documentation)** | **10 分** |
    
    When assessing **Security (D)**, pay close attention to potential vulnerabilities, dependency issues, and secure coding practices. This is a critical area.

    ---

    **Final Instructions:**
    - If reviewing a multi-file project (indicated by "--- FILE: ..." markers), your review must be holistic.
    - Provide feedback in a clear, concise, and actionable format using Markdown.
    - Your entire response, including all explanations and comments, must be in **Traditional Chinese (正體中文)**, and use terms common in Taiwan.
    - Be supportive and educational in your tone.

    Here is the code/project content:
    \`\`\`
    ${code}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const reviewText = response.text;

    if (!reviewText) {
        throw new Error("從 API 收到了空的回應。");
    }

    const scoreMatch = reviewText.match(/\*\*總體評分：\s*(\d{1,3})\s*\/\s*100\*\*/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    return { review: reviewText, score };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`API 錯誤： ${error.message}`);
    }
    throw new Error("與 API 通訊時發生未知錯誤。");
  }
};