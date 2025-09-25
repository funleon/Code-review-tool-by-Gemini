import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const reviewCode = async (code: string, language: string): Promise<{ review: string; score: number | null }> => {
  if (!code.trim()) {
    throw new Error("程式碼片段不可為空。");
  }

  const prompt = `
    As an expert senior software engineer and world-class code reviewer, your task is to provide a thorough and constructive code review for the following ${language} code snippet or multi-file project.

    **VERY IMPORTANT:** At the absolute beginning of your response, you MUST provide an overall score based on the detailed rubric below. The format must be exactly: **總體評分：XX/100**. Do not add any other text before this line.

    After the score, conduct the review based on the following comprehensive scoring mechanism, which totals 100 points.

    ### 程式碼審查評分機制 (總分 100 分)

    #### I. 核心標準與權重

    | 評分面向 | 說明 | 權重 (滿分) |
    | :--- | :--- | :--- |
    | **A. 正確性與功能** | 程式碼是否達成功能，沒有引入新的 Bug。 | **30 分** |
    | **B. 可讀性與樣式** | 程式碼是否容易理解、符合風格指南和命名規範。 | **20 分** |
    | **C. 設計與架構** | 程式碼的設計是否良好、模組化程度高、易於擴展和重用。 | **20 分** |
    | **D. 安全與依賴項檢查** | **強制檢查**相依套件的弱點、過舊問題，以及程式碼本身的安全性。 | **20 分** |
    | **E. 測試與文件** | 相關單元測試是否足夠，以及必要的註釋和文件是否齊全。 | **10 分** |
    | **總計** | | **100 分** |

    ---

    #### II. 詳細評分標準

    **D. 安全與依賴項檢查 (20 分)**
    這個面向是**強制性**的。任何嚴重漏洞都應導致審查**失敗（不予合併）**。

    | 評分細則 | 扣分範圍 | 備註/說明 |
    | :--- | :--- | :--- |
    | **1. 嚴重弱點 (CVSS ≥ 9.0)** | **直接扣 20 分** | **強制不予合併！** 必須立即更新、替換相依套件或進行緩和措施。 |
    | **2. 高風險弱點 (CVSS 7.0 ~ 8.9)** | 扣 10 - 15 分 | 應優先修復。若因特殊原因暫時無法更新，需**提供書面風險評估和緩解計畫**。 |
    | **3. 中/低風險弱點 (CVSS ≤ 6.9)** | 扣 5 - 10 分 | 建議修復。扣分取決於漏洞的可利用性及影響範圍。 |
    | **4. 相依套件過舊** | 扣 5 - 10 分 | 儘管沒有已知漏洞，但相依套件版本已**明顯過舊**（例如：超過一年未更新，或落後兩個主要版本），應儘量更新。 |
    | **5. 程式碼本身的安全漏洞** | 扣 5 - 10 分 | 程式碼中存在常見的安全問題（例如：未經適當輸入驗證、錯誤處理敏感資訊等）。 |

    **A. 正確性與功能 (30 分)**
    | 評分細則 | 扣分範圍 | 備註/說明 |
    | :--- | :--- | :--- |
    | **核心功能實現** | 扣 10 - 30 分 | 未正確實現需求；存在**嚴重**功能性 Bug（導致崩潰、資料遺失等）。 |
    | **邊界條件處理** | 扣 5 - 10 分 | 未考慮或處理好邊界條件（例如：空值、極端值、錯誤輸入）。 |
    | **性能問題** | 扣 5 - 10 分 | 程式碼效率低下，有明顯的性能瓶頸（例如：不必要的迴圈或資料庫查詢）。 |

    **B. 可讀性與樣式 (20 分)**
    | 評分細則 | 扣分範圍 | 備註/說明 |
    | :--- | :--- | :--- |
    | **命名規範** | 扣 5 - 10 分 | 命名不清晰、具誤導性或不符合規範。 |
    | **風格指南** | 扣 5 - 10 分 | 違反團隊約定的風格指南（例如：縮排、空行等）。 |
    | **邏輯複雜度** | 扣 5 - 10 分 | 函式或邏輯過於複雜或巢狀過深，應簡化或重構。 |

    **C. 設計與架構 (20 分)**
    | 評分細則 | 扣分範圍 | 備註/說明 |
    | :--- | :--- | :--- |
    | **DRY 原則** | 扣 5 - 10 分 | 存在不必要的重複程式碼 (Don't Repeat Yourself)。 |
    | **職責單一原則 (SRP)** | 扣 5 - 10 分 | 模組或函式承擔了過多的職責，耦合度高。 |
    | **模組化與抽象** | 扣 5 - 10 分 | 缺乏良好的模組化，難以維護或重用。 |

    **E. 測試與文件 (10 分)**
    | 評分細則 | 扣分範圍 | 備註/說明 |
    | :--- | :--- | :--- |
    | **單元測試覆蓋率** | 5 - 10 分 | 核心業務或複雜邏輯缺乏單元測試。 |
    | **註釋與文件** | 5 - 10 分 | 複雜邏輯或公開 API 缺乏必要的註釋或文件說明。 |

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
