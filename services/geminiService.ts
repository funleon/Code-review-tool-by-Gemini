import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const reviewCode = async (code: string, language: string): Promise<string> => {
  if (!code.trim()) {
    throw new Error("程式碼片段不可為空。");
  }

  const prompt = `
    Act as an expert senior software engineer and a world-class code reviewer.
    Your task is to provide a thorough and constructive code review for the following ${language} code snippet.

    Focus on the following aspects:
    1.  **Code Quality & Best Practices:** Adherence to language-specific conventions, standards, and best practices.
    2.  **Potential Bugs & Errors:** Identify logical errors, edge cases, race conditions, or other potential bugs.
    3.  **Performance:** Suggest optimizations for performance, memory usage, or efficiency.
    4.  **Security:** Point out potential security vulnerabilities (e.g., SQL injection, XSS, etc.),and provide a corrected example and explanation.
    5.  **Readability & Maintainability:** Comment on code clarity, naming conventions, comments, and overall structure.
    6.  **Refactoring Suggestions:** Provide concrete examples of how the code could be improved or refactored for better quality.
    7.  **Dependency Analysis:** If the code includes dependency declarations (e.g., from package.json, requirements.txt, .csproj, Maven pom.xml, etc.), check for outdated or vulnerable packages. Specifically, identify packages that have not been updated in over 3 years or have known vulnerabilities with a CVSS score of 9.0 or higher. For each flagged dependency, state the reason (e.g., "Outdated: Last updated 4 years ago" or "Vulnerable: CVE-XXXX - CVSS 9.8") and suggest action, such as updating to a newer version or replacing the package.

    Provide your feedback in a clear, concise, and actionable format. Use Markdown for formatting.
    Your entire response, including all explanations and comments, must be in Traditional Chinese (正體中文),and mainly use Taiwan's common terms.
    Start with a high-level summary, then provide a detailed analysis. 
    Use headings, lists, and code blocks for clarity. Be supportive and educational in your tone.

    Here is the code:
    \`\`\`${language.toLowerCase()}
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
    return reviewText;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`API 錯誤： ${error.message}`);
    }
    throw new Error("與 API 通訊時發生未知錯誤。");
  }
};