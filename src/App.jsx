import React, { useState } from "react";
import Editor from "@monaco-editor/react";
import { Play, Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,

} from "recharts";

// 🔹 Supported Languages with Judge0 IDs
const languages = [
  { id: 54, name: "C++ (GCC 9.2.0)", monaco: "cpp" },
  { id: 50, name: "C (GCC 9.2.0)", monaco: "c" },
  { id: 62, name: "Java (OpenJDK 13.0.1)", monaco: "java" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)", monaco: "javascript" },
  { id: 71, name: "Python (3.8.1)", monaco: "python" },
];

// 🔹 Complexity Analyzer (same as before)
function analyzeComplexity(code) {
  const cleanCode = code.replace(/\s+/g, " ");

  // Detect recursion
  const functionNames = [...cleanCode.matchAll(/(\w+)\s*\(/g)].map((m) => m[1]);
  let isRecursive = false;
  for (let fn of functionNames) {
    const regex = new RegExp(`\\b${fn}\\s*\\(`);
    if ((code.match(regex) || []).length > 1) {
      isRecursive = true;
      break;
    }
  }

  // Detect halving loop (O(log n))
  const hasLogLoop =
    /\bn\s*=\s*n\s*\/\s*2\b/.test(code) ||
    /\bn\s*=\s*n\s*>>\s*1\b/.test(code) ||
    /while\s*\([^)]*\/\s*2[^)]*\)/.test(code);

  // Detect loop nesting
  let maxDepth = 0;
  let currentDepth = 0;
  const tokens = cleanCode.split(/(\{|\})/);

  for (let token of tokens) {
    if (/(for|while|do)\s*\(/.test(token)) {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    }
    if (token === "}") {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  // 🔹 Time Complexity
  let time = "O(1)";

  if (isRecursive) {
    if (/n\s*\/\s*2/.test(code) || /n\s*>>\s*1/.test(code)) {
      time = "O(log n)"; // recursive halving → binary search style
    } else if (maxDepth > 0) {
      time = "O(n * 2^n)";
    } else {
      time = "O(2^n)";
    }
  } else if (hasLogLoop) {
    if (maxDepth > 1) time = "O(n log n)"; // nested loop with halving
    else time = "O(log n)";
  } else {
    if (maxDepth === 1) time = "O(n)";
    if (maxDepth === 2) time = "O(n^2)";
    if (maxDepth === 3) time = "O(n^3)";
    if (maxDepth >= 4) time = `O(n^${maxDepth})`;
  }

  // 🔹 Space Complexity (naive)
  let space = code.includes("vector") || code.includes("new") ? "O(n)" : "O(1)";

  return { time, space };
}



// Map Big-O to generator function
const complexityFunctions = {
  "O(1)": (n) => 1,
  "O(log n)": (n) => Math.log2(n),
  "O(n)": (n) => n,
  "O(n log n)": (n) => n * Math.log2(n),
  "O(n^2)": (n) => n * n,
  "O(n^3)": (n) => n * n * n,
  "O(2^n)": (n) => Math.pow(2, n),
};

// Generate data for selected complexity
function generateData(complexity) {
  const fn = complexityFunctions[complexity];
  if (!fn) return [];

  const data = [];
  for (let n = 1; n <= 10; n++) {
    data.push({ n, steps: Math.round(fn(n)) });
  }
  return data;
}

function ComplexityChart({ analysis }) {
  const data = generateData(analysis.time); // plot based on TIME complexity

  return (
    <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-4 mt-6">
      <h2 className="text-lg font-semibold text-yellow-400 mb-2">
        Complexity Projection
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid stroke="#444" />
          <XAxis
            dataKey="n"
            stroke="#aaa"
            label={{ value: "Input Size (n)", position: "insideBottom", offset: -5, fill: "#aaa" }}
          />
          <YAxis
            stroke="#aaa"
            label={{ value: "Steps", angle: -90, position: "insideLeft", fill: "#aaa" }}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="steps"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="text-slate-400 text-sm mt-3">
        Time: <span className="text-slate-100">{analysis.time}</span> | 
        Space: <span className="text-slate-100">{analysis.space}</span>
      </div>
    </div>
  );
}
// 🔹 Main Component
export default function CodeCompiler() {
  const [language, setLanguage] = useState(languages[0]); // Default: C++
  const [code, setCode] = useState(
    `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`
  );
  const [input, setInput] = useState("2 3");
  const [output, setOutput] = useState("");
  const [analysis, setAnalysis] = useState({ time: "O(1)", space: "O(1)" });

  const runCode = async () => {
    setOutput("⏳ Running...");
    try {
      const response = await fetch(
        "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
            "x-rapidapi-key": import.meta.env.VITE_RAPIDAPI_KEY, // replace with your RapidAPI key
          },
          body: JSON.stringify({
            source_code: code,
            language_id: language.id, // 🔹 use selected language
            stdin: input,
          }),
        }
      );

     const result = await response.json();

      if (result.stderr) {
      setOutput("❌ Runtime Error:\n" + result.stderr);
      } else if (result.compile_output) {
      setOutput("⚠️ Compile Error:\n" + result.compile_output);
      } else if (result.message) {
      setOutput("ℹ️ Message:\n" + result.message);
      } else if (result.stdout) {
      setOutput(result.stdout);
      } else {
      setOutput("✅ Program ran but no output was produced.");
      }


      // Analyze complexity
      const resultAnalysis = analyzeComplexity(code);
      setAnalysis(resultAnalysis);
    } catch (err) {
      setOutput("❌ Failed to connect to Judge0 API");
    }
  };

  const clearCode = () => {
    setCode("");
    setInput("");
    setOutput("");
    setAnalysis({ time: "O(1)", space: "O(1)" });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#1e1e1e] text-white">
      {/* Editor Section */}
      <div className="flex-1 p-4">
        <div className="flex justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={runCode}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Play size={18} /> Run
            </button>
            <button
              onClick={clearCode}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
            >
              <Trash2 size={18} /> Clear
            </button>
          </div>

          {/* 🔹 Language Selector */}
          <select
            value={language.id}
            onChange={(e) => {
              const selected = languages.find((l) => l.id == e.target.value);
              setLanguage(selected);
              setCode(getDefaultTemplate(selected.monaco)); // load default template
            }}
            className="bg-[#252526] border border-[#3c3c3c] rounded-lg px-3 py-2"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <Editor
          height="70vh"
          language={language.monaco} // 🔹 Monaco language mode
          value={code}
          onChange={(value) => setCode(value)}
          theme="vs-dark"
        />

        {/* Input Box */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-blue-400">Input</h2>
          <textarea
            className="w-full p-2 mt-2 bg-[#252526] border border-[#3c3c3c] rounded-lg text-white"
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter input for program"
          />
        </div>
      </div>

      {/* Output + Complexity Section */}
      <div className="w-full md:w-1/2 p-4 border-l border-gray-700 overflow-y-auto">
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-4">
          <h2 className="text-lg font-semibold text-green-400">Output</h2>
          <pre className="mt-2 text-slate-200 whitespace-pre-wrap">
            {output || "Run the code to see output"}
          </pre>
        </div>

        {/* Static Complexity Estimate */}
        <ComplexityChart analysis={analysis} />
      </div>
    </div>
  );
}

// 🔹 Default code templates for each language
function getDefaultTemplate(lang) {
  switch (lang) {
    case "cpp":
      return `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`;
    case "c":
      return `#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`;
    case "java":
      return `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`;
    case "javascript":
      return `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim().split(" ");
const a = parseInt(input[0]);
const b = parseInt(input[1]);
console.log(a + b);`;
    case "python":
      return `a, b = map(int, input().split())
print(a + b)`;
    default:
      return "";
  }
}
