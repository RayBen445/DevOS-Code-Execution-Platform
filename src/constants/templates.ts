import { FileData } from "../types";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  files: {
    name: string;
    path: string;
    content: string;
    language: string;
  }[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank Project",
    description: "Start from scratch with a single index.html file.",
    icon: "File",
    files: [
      {
        name: "index.html",
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My DevOS Project</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #0a0a0a;
            color: white;
        }
        h1 { color: #3b82f6; }
    </style>
</head>
<body>
    <h1>Hello DevOS!</h1>
    <p>Start editing index.html to see changes.</p>
</body>
</html>`,
        language: "html"
      }
    ]
  },
  {
    id: "landing-page",
    name: "Landing Page",
    description: "A modern, responsive landing page with Tailwind CSS.",
    icon: "Globe",
    files: [
      {
        name: "index.html",
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Landing Page</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white font-sans">
    <nav class="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div class="text-2xl font-bold text-blue-500">DevOS</div>
        <div class="space-x-6">
            <a href="#" class="hover:text-blue-400 transition">Features</a>
            <a href="#" class="hover:text-blue-400 transition">Pricing</a>
            <a href="#" class="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition">Get Started</a>
        </div>
    </nav>

    <header class="py-20 px-6 text-center max-w-4xl mx-auto">
        <h1 class="text-6xl font-extrabold mb-6 leading-tight">Build faster with <span class="text-blue-500">DevOS Templates</span></h1>
        <p class="text-xl text-slate-400 mb-10">The ultimate sandbox for modern web development. No setup, just code.</p>
        <div class="flex justify-center gap-4">
            <button class="bg-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20">Start Building</button>
            <button class="bg-slate-800 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-700 transition">View Demo</button>
        </div>
    </header>

    <section class="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div class="p-8 rounded-3xl bg-slate-800/50 border border-slate-700">
            <div class="text-blue-500 text-3xl mb-4">⚡</div>
            <h3 class="text-xl font-bold mb-2">Instant Preview</h3>
            <p class="text-slate-400">See your changes in real-time as you type. No reload needed.</p>
        </div>
        <div class="p-8 rounded-3xl bg-slate-800/50 border border-slate-700">
            <div class="text-blue-500 text-3xl mb-4">📦</div>
            <h3 class="text-xl font-bold mb-2">Zero Config</h3>
            <p class="text-slate-400">Everything is pre-configured. Start with React, Tailwind, or plain HTML.</p>
        </div>
        <div class="p-8 rounded-3xl bg-slate-800/50 border border-slate-700">
            <div class="text-blue-500 text-3xl mb-4">🚀</div>
            <h3 class="text-xl font-bold mb-2">Cloud Deploy</h3>
            <p class="text-slate-400">Deploy your projects to the cloud with a single click.</p>
        </div>
    </section>
</body>
</html>`,
        language: "html"
      }
    ]
  },
  {
    id: "portfolio",
    name: "Portfolio Template",
    description: "Showcase your work with a clean, professional portfolio.",
    icon: "User",
    files: [
      {
        name: "index.html",
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-neutral-50 text-neutral-900">
    <main class="max-w-3xl mx-auto px-6 py-20">
        <header class="mb-16">
            <h1 class="text-4xl font-serif italic mb-4">Alex Dev</h1>
            <p class="text-lg text-neutral-500">Frontend Engineer & Creative Developer</p>
        </header>

        <section class="mb-20">
            <h2 class="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-8">Selected Projects</h2>
            <div class="space-y-12">
                <div class="group cursor-pointer">
                    <div class="flex justify-between items-end mb-2">
                        <h3 class="text-xl font-medium group-hover:text-blue-600 transition">DevOS Platform</h3>
                        <span class="text-sm text-neutral-400">2024</span>
                    </div>
                    <p class="text-neutral-500">A cloud-based IDE for modern web development.</p>
                </div>
                <div class="group cursor-pointer">
                    <div class="flex justify-between items-end mb-2">
                        <h3 class="text-xl font-medium group-hover:text-blue-600 transition">Lumina UI</h3>
                        <span class="text-sm text-neutral-400">2023</span>
                    </div>
                    <p class="text-neutral-500">A minimalist design system for React applications.</p>
                </div>
            </div>
        </section>

        <footer>
            <div class="h-px bg-neutral-200 mb-8"></div>
            <div class="flex justify-between text-sm text-neutral-400">
                <p>&copy; 2024 Alex Dev</p>
                <div class="space-x-4">
                    <a href="#" class="hover:text-neutral-900 transition">Twitter</a>
                    <a href="#" class="hover:text-neutral-900 transition">GitHub</a>
                </div>
            </div>
        </footer>
    </main>
</body>
</html>`,
        language: "html"
      },
      {
        name: "style.css",
        path: "style.css",
        content: `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&display=swap');

h1 {
    font-family: 'Cormorant Garamond', serif;
}`,
        language: "css"
      }
    ]
  },
  {
    id: "react-starter",
    name: "React Starter",
    description: "Simple React setup with JSX support and Babel transpilation.",
    icon: "Code2",
    files: [
      {
        name: "index.html",
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Starter</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
    <div id="root"></div>
    <script src="App.jsx" type="text/babel"></script>
</body>
</html>`,
        language: "html"
      },
      {
        name: "App.jsx",
        path: "App.jsx",
        content: `const { useState } = React;

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center">
      <h2 className="text-4xl font-bold mb-4">{count}</h2>
      <div className="flex gap-2 justify-center">
        <button 
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
        >
          -
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          React on DevOS
        </h1>
        <p className="text-zinc-400">No build step, just JSX in the browser.</p>
      </div>
      <Counter />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
        language: "javascript"
      }
    ]
  }
];
