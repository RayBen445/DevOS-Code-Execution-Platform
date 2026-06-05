import { FileData } from "../types";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  tags?: string[];
  files: {
    name: string;
    path: string;
    content: string;
    language: string;
  }[];
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    id: "premium-portfolio",
    name: "DevOS Premium Portfolio",
    description: "A premium, easy-to-edit portfolio to showcase your work.",
    icon: "User",
    category: "Full Pages",
    tags: ["portfolio", "markdown", "profile"],
    files: [
      {
        name: "README.md",
        path: "/README.md",
        content: "# Premium Portfolio\n\nEdit your content visually via the editor tab.",
        language: "markdown"
      }
    ]
  },
  {
    id: "ecommerce-store",
    name: "E-Commerce Storefront",
    description: "A complete responsive e-commerce template with product grids, cart state, and modern UI.",
    icon: "Layout",
    category: "Full Pages",
    tags: ["ecommerce", "shop", "tailwind"],
    files: [
      {
        name: "index.html",
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern E-Commerce</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 font-sans">
    <nav class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="text-2xl font-black tracking-tight text-indigo-600">DevShop</div>
                <div class="hidden sm:flex space-x-8">
                    <a href="#" class="text-gray-900 font-medium">New Arrivals</a>
                    <a href="#" class="text-gray-500 hover:text-gray-900">Men</a>
                    <a href="#" class="text-gray-500 hover:text-gray-900">Women</a>
                    <a href="#" class="text-gray-500 hover:text-gray-900">Accessories</a>
                </div>
                <div class="flex items-center gap-4">
                    <button class="text-gray-500 hover:text-gray-900">Search</button>
                    <button class="relative text-gray-500 hover:text-gray-900" id="cart-btn">
                        Cart <span id="cart-count" class="absolute -top-2 -right-3 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">0</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <header class="bg-indigo-900 text-white py-24 text-center">
        <h1 class="text-5xl font-extrabold mb-4">Summer Collection 2026</h1>
        <p class="text-indigo-200 text-xl mb-8 max-w-2xl mx-auto">Discover the latest trends and elevate your style with our premium collection.</p>
        <button class="bg-white text-indigo-900 px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-lg">Shop Now</button>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="flex justify-between items-end mb-8">
            <h2 class="text-3xl font-bold text-gray-900">Trending Now</h2>
            <a href="#" class="text-indigo-600 font-semibold hover:text-indigo-700">View all &rarr;</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" id="product-grid">
            <!-- Products injected by JS -->
        </div>
    </main>
    <script src="app.js"></script>
</body>
</html>`,
        language: "html"
      },
      {
        name: "app.js",
        path: "app.js",
        content: `const products = [
    { id: 1, name: "Classic White Sneaker", price: 89, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80", category: "Shoes" },
    { id: 2, name: "Minimalist Watch", price: 145, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80", category: "Accessories" },
    { id: 3, name: "Premium Leather Tote", price: 210, image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=400&q=80", category: "Bags" },
    { id: 4, name: "Aviator Sunglasses", price: 65, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=400&q=80", category: "Accessories" }
];

let cart = 0;

function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => \`
        <div class="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div class="aspect-w-4 aspect-h-3 bg-gray-200">
                <img src="\${p.image}" alt="\${p.name}" class="object-cover w-full h-64 group-hover:scale-105 transition-transform duration-500">
            </div>
            <div class="p-5">
                <p class="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">\${p.category}</p>
                <h3 class="text-lg font-bold text-gray-900 mb-2">\${p.name}</h3>
                <div class="flex items-center justify-between">
                    <span class="text-xl font-black text-gray-900">$\${p.price}</span>
                    <button onclick="addToCart()" class="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition">Add</button>
                </div>
            </div>
        </div>
    \`).join('');
}

window.addToCart = function() {
    cart++;
    const badge = document.getElementById('cart-count');
    badge.textContent = cart;
    badge.classList.add('animate-ping');
    setTimeout(() => badge.classList.remove('animate-ping'), 300);
};

renderProducts();`,
        language: "javascript"
      }
    ]
  },
  {
    id: "nextjs-starter",
    name: "Next.js Sandbox",
    description: "A minimal Next.js app to test the terminal and build pipeline.",
    icon: "Rocket",
    tags: ["react", "nextjs", "starter"],
    files: [
      {
        name: "package.json",
        path: "package.json",
        content: `{
  "name": "nextjs-sandbox",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "react-dom": "latest"
  }
}`,
        language: "json"
      },
      {
        name: "next.config.mjs",
        path: "next.config.mjs",
        content: `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;`,
        language: "javascript"
      },
      {
        name: "page.jsx",
        path: "app/page.jsx",
        content: `export default function Home() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "40px", textAlign: "center", background: "#000", color: "#fff", minHeight: "100vh" }}>
      <h1>Hello from Next.js on DevOS! 🚀</h1>
      <p>Open the Terminal, type <code>npm install</code>, then <code>npm run build</code> to test!</p>
    </div>
  );
}`,
        language: "javascript"
      },
      {
        name: "layout.jsx",
        path: "app/layout.jsx",
        content: `export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}`,
        language: "javascript"
      }
    ]
  },
  {
    id: "blank",
    name: "Blank Project",
    description: "Start from scratch with a single index.html file.",
    icon: "File",
    tags: ["blank", "html", "css"],
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
    id: "vanilla-js",
    name: "Vanilla JS Starter",
    description: "A classic web project with separate HTML, CSS, and JavaScript files.",
    icon: "FileCode",
    tags: ["javascript", "html", "css"],
    files: [
      {
        name: "index.html",
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS Project</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Vanilla JS Starter</h1>
        <p>Edit HTML, CSS, and JS separately!</p>
        <button id="click-btn">Click Me</button>
        <p id="message"></p>
    </div>
    <script src="index.js"></script>
</body>
</html>`,
        language: "html"
      },
      {
        name: "styles.css",
        path: "styles.css",
        content: `body {
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background: #0a0a0a;
    color: white;
}

.container {
    text-align: center;
    background: #111;
    padding: 3rem;
    border-radius: 1rem;
    border: 1px solid #222;
}

button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
    margin-top: 1rem;
}

button:hover {
    background: #2563eb;
}

#message {
    margin-top: 1rem;
    color: #9ca3af;
}`,
        language: "css"
      },
      {
        name: "script.js",
        path: "script.js",
        content: `let clicks = 0;
const btn = document.getElementById('click-btn');
const msg = document.getElementById('message');

btn.addEventListener('click', () => {
    clicks++;
    msg.textContent = \`You clicked the button \${clicks} time\${clicks === 1 ? '' : 's'}.\`;
});`,
        language: "javascript"
      }
    ]
  },
  {
    id: "landing-page",
    name: "Landing Page",
    description: "A modern, responsive landing page with Tailwind CSS.",
    icon: "Globe",
    tags: ["landing", "tailwind", "html"],
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
    id: "react-starter",
    name: "React Starter",
    description: "Simple React setup with JSX support and Babel transpilation.",
    icon: "Code2",
    tags: ["react", "jsx", "babel"],
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
  },
  {
    id: "saas-dashboard-pro",
    name: "SaaS Dashboard Pro",
    description: "A high-quality SaaS dashboard starter with KPI cards, activity feed, and responsive navigation.",
    icon: "LayoutDashboard",
    tags: ["dashboard", "saas", "tailwind"],
    files: [
      {
        name: "index.html",
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SaaS Dashboard Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div class="min-h-screen grid lg:grid-cols-[260px_1fr]">
    <aside class="border-r border-border-base p-5 space-y-4">
      <h1 class="text-xl font-bold text-blue-400">DevOS Analytics</h1>
      <nav class="space-y-2 text-sm">
        <a class="block px-3 py-2 rounded-lg bg-blue-600/20 text-blue-300">Overview</a>
        <a class="block px-3 py-2 rounded-lg hover:bg-white/5 text-slate-300">Customers</a>
        <a class="block px-3 py-2 rounded-lg hover:bg-white/5 text-slate-300">Revenue</a>
        <a class="block px-3 py-2 rounded-lg hover:bg-white/5 text-slate-300">Deployments</a>
      </nav>
    </aside>
    <main class="p-6 lg:p-8 space-y-6">
      <header class="flex items-center justify-between">
        <div>
          <p class="text-slate-400 text-sm">Welcome back</p>
          <h2 class="text-2xl font-bold">Your growth dashboard</h2>
        </div>
        <button class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold">Create report</button>
      </header>
      <section class="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <article class="p-4 rounded-2xl border border-border-base bg-white/5"><p class="text-xs text-slate-400">MRR</p><p class="text-2xl font-bold mt-1">$42,890</p></article>
        <article class="p-4 rounded-2xl border border-border-base bg-white/5"><p class="text-xs text-slate-400">New Users</p><p class="text-2xl font-bold mt-1">1,284</p></article>
        <article class="p-4 rounded-2xl border border-border-base bg-white/5"><p class="text-xs text-slate-400">Churn</p><p class="text-2xl font-bold mt-1">1.9%</p></article>
        <article class="p-4 rounded-2xl border border-border-base bg-white/5"><p class="text-xs text-slate-400">Deploy Success</p><p class="text-2xl font-bold mt-1">99.8%</p></article>
      </section>
      <section class="rounded-2xl border border-border-base bg-white/5 p-5">
        <h3 class="font-semibold mb-3">Recent activity</h3>
        <ul class="space-y-2 text-sm text-slate-300">
          <li>✅ Production deployment completed · 2m ago</li>
          <li>🧾 New yearly subscription · 14m ago</li>
          <li>🔁 Incident auto-resolved · 1h ago</li>
        </ul>
      </section>
    </main>
  </div>
</body>
</html>`,
      },
    ],
  },
  {
    id: "devos-academy",
    name: "DevOS Academy — School Platform",
    description: "A full school/messaging platform: sign-up, login, file uploads, live chat, AI tutoring, email notifications, and analytics — all plugins active.",
    icon: "GraduationCap",
    tags: ["academy", "fullstack", "devos"],
    files: [
      {
        name: "index.html",
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>DevOS Academy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            accent: '#6366f1',
          }
        }
      }
    }
  </script>
  <style>
    :root { color-scheme: dark; }
    body { background: #050510; font-family: system-ui, -apple-system, sans-serif; }
    .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
    .chat-bubble { max-width: 75%; word-break: break-word; }
    #chat-messages { scroll-behavior: smooth; }
    .tab-btn.active { background: #6366f1; color: #fff; }
    .tab-btn { transition: all .2s; }
    .upload-zone { border: 2px dashed rgba(255,255,255,0.15); transition: border-color .2s; }
    .upload-zone.drag { border-color: #6366f1; background: rgba(99,102,241,0.08); }
    .spinner { border: 2px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body class="text-white min-h-screen">

<!-- ═══════════════════════════  AUTH SCREEN  ═══════════════════════════════ -->
<div id="screen-auth" class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-sm glass rounded-3xl p-8 space-y-6">
    <div class="text-center">
      <div class="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 text-2xl">🎓</div>
      <h1 class="text-2xl font-black">DevOS Academy</h1>
      <p class="text-white/40 text-sm mt-1">Learn, build, and collaborate.</p>
    </div>
    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-white/5 rounded-xl">
      <button class="tab-btn active flex-1 py-2 rounded-lg text-sm font-semibold" onclick="switchAuthTab('login')">Sign In</button>
      <button class="tab-btn flex-1 py-2 rounded-lg text-sm font-semibold" onclick="switchAuthTab('signup')">Sign Up</button>
    </div>
    <!-- Form -->
    <form id="auth-form" onsubmit="handleAuth(event)" class="space-y-3">
      <div id="signup-extra" class="hidden">
        <input id="auth-name" type="text" placeholder="Full name" class="w-full px-4 py-3 bg-white/5 border border-border-base rounded-xl text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"/>
      </div>
      <input id="auth-email" type="email" placeholder="Email address" required class="w-full px-4 py-3 bg-white/5 border border-border-base rounded-xl text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"/>
      <input id="auth-password" type="password" placeholder="Password" required minlength="6" class="w-full px-4 py-3 bg-white/5 border border-border-base rounded-xl text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500"/>
      <button type="submit" id="auth-submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
        <span id="auth-btn-label">Sign In</span>
        <div id="auth-spinner" class="hidden w-4 h-4 spinner"></div>
      </button>
    </form>
    <p id="auth-error" class="text-red-400 text-xs text-center hidden"></p>
    <p class="text-white/25 text-xs text-center">All DevOS plugins are active in this project.</p>
  </div>
</div>

<!-- ═══════════════════════════  MAIN APP  ══════════════════════════════════ -->
<div id="screen-app" class="hidden min-h-screen flex flex-col">

  <!-- Top bar -->
  <header class="glass border-b border-border-base px-4 py-3 flex items-center justify-between sticky top-0 z-40">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-black">🎓</div>
      <span class="font-bold text-sm hidden sm:block">DevOS Academy</span>
    </div>
    <nav class="flex gap-1">
      <button class="tab-btn active px-3 py-1.5 rounded-lg text-xs font-semibold" onclick="showTab('feed')">📚 Feed</button>
      <button class="tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold" onclick="showTab('chat')">💬 Chat</button>
      <button class="tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold" onclick="showTab('files')">📁 Files</button>
      <button class="tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold" onclick="showTab('ai')">🤖 AI</button>
      <button class="tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold" onclick="showTab('profile')">👤 Me</button>
    </nav>
    <button onclick="signOut()" class="text-xs text-white/30 hover:text-white transition-colors">Sign out</button>
  </header>

  <!-- ── FEED TAB ──────────────────────────────────────────────────────── -->
  <div id="tab-feed" class="tab-content flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
    <h2 class="font-bold text-lg">Class Feed</h2>
    <!-- Post composer -->
    <div class="glass rounded-2xl p-4 space-y-3">
      <textarea id="post-text" rows="3" placeholder="Share an update, question, or resource with your class…" class="w-full bg-transparent text-sm placeholder-white/30 resize-none focus:outline-none"></textarea>
      <div class="flex items-center justify-between">
        <label class="text-xs text-white/40 cursor-pointer hover:text-white transition-colors">
          📎 Attach file
          <input type="file" id="post-file" class="hidden" onchange="handlePostFile(this)"/>
        </label>
        <button onclick="submitPost()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all">Post</button>
      </div>
      <div id="post-file-preview" class="hidden text-xs text-indigo-300"></div>
    </div>
    <!-- Posts list -->
    <div id="posts-list" class="space-y-3">
      <p class="text-white/25 text-sm text-center py-8">No posts yet. Be the first to share!</p>
    </div>
  </div>

  <!-- ── CHAT TAB ──────────────────────────────────────────────────────── -->
  <div id="tab-chat" class="tab-content hidden flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4" style="height:calc(100vh - 64px)">
    <h2 class="font-bold text-lg mb-3">Live Class Chat</h2>
    <div id="chat-messages" class="flex-1 overflow-y-auto space-y-3 pr-1 mb-4" style="max-height: calc(100vh - 220px)">
      <p class="text-white/25 text-sm text-center py-8" id="chat-empty">No messages yet.</p>
    </div>
    <form onsubmit="sendChat(event)" class="flex gap-2">
      <input id="chat-input" type="text" placeholder="Type a message…" class="flex-1 px-4 py-3 glass rounded-2xl text-sm placeholder-white/30 focus:outline-none focus:border-indigo-500 border border-transparent"/>
      <button type="submit" class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all">Send</button>
    </form>
  </div>

  <!-- ── FILES TAB ─────────────────────────────────────────────────────── -->
  <div id="tab-files" class="tab-content hidden max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
    <h2 class="font-bold text-lg">Class Files</h2>
    <!-- Upload zone -->
    <div id="upload-zone" class="upload-zone rounded-2xl p-8 text-center cursor-pointer"
         onclick="document.getElementById('file-input').click()"
         ondragover="event.preventDefault(); this.classList.add('drag')"
         ondragleave="this.classList.remove('drag')"
         ondrop="handleDrop(event)">
      <div class="text-4xl mb-3">📤</div>
      <p class="font-semibold text-white/70">Drop files here or click to upload</p>
      <p class="text-white/30 text-xs mt-1">Images, PDFs, docs — max 10 MB</p>
      <input type="file" id="file-input" class="hidden" multiple onchange="handleFiles(this.files)"/>
    </div>
    <div id="upload-progress" class="hidden glass rounded-xl p-3 text-sm text-white/60 flex items-center gap-3">
      <div class="w-4 h-4 spinner flex-shrink-0"></div>
      <span id="upload-progress-text">Uploading…</span>
    </div>
    <!-- Files list -->
    <div id="files-list" class="space-y-2">
      <p class="text-white/25 text-sm text-center py-8" id="files-empty">No files uploaded yet.</p>
    </div>
  </div>

  <!-- ── AI TAB ────────────────────────────────────────────────────────── -->
  <div id="tab-ai" class="tab-content hidden max-w-2xl mx-auto w-full px-4 py-6 space-y-4 flex flex-col" style="height:calc(100vh - 64px)">
    <div class="flex items-center justify-between">
      <h2 class="font-bold text-lg">AI Tutor</h2>
      <span class="text-xs text-indigo-400 glass px-2 py-1 rounded-full">Powered by DevOS AI</span>
    </div>
    <div id="ai-messages" class="flex-1 overflow-y-auto space-y-4 pb-4" style="max-height: calc(100vh - 240px)">
      <div class="chat-bubble glass rounded-2xl px-4 py-3 text-sm text-white/70">
        👋 Hi! I'm your AI tutor. Ask me anything — math, coding, science, writing, or any subject!
      </div>
    </div>
    <form onsubmit="askAI(event)" class="flex gap-2">
      <input id="ai-input" type="text" placeholder="Ask the AI tutor anything…" class="flex-1 px-4 py-3 glass rounded-2xl text-sm placeholder-white/30 focus:outline-none border border-transparent focus:border-indigo-500"/>
      <button type="submit" id="ai-send" class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-sm transition-all">Ask</button>
    </form>
  </div>

  <!-- ── PROFILE TAB ───────────────────────────────────────────────────── -->
  <div id="tab-profile" class="tab-content hidden max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
    <h2 class="font-bold text-lg">My Profile</h2>
    <div class="glass rounded-2xl p-6 flex items-center gap-5">
      <div id="profile-avatar" class="w-16 h-16 rounded-2xl bg-indigo-600/40 flex items-center justify-center text-2xl font-black text-indigo-300">?</div>
      <div>
        <p id="profile-name" class="font-bold text-lg">—</p>
        <p id="profile-email" class="text-white/40 text-sm">—</p>
      </div>
      <label class="ml-auto cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
        Change photo
        <input type="file" accept="image/*" class="hidden" onchange="handleAvatarUpload(this)"/>
      </label>
    </div>
    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3">
      <div class="glass rounded-2xl p-4 text-center">
        <p id="stat-posts" class="text-2xl font-black text-indigo-400">0</p>
        <p class="text-white/40 text-xs mt-1">Posts</p>
      </div>
      <div class="glass rounded-2xl p-4 text-center">
        <p id="stat-files" class="text-2xl font-black text-indigo-400">0</p>
        <p class="text-white/40 text-xs mt-1">Files</p>
      </div>
      <div class="glass rounded-2xl p-4 text-center">
        <p id="stat-chats" class="text-2xl font-black text-indigo-400">0</p>
        <p class="text-white/40 text-xs mt-1">Messages</p>
      </div>
    </div>
    <!-- Notifications test -->
    <div class="glass rounded-2xl p-5 space-y-3">
      <p class="font-semibold text-sm">📧 Email Notifications (DevOS Email)</p>
      <p class="text-white/40 text-xs">Send yourself a welcome / test email via the DevOS Email plugin.</p>
      <button onclick="sendTestEmail()" class="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-xl text-xs font-bold hover:bg-yellow-500/30 transition-all">
        Send test email
      </button>
    </div>
    <!-- Analytics -->
    <div class="glass rounded-2xl p-5 space-y-2">
      <p class="font-semibold text-sm">📊 Analytics (DevOS Analytics)</p>
      <div id="analytics-log" class="text-xs text-white/30 space-y-1 max-h-32 overflow-y-auto"></div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════  SCRIPTS  ════════════════════════════════ -->
<script src="/devos-sdk.js"></script>
<script>
// ── Bootstrap DevOS SDKs ─────────────────────────────────────────────────────
const AUTH_KEY     = (typeof DEVOS_AUTH_KEY     !== 'undefined' ? DEVOS_AUTH_KEY     : '') || '';
const DB_KEY       = (typeof DEVOS_DB_KEY       !== 'undefined' ? DEVOS_DB_KEY       : '') || '';
const STORAGE_KEY  = (typeof DEVOS_STORAGE_KEY  !== 'undefined' ? DEVOS_STORAGE_KEY  : '') || '';
const EMAIL_KEY    = (typeof DEVOS_EMAIL_KEY    !== 'undefined' ? DEVOS_EMAIL_KEY    : '') || '';
const RT_KEY       = (typeof DEVOS_RT_KEY       !== 'undefined' ? DEVOS_RT_KEY       : '') || '';
const AI_KEY       = (typeof DEVOS_AI_KEY       !== 'undefined' ? DEVOS_AI_KEY       : '') || '';
const ANALYTICS_KEY= (typeof DEVOS_ANALYTICS_KEY!== 'undefined' ? DEVOS_ANALYTICS_KEY: '') || '';

const auth      = DevOS.auth(AUTH_KEY);
const db        = DevOS.db(DB_KEY);
const storage   = DevOS.storage(STORAGE_KEY);
const email     = DevOS.email(EMAIL_KEY);
const realtime  = DevOS.realtime(RT_KEY);
const ai        = DevOS.ai(AI_KEY);
const analytics = DevOS.analytics(ANALYTICS_KEY);

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser  = null;
let authMode     = 'login';
let postFile     = null;
let myPostCount  = 0;
let myFileCount  = 0;
let myChatCount  = 0;

// ── Auth helpers ──────────────────────────────────────────────────────────────
function switchAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('#screen-auth .tab-btn').forEach((b,i) => {
    b.classList.toggle('active', (mode==='login' && i===0) || (mode==='signup' && i===1));
  });
  document.getElementById('signup-extra').classList.toggle('hidden', mode === 'login');
  document.getElementById('auth-btn-label').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
}

async function handleAuth(e) {
  e.preventDefault();
  const emailVal = document.getElementById('auth-email').value.trim();
  const pass     = document.getElementById('auth-password').value;
  const name     = document.getElementById('auth-name')?.value?.trim() || emailVal.split('@')[0];
  const errEl    = document.getElementById('auth-error');
  const spinner  = document.getElementById('auth-spinner');
  errEl.classList.add('hidden');
  spinner.classList.remove('hidden');
  try {
    if (authMode === 'signup') {
      currentUser = await auth.signUp(emailVal, pass, { displayName: name });
      // Send welcome email via DevOS Email plugin
      await email.send({ to: emailVal, subject: 'Welcome to DevOS Academy 🎓', html: \`<h2>Welcome, \${name}!</h2><p>Your DevOS Academy account is ready. Start learning, sharing, and collaborating!</p>\` }).catch(()=>{});
      analytics.track('signup', { email: emailVal });
    } else {
      currentUser = await auth.signIn(emailVal, pass);
      analytics.track('login', { email: emailVal });
    }
    enterApp();
  } catch(err) {
    errEl.textContent = err.message || 'Authentication failed.';
    errEl.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
  }
}

function signOut() {
  auth.signOut();
  currentUser = null;
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-auth').classList.remove('hidden');
  analytics.track('logout');
}

function enterApp() {
  document.getElementById('screen-auth').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student';
  document.getElementById('profile-name').textContent  = displayName;
  document.getElementById('profile-email').textContent = currentUser?.email || '';
  document.getElementById('profile-avatar').textContent = displayName[0]?.toUpperCase() || '?';
  loadPosts();
  loadFiles();
  subscribeChat();
  analytics.track('app_open', { uid: currentUser?.uid });
}

// Check for existing session
auth.onAuthStateChanged(user => {
  if (user) { currentUser = user; enterApp(); }
});

// ── Tab navigation ────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('nav .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  document.querySelectorAll('nav .tab-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name.slice(0,3))) b.classList.add('active');
  });
  analytics.track('tab_view', { tab: name });
}

// ── FEED ──────────────────────────────────────────────────────────────────────
async function loadPosts() {
  try {
    const posts = await db.collection('academy_posts').orderBy('createdAt', 'desc').limit(30).get();
    renderPosts(posts);
  } catch(e) { /* demo mode */ }
}

function renderPosts(posts) {
  const list = document.getElementById('posts-list');
  if (!posts || !posts.length) return;
  list.innerHTML = '';
  myPostCount = 0;
  posts.forEach(p => {
    if (p.uid === currentUser?.uid) myPostCount++;
    const div = document.createElement('div');
    div.className = 'glass rounded-2xl p-4 space-y-2';
    div.innerHTML = \`
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-indigo-600/40 flex items-center justify-center text-xs font-bold text-indigo-300">\${(p.authorName||'?')[0]?.toUpperCase()}</div>
        <span class="text-sm font-semibold">\${p.authorName || 'Student'}</span>
        <span class="text-white/25 text-xs ml-auto">\${formatTime(p.createdAt)}</span>
      </div>
      <p class="text-white/70 text-sm leading-relaxed">\${escHtml(p.text || '')}</p>
      \${p.fileUrl ? \`<a href="\${p.fileUrl}" target="_blank" class="text-indigo-400 text-xs hover:underline">📎 \${escHtml(p.fileName||'Attachment')}</a>\` : ''}
    \`;
    list.appendChild(div);
  });
  document.getElementById('stat-posts').textContent = myPostCount;
}

function handlePostFile(input) {
  postFile = input.files[0] || null;
  const prev = document.getElementById('post-file-preview');
  if (postFile) {
    prev.textContent = '📎 ' + postFile.name;
    prev.classList.remove('hidden');
  } else {
    prev.classList.add('hidden');
  }
}

async function submitPost() {
  const text = document.getElementById('post-text').value.trim();
  if (!text && !postFile) return alert('Write something or attach a file first.');
  let fileUrl = '', fileName = '';
  if (postFile) {
    try {
      const path = \`academy/posts/\${Date.now()}-\${postFile.name}\`;
      const result = await storage.upload(postFile, path);
      fileUrl = result.url || result.publicUrl || '';
      fileName = postFile.name;
    } catch(e) { alert('File upload failed: ' + e.message); return; }
  }
  try {
    await db.collection('academy_posts').add({
      text, fileUrl, fileName,
      authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
      uid: currentUser?.uid,
      createdAt: Date.now(),
    });
    document.getElementById('post-text').value = '';
    postFile = null;
    document.getElementById('post-file-preview').classList.add('hidden');
    analytics.track('post_created', { hasFile: !!fileUrl });
    await loadPosts();
  } catch(e) { alert('Failed to post: ' + e.message); }
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
let chatUnsub = null;
function subscribeChat() {
  try {
    chatUnsub = realtime.subscribe('academy_chat', (messages) => {
      renderChat(messages);
    });
  } catch(e) {
    // Fallback: poll db every 3s
    loadChatMessages();
    setInterval(loadChatMessages, 3000);
  }
}

async function loadChatMessages() {
  try {
    const msgs = await db.collection('academy_chat').orderBy('createdAt', 'asc').limit(50).get();
    renderChat(msgs);
  } catch(e) { /* demo */ }
}

function renderChat(messages) {
  if (!messages || !messages.length) return;
  const container = document.getElementById('chat-messages');
  const empty = document.getElementById('chat-empty');
  if (empty) empty.remove();
  container.innerHTML = '';
  myChatCount = 0;
  messages.forEach(m => {
    const isMine = m.uid === currentUser?.uid;
    if (isMine) myChatCount++;
    const wrap = document.createElement('div');
    wrap.className = \`flex \${isMine ? 'justify-end' : 'justify-start'} items-end gap-2\`;
    wrap.innerHTML = \`
      \${!isMine ? \`<div class="w-6 h-6 rounded-lg bg-indigo-600/40 flex items-center justify-center text-xs text-indigo-300 flex-shrink-0">\${(m.authorName||'?')[0]?.toUpperCase()}</div>\` : ''}
      <div class="chat-bubble \${isMine ? 'bg-indigo-600 text-white' : 'glass text-white/80'} rounded-2xl \${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'} px-4 py-2.5 text-sm">
        \${!isMine ? \`<p class="text-indigo-400 text-xs font-semibold mb-1">\${escHtml(m.authorName||'Student')}</p>\` : ''}
        <p>\${escHtml(m.text||'')}</p>
        <p class="text-white/30 text-[10px] mt-1 \${isMine ? 'text-right' : ''}">\${formatTime(m.createdAt)}</p>
      </div>
    \`;
    container.appendChild(wrap);
  });
  container.scrollTop = container.scrollHeight;
  document.getElementById('stat-chats').textContent = myChatCount;
}

async function sendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  const msg = {
    text,
    authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
    uid: currentUser?.uid,
    createdAt: Date.now(),
  };
  try {
    await realtime.publish('academy_chat', msg);
  } catch(e) {
    // Fallback to db
    await db.collection('academy_chat').add(msg).catch(()=>{});
    await loadChatMessages();
  }
  analytics.track('chat_message_sent');
}

// ── FILES ─────────────────────────────────────────────────────────────────────
async function loadFiles() {
  try {
    const files = await db.collection('academy_files').orderBy('createdAt', 'desc').limit(30).get();
    renderFiles(files);
  } catch(e) { /* demo */ }
}

function renderFiles(files) {
  const list = document.getElementById('files-list');
  if (!files || !files.length) return;
  const empty = document.getElementById('files-empty');
  if (empty) empty.remove();
  list.innerHTML = '';
  myFileCount = 0;
  files.forEach(f => {
    if (f.uid === currentUser?.uid) myFileCount++;
    const div = document.createElement('div');
    div.className = 'glass rounded-xl p-3 flex items-center gap-3';
    const icon = f.type?.startsWith('image') ? '🖼️' : f.name?.endsWith('.pdf') ? '📄' : '📎';
    div.innerHTML = \`
      <span class="text-2xl">\${icon}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">\${escHtml(f.name||'File')}</p>
        <p class="text-white/30 text-xs">\${escHtml(f.uploaderName||'Student')} · \${formatTime(f.createdAt)}</p>
      </div>
      <a href="\${f.url}" target="_blank" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">Open ↗</a>
    \`;
    list.appendChild(div);
  });
  document.getElementById('stat-files').textContent = myFileCount;
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  handleFiles(e.dataTransfer.files);
}

async function handleFiles(fileList) {
  if (!fileList || !fileList.length) return;
  const progressEl = document.getElementById('upload-progress');
  const progressText = document.getElementById('upload-progress-text');
  progressEl.classList.remove('hidden');
  for (const file of fileList) {
    if (file.size > 10 * 1024 * 1024) { alert(file.name + ' is too large (max 10 MB)'); continue; }
    progressText.textContent = \`Uploading \${file.name}…\`;
    try {
      const path = \`academy/files/\${Date.now()}-\${file.name}\`;
      const result = await storage.upload(file, path);
      const url = result.url || result.publicUrl || '';
      await db.collection('academy_files').add({
        name: file.name, url, type: file.type, size: file.size,
        uploaderName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student',
        uid: currentUser?.uid, createdAt: Date.now(),
      });
      analytics.track('file_uploaded', { name: file.name, size: file.size });
    } catch(err) { alert('Upload failed: ' + err.message); }
  }
  progressEl.classList.add('hidden');
  await loadFiles();
}

async function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const path = \`academy/avatars/\${currentUser?.uid || Date.now()}\`;
    const result = await storage.upload(file, path);
    const url = result.url || result.publicUrl || '';
    const avatarEl = document.getElementById('profile-avatar');
    avatarEl.innerHTML = \`<img src="\${url}" class="w-full h-full object-cover rounded-2xl"/>\`;
    analytics.track('avatar_updated');
  } catch(e) { alert('Avatar upload failed: ' + e.message); }
}

// ── AI TUTOR ──────────────────────────────────────────────────────────────────
async function askAI(e) {
  e.preventDefault();
  const input   = document.getElementById('ai-input');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';

  const container = document.getElementById('ai-messages');
  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'flex justify-end';
  userBubble.innerHTML = \`<div class="chat-bubble bg-indigo-600 rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">\${escHtml(question)}</div>\`;
  container.appendChild(userBubble);

  // Loading bubble
  const loadBubble = document.createElement('div');
  loadBubble.id = 'ai-thinking';
  loadBubble.className = 'flex justify-start';
  loadBubble.innerHTML = \`<div class="glass rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-white/40 flex items-center gap-2"><div class="w-3 h-3 spinner"></div> Thinking…</div>\`;
  container.appendChild(loadBubble);
  container.scrollTop = container.scrollHeight;

  try {
    const response = await ai.complete({
      prompt: question,
      systemPrompt: 'You are a helpful and encouraging school tutor. Give clear, concise answers suitable for students. Use emojis where helpful.',
      maxTokens: 400,
    });
    loadBubble.remove();
    const aiBubble = document.createElement('div');
    aiBubble.className = 'flex justify-start';
    aiBubble.innerHTML = \`<div class="chat-bubble glass rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-white/80 leading-relaxed">\${escHtml(response.text || response.content || 'No response')}</div>\`;
    container.appendChild(aiBubble);
    analytics.track('ai_query', { length: question.length });
  } catch(err) {
    loadBubble.remove();
    const errBubble = document.createElement('div');
    errBubble.className = 'flex justify-start';
    errBubble.innerHTML = \`<div class="chat-bubble glass rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-red-400">${'⚠️'} AI unavailable: \${escHtml(err.message)}</div>\`;
    container.appendChild(errBubble);
  }
  container.scrollTop = container.scrollHeight;
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────
async function sendTestEmail() {
  if (!currentUser?.email) return alert('No email found.');
  try {
    await email.send({
      to: currentUser.email,
      subject: 'DevOS Academy — Test Email ✅',
      html: \`<h2>It works! 🎉</h2><p>Your DevOS Email plugin is configured correctly for this project.</p><p>Sent from DevOS Academy.</p>\`,
    });
    alert('Test email sent to ' + currentUser.email);
    analytics.track('test_email_sent');
  } catch(e) { alert('Email failed: ' + e.message); }
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
const origTrack = analytics.track.bind(analytics);
const analyticsLog = document.getElementById('analytics-log');
analytics.track = function(event, props) {
  origTrack(event, props);
  const li = document.createElement('div');
  li.textContent = \`[\${new Date().toLocaleTimeString()}] \${event}\${props ? ' ' + JSON.stringify(props) : ''}\`;
  analyticsLog.prepend(li);
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? ts : ts?.seconds ? ts.seconds * 1000 : ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>
</body>
</html>`
      },
      {
        name: "devos-sdk.js",
        path: "devos-sdk.js",
        language: "javascript",
        content: `/**
 * DevOS Universal SDK — stub used by the Academy template.
 * When you install DevOS plugins in the IDE, real env keys are injected and
 * the API calls go to the live DevOS backend at api.devos.name.ng.
 *
 * Without plugin keys every method falls back to localStorage so the UI
 * still works for demos / previews.
 */
(function (global) {
  'use strict';

  const BASE = 'https://api.devos.name.ng/plugins';

  function headers(key) {
    return { 'Content-Type': 'application/json', 'X-DevOS-Key': key || '' };
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  function AuthSDK(key) {
    this._key = key;
    this._listeners = [];
    this._user = JSON.parse(localStorage.getItem('devos_auth_user') || 'null');
  }
  AuthSDK.prototype.signUp = async function (email, password, meta) {
    if (!this._key) {
      const u = { uid: 'demo-' + Date.now(), email, displayName: meta?.displayName || email.split('@')[0] };
      this._setUser(u); return u;
    }
    const r = await fetch(BASE + '/auth/v1/signup', { method:'POST', headers: headers(this._key), body: JSON.stringify({ email, password, ...meta }) });
    if (!r.ok) throw new Error((await r.json()).message || 'Sign-up failed');
    const u = await r.json(); this._setUser(u); return u;
  };
  AuthSDK.prototype.signIn = async function (email, password) {
    if (!this._key) {
      const u = { uid: 'demo-' + Date.now(), email, displayName: email.split('@')[0] };
      this._setUser(u); return u;
    }
    const r = await fetch(BASE + '/auth/v1/signin', { method:'POST', headers: headers(this._key), body: JSON.stringify({ email, password }) });
    if (!r.ok) throw new Error((await r.json()).message || 'Sign-in failed');
    const u = await r.json(); this._setUser(u); return u;
  };
  AuthSDK.prototype.signOut = function () { this._setUser(null); };
  AuthSDK.prototype.currentUser = function () { return this._user; };
  AuthSDK.prototype.onAuthStateChanged = function (cb) {
    this._listeners.push(cb); cb(this._user);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  };
  AuthSDK.prototype._setUser = function (u) {
    this._user = u;
    if (u) localStorage.setItem('devos_auth_user', JSON.stringify(u));
    else localStorage.removeItem('devos_auth_user');
    this._listeners.forEach(l => l(u));
  };

  // ── Database ─────────────────────────────────────────────────────────────
  function DBSDK(key) { this._key = key; this._store = {}; }
  DBSDK.prototype.collection = function (name) {
    const key = this._key, store = this._store;
    if (!store[name]) store[name] = JSON.parse(localStorage.getItem('devos_db_' + name) || '[]');
    const save = () => localStorage.setItem('devos_db_' + name, JSON.stringify(store[name]));
    const col = {
      _q: { order: null, dir: 'asc', lim: null },
      orderBy(field, dir) { col._q.order = field; col._q.dir = dir || 'asc'; return col; },
      limit(n) { col._q.lim = n; return col; },
      add: async function (data) {
        if (key) {
          const r = await fetch(BASE + '/db/v1/' + name, { method:'POST', headers: headers(key), body: JSON.stringify(data) });
          if (!r.ok) throw new Error((await r.json()).message || 'Add failed');
          return r.json();
        }
        const doc = { id: 'local-' + Date.now() + Math.random().toString(36).slice(2), ...data };
        store[name].push(doc); save(); return doc;
      },
      get: async function () {
        if (key) {
          const qs = col._q.order ? '?orderBy=' + col._q.order + '&dir=' + col._q.dir + (col._q.lim ? '&limit=' + col._q.lim : '') : '';
          const r = await fetch(BASE + '/db/v1/' + name + qs, { headers: headers(key) });
          if (!r.ok) throw new Error((await r.json()).message || 'Get failed');
          return r.json();
        }
        let arr = [...(store[name] || [])];
        if (col._q.order) arr.sort((a, b) => {
          const av = a[col._q.order], bv = b[col._q.order];
          return col._q.dir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
        });
        if (col._q.lim) arr = arr.slice(0, col._q.lim);
        return arr;
      },
    };
    return col;
  };

  // ── Storage ───────────────────────────────────────────────────────────────
  function StorageSDK(key) { this._key = key; }
  StorageSDK.prototype.upload = async function (file, path) {
    if (this._key) {
      const form = new FormData(); form.append('file', file); form.append('path', path);
      const r = await fetch(BASE + '/storage/v1/upload', { method:'POST', headers: { 'X-DevOS-Key': this._key }, body: form });
      if (!r.ok) throw new Error((await r.json()).message || 'Upload failed');
      return r.json();
    }
    // Fallback: create a local object URL
    return { url: URL.createObjectURL(file), publicUrl: URL.createObjectURL(file) };
  };

  // ── Email ─────────────────────────────────────────────────────────────────
  function EmailSDK(key) { this._key = key; }
  EmailSDK.prototype.send = async function (opts) {
    if (!this._key) { console.log('[DevOS Email] Demo mode — would send:', opts); return { ok: true }; }
    const r = await fetch(BASE + '/email/v1/send', { method:'POST', headers: headers(this._key), body: JSON.stringify(opts) });
    if (!r.ok) throw new Error((await r.json()).message || 'Email failed');
    return r.json();
  };

  // ── Realtime ──────────────────────────────────────────────────────────────
  function RealtimeSDK(key) { this._key = key; this._cbs = {}; }
  RealtimeSDK.prototype.subscribe = function (channel, cb) {
    if (!this._key) throw new Error('No Realtime key — using DB fallback');
    const ws = new WebSocket('wss://rt.devos.name.ng?key=' + this._key + '&channel=' + channel);
    ws.onmessage = e => { try { cb(JSON.parse(e.data)); } catch(err) {} };
    return () => ws.close();
  };
  RealtimeSDK.prototype.publish = async function (channel, data) {
    if (!this._key) throw new Error('No Realtime key');
    const r = await fetch(BASE + '/realtime/v1/publish', { method:'POST', headers: headers(this._key), body: JSON.stringify({ channel, data }) });
    if (!r.ok) throw new Error((await r.json()).message || 'Publish failed');
    return r.json();
  };

  // ── AI ────────────────────────────────────────────────────────────────────
  function AISDK(key) { this._key = key; }
  AISDK.prototype.complete = async function (opts) {
    if (!this._key) return { text: 'AI plugin not configured yet. Add your OpenAI key in Settings to enable live AI responses.' };
    const r = await fetch(BASE + '/ai/v1/complete', { method:'POST', headers: headers(this._key), body: JSON.stringify(opts) });
    if (!r.ok) throw new Error((await r.json()).message || 'AI failed');
    return r.json();
  };

  // ── Analytics ─────────────────────────────────────────────────────────────
  function AnalyticsSDK(key) { this._key = key; }
  AnalyticsSDK.prototype.track = async function (event, props) {
    if (!this._key) { return; }
    fetch(BASE + '/analytics/v1/track', { method:'POST', headers: headers(this._key), body: JSON.stringify({ event, props, ts: Date.now() }) }).catch(() => {});
  };

  // ── Public API ────────────────────────────────────────────────────────────
  global.DevOS = {
    auth:      k => new AuthSDK(k),
    db:        k => new DBSDK(k),
    storage:   k => new StorageSDK(k),
    email:     k => new EmailSDK(k),
    realtime:  k => new RealtimeSDK(k),
    ai:        k => new AISDK(k),
    analytics: k => new AnalyticsSDK(k),
  };

})(typeof window !== 'undefined' ? window : globalThis);`
      },
      {
        name: "README.md",
        path: "README.md",
        language: "markdown",
        content: `# DevOS Academy — Full-Stack School Platform Template

A complete school / messaging platform built on **all DevOS plugins**.

## Features
| Feature | Plugin Used |
|---------|-------------|
| Sign up / Sign in / Sign out | **DevOS Auth** |
| Class feed (post text + attach files) | **DevOS Database** |
| File & image uploads | **DevOS Storage** |
| Welcome & notification emails | **DevOS Email** |
| Live class chat (real-time) | **DevOS Realtime** |
| AI Tutor chatbot | **DevOS AI** |
| Session & action tracking | **DevOS Analytics** |

## Getting started
1. **Fork** this template in DevOS.
2. Open the **Plugin Marketplace** (sidebar → 🧩 Plugins).
3. Install each plugin — env vars are injected automatically.
4. Hit **Run** to see the live app.
5. Hit **Deploy** to publish at \`your-slug.username.devos.name.ng\`.

## File structure
\`\`\`
index.html    — Full app UI (auth, feed, chat, files, AI, profile)
devos-sdk.js  — Universal DevOS plugin SDK (auth/db/storage/email/rt/ai/analytics)
README.md     — You are here
\`\`\`

## How it works without plugin keys
Every SDK method has a **localStorage fallback** so you can demo the app
immediately — even before installing any plugins. Once you add plugin keys,
the app switches to live backend automatically.
`
      }
    ]
  },
  {
    id: "saas-dashboard",
    name: "SaaS Dashboard",
    description: "A modern, responsive admin dashboard for a SaaS product with charts and tables.",
    icon: "LayoutDashboard",
    tags: ["dashboard", "admin", "ui"],
    category: "Dashboards",
    files: [
      {
        name: "index.html",
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SaaS Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 font-sans h-screen flex overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div class="p-6 text-2xl font-black text-indigo-400">AppSaaS</div>
        <nav class="flex-1 px-4 space-y-2">
            <a href="#" class="block px-4 py-2 bg-indigo-600 rounded-lg font-medium">Dashboard</a>
            <a href="#" class="block px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-300">Users</a>
            <a href="#" class="block px-4 py-2 hover:bg-slate-800 rounded-lg text-slate-300">Settings</a>
        </nav>
    </aside>
    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-y-auto">
        <header class="bg-white border-b border-slate-200 p-6 flex justify-between items-center sticky top-0">
            <h1 class="text-2xl font-bold">Overview</h1>
            <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">JD</div>
        </header>
        <div class="p-6 space-y-6">
            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 class="text-slate-500 text-sm font-medium">Total Revenue</h3>
                    <p class="text-3xl font-bold mt-2">$24,500</p>
                    <span class="text-green-500 text-sm font-medium">+12% from last month</span>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 class="text-slate-500 text-sm font-medium">Active Users</h3>
                    <p class="text-3xl font-bold mt-2">1,204</p>
                    <span class="text-green-500 text-sm font-medium">+5% from last month</span>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 class="text-slate-500 text-sm font-medium">Churn Rate</h3>
                    <p class="text-3xl font-bold mt-2">2.4%</p>
                    <span class="text-red-500 text-sm font-medium">+0.2% from last month</span>
                </div>
            </div>
            <!-- Table -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-100">
                    <h2 class="text-lg font-bold">Recent Signups</h2>
                </div>
                <table class="w-full text-left">
                    <thead class="bg-slate-50 text-slate-500 text-sm">
                        <tr><th class="p-4 font-medium">Name</th><th class="p-4 font-medium">Plan</th><th class="p-4 font-medium">Date</th></tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr><td class="p-4">Alice Johnson</td><td class="p-4"><span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold">Pro</span></td><td class="p-4 text-slate-500">Today</td></tr>
                        <tr><td class="p-4">Bob Smith</td><td class="p-4"><span class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">Free</span></td><td class="p-4 text-slate-500">Yesterday</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</body>
</html>`
      }
    ]
  },
  {
    id: "blog-starter",
    name: "Minimal Blog",
    description: "A clean, reading-focused blog template.",
    icon: "BookOpen",
    tags: ["blog", "markdown", "content"],
    category: "Full Pages",
    files: [
      {
        name: "index.html",
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Tech Blog</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>@import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,700;1,300&display=swap'); .prose { font-family: 'Merriweather', serif; line-height: 1.8; }</style>
</head>
<body class="bg-[#fcfaf8] text-gray-900 antialiased">
    <header class="max-w-3xl mx-auto px-6 py-12 flex justify-between items-center">
        <a href="#" class="text-2xl font-bold tracking-tight">John's Notes</a>
        <nav class="space-x-4 text-sm font-medium text-gray-500">
            <a href="#" class="hover:text-gray-900 transition">Posts</a>
            <a href="#" class="hover:text-gray-900 transition">About</a>
        </nav>
    </header>
    <main class="max-w-3xl mx-auto px-6 pb-24">
        <article class="mb-16">
            <p class="text-sm text-gray-400 mb-2 font-mono">June 5, 2026</p>
            <h1 class="text-4xl font-bold mb-6 leading-tight hover:text-indigo-600 transition cursor-pointer">The Future of Web Development</h1>
            <p class="prose text-gray-600 text-lg mb-4">Web development is moving faster than ever. In this post, we explore the rise of AI assistants and how they change our workflows.</p>
            <a href="#" class="text-indigo-600 font-semibold hover:underline">Read more →</a>
        </article>
        <article class="mb-16">
            <p class="text-sm text-gray-400 mb-2 font-mono">May 22, 2026</p>
            <h1 class="text-4xl font-bold mb-6 leading-tight hover:text-indigo-600 transition cursor-pointer">Why I switched to Tailwind</h1>
            <p class="prose text-gray-600 text-lg mb-4">A controversial take on utility-first CSS and why it actually makes maintaining large codebases easier.</p>
            <a href="#" class="text-indigo-600 font-semibold hover:underline">Read more →</a>
        </article>
    </main>
</body>
</html>`
      }
    ]
  },
  {
    id: "link-in-bio",
    name: "Link in Bio",
    description: "A beautiful, mobile-friendly landing page for your social links.",
    icon: "Link",
    tags: ["portfolio", "social", "links"],
    category: "Full Pages",
    files: [
      {
        name: "index.html",
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link in Bio</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 min-h-screen text-white font-sans flex flex-col items-center py-20 px-4">
    <img src="https://i.pravatar.cc/150?img=32" alt="Profile" class="w-24 h-24 rounded-full border-4 border-white/30 shadow-xl mb-4">
    <h1 class="text-2xl font-bold mb-1">Jane Doe</h1>
    <p class="text-white/80 mb-8 text-center max-w-xs">Software Engineer & Tech Creator. Sharing coding tips every week! ✨</p>
    
    <div class="w-full max-w-md space-y-4">
        <a href="#" class="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl p-4 text-center font-bold text-lg transition-all hover:scale-105 shadow-lg">
            📺 Watch my latest YouTube video
        </a>
        <a href="#" class="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl p-4 text-center font-bold text-lg transition-all hover:scale-105 shadow-lg">
            💻 My Portfolio
        </a>
        <a href="#" class="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl p-4 text-center font-bold text-lg transition-all hover:scale-105 shadow-lg">
            🐦 Twitter / X
        </a>
        <a href="#" class="block w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-2xl p-4 text-center font-bold text-lg transition-all hover:scale-105 shadow-lg">
            ☕ Buy me a coffee
        </a>
    </div>
</body>
</html>`
      }
    ]
  }
];
