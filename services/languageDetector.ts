/**
 * A simple heuristic-based language detector.
 * It's not foolproof but should cover common cases for this application.
 * @param code The code snippet to analyze.
 * @returns The detected language name from SUPPORTED_LANGUAGES, or null if uncertain.
 */
export const detectLanguage = (code: string): string | null => {
  // Simple structural checks first
  if (/^\s*<!DOCTYPE html/i.test(code) || /<\s*(html|body|div|p|h[1-6])\s*>/i.test(code)) return 'HTML';
  if (/<\?php/.test(code)) return 'PHP';

  // Keyword-based checks with some context
  if (/\b(using\s+System|namespace\s+|public\s+(class|interface|enum|struct)\s+\w+\s*:?)/.test(code)) return 'C#';
  if (/\b(import\s+java\.|public\s+class|System\.out\.println)/.test(code)) return 'Java';
  if (/^\s*def\s+\w+\s*\(.*\)\s*:|import\s+(pandas|numpy|tensorflow|torch|sklearn)\b/.test(code)) return 'Python';
  if (/^\s*#include\s*<|std::|int\s+main\s*\(\)/.test(code)) return 'C++';

  // TypeScript has type annotations that JavaScript lacks
  if (/:\s*(string|number|boolean|any|void|Array<.*>|Promise<.*>)\s*([=;,(){]|\s*$)/.test(code)) return 'TypeScript';
  
  // General JavaScript/TypeScript keywords
  if (/\b(const|let|var|function|=>|import\s+\{.*\}\s+from|require\s*\()/.test(code)) return 'JavaScript';
  
  if (/\b(package\s+main|func\s+main|import\s*\()/.test(code)) return 'Go';
  if (/\b(fn\s+main|let\s+mut|::\w+)/.test(code)) return 'Rust';
  if (/^\s*def\s+.*?\s+do\b|\b(end|require\s*')/.test(code) && !code.includes(': #')) return 'Ruby'; // Avoid python comments
  if (/\b(import\s+(UIKit|SwiftUI)|func\s+|var\s+\w+\s*:|struct\s+\w+\s*:)/.test(code)) return 'Swift';
  if (/\b(fun\s+main|val\s+|var\s+\w+\s*:|package\s+\w+)/.test(code)) return 'Kotlin';

  // CSS check is moved here, after other curly-brace languages, to avoid false positives.
  // Avoids matching JSON or JS objects by checking for a selector-like pattern before the first brace
  if (/^[\s\w\d\-[\]#.:,>+~*="' ]+\s*\{/m.test(code) && /[:;]/.test(code)) return 'CSS';

  // SQL-like languages (can be tricky)
  if (/\b(SELECT|CREATE\s+TABLE|UPDATE|INSERT\s+INTO|DECLARE|FROM|WHERE)\b/i.test(code)) {
    // PL/SQL specific features
    if (/\b(DBMS_OUTPUT\.PUT_LINE|BEGIN|END;|ELSIF|LOOP)\b/i.test(code)) return 'PL/SQL';
    // Default to T-SQL if common SQL keywords are found
    return 'T-SQL';
  }

  return null;
};
