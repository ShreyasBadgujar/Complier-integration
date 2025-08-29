import React, { useState } from "react";
import Editor from "@monaco-editor/react";

export default function CodeCompiler() {
  const [code, setCode] = useState("");
  const [input, setInput] = useState(""); // stdin
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("54"); // Default C++
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput("Running...");

    try {
      // Step 1: Submit code
      const submitResponse = await fetch(
        "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY, // Replace with your key
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
          body: JSON.stringify({
            source_code: code,
            language_id: language,
            stdin: input,
          }),
        }
      );

      const { token } = await submitResponse.json();

      // Step 2: Poll until result is ready
      let result = null;
      while (true) {
        const res = await fetch(
          `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
          {
            method: "GET",
            headers: {
              "X-RapidAPI-Key": import.meta.env.VITE_RAPIDAPI_KEY,
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
          }
        );
        result = await res.json();

        if (result.status && result.status.id <= 2) {
          // 1 = In Queue, 2 = Processing
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          break;
        }
      }

      // Step 3: Show output
      setOutput(
        result.stdout || result.stderr || result.compile_output || "No output"
      );
    } catch (error) {
      setOutput("Error: " + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <div className="text-center pt-8 pb-6">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Code Compiler
        </h1>
        <p className="text-slate-400 text-lg">
          Write, compile, and run code online
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8 space-y-6">
        {/* Controls */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
          <label
            htmlFor="language-select"
            className="block text-sm font-semibold text-slate-200"
          >
            Select Programming Language
          </label>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <select
              id="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex-1 max-w-sm px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            >
              <option value="54">C++ (GCC 9.2.0)</option>
              <option value="50">C (GCC 9.2.0)</option>
              <option value="62">Java (OpenJDK 13.0.1)</option>
              <option value="71">Python (3.8.1)</option>
              <option value="63">JavaScript (Node.js 12.14.0)</option>
            </select>

            <button
              onClick={runCode}
              disabled={isRunning || !code.trim()}
              className={`
                px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 
                flex items-center gap-2 shadow-lg
                ${
                  isRunning || !code.trim()
                    ? "bg-slate-600 cursor-not-allowed opacity-70"
                    : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-xl"
                }
              `}
            >
              {isRunning && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              {isRunning ? "Running..." : "Run Code"}
            </button>
          </div>

          {/* Input box for stdin */}
          <div>
            <label
              htmlFor="stdin"
              className="block text-sm font-semibold text-slate-200 mt-4 mb-2"
            >
              Program Input (stdin)
            </label>
            <textarea
              id="stdin"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input values here (if required by your program)"
              className="w-full h-24 p-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Editor & Output */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Code Editor (Monaco) */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
            <label
              htmlFor="code-editor"
              className="block text-sm font-semibold text-slate-200 mb-3"
            >
              Code Editor
            </label>
            <Editor
              height="400px"
              theme="vs-dark"
              language={
                language === "54"
                  ? "cpp"
                  : language === "50"
                  ? "c"
                  : language === "62"
                  ? "java"
                  : language === "71"
                  ? "python"
                  : "javascript"
              }
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                autoClosingBrackets: "always",
                formatOnType: true,
                formatOnPaste: true,
              }}
            />
            <div className="mt-2 text-xs text-slate-400">
              Lines: {code.split("\n").length} | Characters: {code.length}
            </div>
          </div>

          {/* Output */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-200">
                Output
              </label>
              {output && output !== "Running..." && (
                <button
                  onClick={() => setOutput("")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="w-full h-96 p-4 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm overflow-auto">
              <pre className="whitespace-pre-wrap break-words">
                {output || (
                  <span className="text-slate-500 italic">
                    No output yet. Run some code to see results here.
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
