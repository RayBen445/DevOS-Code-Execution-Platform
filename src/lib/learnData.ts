// ─── Types ────────────────────────────────────────────────────────────────────

export type TokenType = "keyword" | "variable" | "operator" | "value" | "function" | "type";

export interface CodePart {
  part: string;
  type: TokenType;
  meaning: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  /** Language used for execution. "html" uses an iframe preview. */
  language: "javascript" | "typescript" | "html";
  code: string;
  /** Expected output lines when the code is run (for display / hint). */
  output: string[];
  /** Curated breakdown of notable tokens in the code. */
  explanation: CodePart[];
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  /** Tailwind text colour class */
  color: string;
  /** Tailwind background / ring colour class for cards */
  accent: string;
  lessons: Lesson[];
}

// ─── Lesson data ──────────────────────────────────────────────────────────────

export const TOPICS: Topic[] = [
  {
    id: "javascript-basics",
    title: "JavaScript Basics",
    description: "Learn the core building-blocks of JavaScript: variables, functions, and arrays.",
    color: "text-yellow-400",
    accent: "bg-yellow-500/10 border-yellow-500/20 ring-yellow-500/30",
    lessons: [
      {
        id: "variables",
        title: "Variables & Data Types",
        description:
          "Variables store values you want to use later. JavaScript has three ways to declare them and several built-in types.",
        language: "javascript",
        code: `// Three ways to declare a variable
const name = "DevOS";     // cannot be reassigned
let age = 3;              // can be reassigned
var legacy = true;        // old-style (avoid in modern JS)

// Data types
const text = "Hello";     // string
const count = 42;         // number
const flag = false;       // boolean
const empty = null;       // null
const nothing = undefined;// undefined

// Template literals
console.log(\`Welcome to \${name}!\`);
console.log("Age:", age);
console.log("Types:", typeof text, typeof count, typeof flag);`,
        output: ["Welcome to DevOS!", "Age: 3", "Types: string number boolean"],
        explanation: [
          { part: "const", type: "keyword", meaning: "Declares a constant — the binding cannot be reassigned after initialisation." },
          { part: "let", type: "keyword", meaning: "Declares a block-scoped variable that can be reassigned." },
          { part: "var", type: "keyword", meaning: "Older variable declaration. Function-scoped and hoisted. Prefer `const`/`let`." },
          { part: "name", type: "variable", meaning: "Identifier for the variable holding the string \"DevOS\"." },
          { part: "=", type: "operator", meaning: "Assignment operator. Assigns the right-hand value to the left-hand variable." },
          { part: "typeof", type: "keyword", meaning: "Unary operator that returns a string describing the runtime type of its operand." },
          { part: "console.log", type: "function", meaning: "Built-in function that prints values to the console / output." },
          { part: "`Welcome to ${name}!`", type: "value", meaning: "Template literal — backtick string that can embed expressions with ${…}." },
        ],
      },
      {
        id: "functions",
        title: "Functions",
        description:
          "Functions let you bundle logic into reusable blocks. JavaScript supports several styles of function syntax.",
        language: "javascript",
        code: `// Function declaration
function greet(name) {
  return "Hello, " + name + "!";
}

// Arrow function (ES6+)
const square = (n) => n * n;

// Function with default parameter
const add = (a, b = 10) => a + b;

// Calling functions
console.log(greet("World"));
console.log("5² =", square(5));
console.log("add(3):", add(3));
console.log("add(3, 7):", add(3, 7));`,
        output: ["Hello, World!", "5² = 25", "add(3): 13", "add(3, 7): 10"],
        explanation: [
          { part: "function", type: "keyword", meaning: "Declares a named function. The name is available throughout the enclosing scope (hoisted)." },
          { part: "return", type: "keyword", meaning: "Exits the function and optionally sends a value back to the caller." },
          { part: "=>", type: "operator", meaning: "Arrow function syntax. Shorter than `function` and does not bind its own `this`." },
          { part: "greet", type: "function", meaning: "User-defined function that takes a `name` parameter and returns a greeting string." },
          { part: "square", type: "variable", meaning: "Constant holding an arrow function that returns the square of its argument." },
          { part: "b = 10", type: "value", meaning: "Default parameter — if `b` is not supplied the function uses 10 instead." },
          { part: "+", type: "operator", meaning: "Addition operator. When used with strings it concatenates them." },
          { part: "*", type: "operator", meaning: "Multiplication operator. Returns the product of two numbers." },
        ],
      },
      {
        id: "arrays",
        title: "Arrays & Loops",
        description:
          "Arrays hold ordered lists of values. Loops let you process each element without repetitive code.",
        language: "javascript",
        code: `const fruits = ["apple", "banana", "cherry"];

// Access by index (zero-based)
console.log("First:", fruits[0]);

// Add / remove
fruits.push("date");
const removed = fruits.pop();
console.log("After push+pop:", fruits);

// forEach loop
fruits.forEach((fruit, i) => {
  console.log(i + 1 + ". " + fruit);
});

// map — transform each element
const upper = fruits.map(f => f.toUpperCase());
console.log("Upper:", upper);

// filter — keep matching elements
const long = fruits.filter(f => f.length > 5);
console.log("Long names:", long);`,
        output: [
          "First: apple",
          "After push+pop: [ 'apple', 'banana', 'cherry' ]",
          "1. apple",
          "2. banana",
          "3. cherry",
          "Upper: [ 'APPLE', 'BANANA', 'CHERRY' ]",
          "Long names: [ 'banana', 'cherry' ]",
        ],
        explanation: [
          { part: "[ ]", type: "value", meaning: "Array literal — creates an ordered list. Elements are accessed by zero-based index." },
          { part: "push", type: "function", meaning: "Array method that adds one or more elements to the end of the array." },
          { part: "pop", type: "function", meaning: "Array method that removes the last element and returns it." },
          { part: "forEach", type: "function", meaning: "Iterates over every element, calling the callback once per item." },
          { part: "map", type: "function", meaning: "Returns a NEW array by applying the callback to each element — does not mutate the original." },
          { part: "filter", type: "function", meaning: "Returns a new array containing only elements for which the callback returns true." },
          { part: "f.length > 5", type: "operator", meaning: "`length` is a property giving the number of characters. `>` is the greater-than comparison operator." },
        ],
      },
    ],
  },
  {
    id: "typescript-intro",
    title: "TypeScript Intro",
    description: "Add static types to JavaScript for safer, more self-documenting code.",
    color: "text-blue-400",
    accent: "bg-blue-500/10 border-blue-500/20 ring-blue-500/30",
    lessons: [
      {
        id: "types",
        title: "Type Annotations",
        description:
          "TypeScript lets you annotate variables and function parameters with explicit types, catching mistakes before the code runs.",
        language: "typescript",
        code: `// Primitive type annotations
const username: string = "devos_user";
const score: number = 100;
const active: boolean = true;

// Typed function
function multiply(a: number, b: number): number {
  return a * b;
}

// Union type — can be one of several types
function format(value: string | number): string {
  return \`Value: \${value}\`;
}

// Array type
const tags: string[] = ["typescript", "devos", "web"];

console.log(username, score, active);
console.log("6 × 7 =", multiply(6, 7));
console.log(format("hello"));
console.log(format(42));
console.log("Tags:", tags.join(", "));`,
        output: [
          "devos_user 100 true",
          "6 × 7 = 42",
          "Value: hello",
          "Value: 42",
          "Tags: typescript, devos, web",
        ],
        explanation: [
          { part: ": string", type: "type", meaning: "Type annotation — tells TypeScript (and readers) that this variable must always be a string." },
          { part: ": number", type: "type", meaning: "Restricts the variable or parameter to numeric values only." },
          { part: ": boolean", type: "type", meaning: "Restricts the variable to `true` or `false`." },
          { part: "string | number", type: "type", meaning: "Union type — the value can be either a string or a number." },
          { part: "string[]", type: "type", meaning: "Array of strings — shorthand for `Array<string>`." },
          { part: "function multiply(…): number", type: "function", meaning: "The `: number` after the parameter list is the return type annotation." },
          { part: "join", type: "function", meaning: "Array method that concatenates elements into a single string, separated by the given delimiter." },
        ],
      },
      {
        id: "interfaces",
        title: "Interfaces & Objects",
        description:
          "Interfaces describe the shape of an object. They make it easy to enforce structure and document data models.",
        language: "typescript",
        code: `// Define an interface
interface User {
  id: number;
  name: string;
  email: string;
  role?: string;   // optional field (?)
}

// Object conforming to the interface
const user: User = {
  id: 1,
  name: "Ada Lovelace",
  email: "ada@devos.ng",
};

// Function that accepts a User
function greetUser(u: User): string {
  const role = u.role ?? "member";
  return \`Hi \${u.name} — your role is \${role}.\`;
}

console.log(greetUser(user));

// Extend an interface
interface AdminUser extends User {
  permissions: string[];
}

const admin: AdminUser = {
  id: 2,
  name: "DevOS Admin",
  email: "admin@devos.ng",
  role: "admin",
  permissions: ["manage-users", "deploy"],
};

console.log(\`Admin: \${admin.name}, perms: \${admin.permissions.join(", ")}\`);`,
        output: [
          "Hi Ada Lovelace — your role is member.",
          "Admin: DevOS Admin, perms: manage-users, deploy",
        ],
        explanation: [
          { part: "interface", type: "keyword", meaning: "Declares an interface — a compile-time contract describing the shape of an object." },
          { part: "role?: string", type: "type", meaning: "The `?` makes the field optional. The object can omit it without a type error." },
          { part: "??", type: "operator", meaning: "Nullish coalescing — returns the right-hand side when the left is `null` or `undefined`." },
          { part: "extends", type: "keyword", meaning: "Creates a new interface that inherits all fields from the parent interface, plus adds more." },
          { part: "permissions: string[]", type: "type", meaning: "Field typed as an array of strings — exists on AdminUser but not on the base User." },
          { part: ": User", type: "type", meaning: "Type annotation on the constant — TypeScript checks the object literal against the User interface." },
        ],
      },
    ],
  },
  {
    id: "html-basics",
    title: "HTML Basics",
    description: "Build the skeleton of any web page with HTML elements and structure.",
    color: "text-orange-400",
    accent: "bg-orange-500/10 border-orange-500/20 ring-orange-500/30",
    lessons: [
      {
        id: "html-structure",
        title: "HTML Structure",
        description:
          "Every web page is a tree of HTML elements. Learn the essential tags that every page needs.",
        language: "html",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My First Page</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #0a0a0a; color: #fff; }
    h1   { color: #60a5fa; }
    p    { color: #94a3b8; line-height: 1.6; }
    a    { color: #f59e0b; }
  </style>
</head>
<body>
  <h1>Hello from DevOS 👋</h1>
  <p>This is a paragraph. HTML elements are the <strong>building blocks</strong> of every web page.</p>
  <p>You can add <a href="#">links</a>, lists, images, and much more.</p>
  <ul>
    <li>HTML structures the content</li>
    <li>CSS styles it</li>
    <li>JavaScript makes it interactive</li>
  </ul>
</body>
</html>`,
        output: ["(rendered in preview)"],
        explanation: [
          { part: "<!DOCTYPE html>", type: "keyword", meaning: "Tells the browser this document uses HTML5 — always the first line." },
          { part: "<html>", type: "keyword", meaning: "The root element. All other elements are descendants of this." },
          { part: "<head>", type: "keyword", meaning: "Contains metadata (title, charset, styles, scripts) that is NOT rendered in the page body." },
          { part: "<body>", type: "keyword", meaning: "Contains everything the user sees on the page." },
          { part: "<h1>", type: "keyword", meaning: "Heading level 1 — the most important heading on the page. Use one per page." },
          { part: "<p>", type: "keyword", meaning: "Paragraph element. Block-level element for body text." },
          { part: "<ul> / <li>", type: "keyword", meaning: "`ul` is an unordered (bulleted) list. Each `li` is a list item inside it." },
          { part: "<strong>", type: "keyword", meaning: "Inline element that marks text as strongly important — browsers render it bold." },
        ],
      },
      {
        id: "css-styling",
        title: "CSS Styling",
        description:
          "CSS controls how HTML looks. Learn selectors, the box model, and colours.",
        language: "html",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CSS Styling</title>
  <style>
    /* Reset & base */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }

    /* Class selector */
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      /* Box shadow */
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    /* Element + class selector */
    h2.card-title { color: #60a5fa; font-size: 1.25rem; margin-bottom: 0.5rem; }
    p.card-body   { color: #94a3b8; line-height: 1.6; font-size: 0.9rem; }

    /* Pseudo-class */
    .btn { background: #3b82f6; color: #fff; border: none;
           padding: 0.5rem 1.25rem; border-radius: 8px; cursor: pointer; }
    .btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <h2 class="card-title">Box Model Card</h2>
    <p class="card-body">Every element is a rectangular box. CSS controls the padding (inside space), border, and margin (outside space).</p>
    <br/>
    <button class="btn">Hover me!</button>
  </div>
</body>
</html>`,
        output: ["(rendered in preview)"],
        explanation: [
          { part: "* { box-sizing: border-box }", type: "keyword", meaning: "Universal selector reset — makes `width`/`height` include padding and border (recommended best practice)." },
          { part: ".card", type: "variable", meaning: "Class selector — applies styles to any element with `class=\"card\"`." },
          { part: "border-radius", type: "keyword", meaning: "CSS property that rounds the corners of an element's border box." },
          { part: "box-shadow", type: "keyword", meaning: "Draws a shadow behind an element. Values: x-offset y-offset blur spread color." },
          { part: "h2.card-title", type: "variable", meaning: "Combined selector — targets only `<h2>` elements that also have class `card-title`." },
          { part: ".btn:hover", type: "variable", meaning: "Pseudo-class selector — applies styles only when the user hovers the element." },
          { part: "padding / margin", type: "keyword", meaning: "Box model spacing. `padding` is inside the border; `margin` is outside the border." },
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find a topic by id. Returns undefined if not found. */
export function findTopic(topicId: string): Topic | undefined {
  return TOPICS.find((t) => t.id === topicId);
}

/** Find a lesson within a topic. Returns undefined if not found. */
export function findLesson(topicId: string, lessonId: string): Lesson | undefined {
  return findTopic(topicId)?.lessons.find((l) => l.id === lessonId);
}

/** Return the next lesson after the given one, or null if it is the last. */
export function nextLesson(
  topicId: string,
  lessonId: string
): { topicId: string; lessonId: string } | null {
  const topic = findTopic(topicId);
  if (!topic) return null;
  const idx = topic.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return null;
  if (idx + 1 < topic.lessons.length) {
    return { topicId, lessonId: topic.lessons[idx + 1].id };
  }
  // Check next topic
  const tIdx = TOPICS.findIndex((t) => t.id === topicId);
  if (tIdx + 1 < TOPICS.length && TOPICS[tIdx + 1].lessons.length > 0) {
    return { topicId: TOPICS[tIdx + 1].id, lessonId: TOPICS[tIdx + 1].lessons[0].id };
  }
  return null;
}

/** Return the previous lesson, or null if it is the first. */
export function prevLesson(
  topicId: string,
  lessonId: string
): { topicId: string; lessonId: string } | null {
  const topic = findTopic(topicId);
  if (!topic) return null;
  const idx = topic.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) return null;
  if (idx - 1 >= 0) {
    return { topicId, lessonId: topic.lessons[idx - 1].id };
  }
  const tIdx = TOPICS.findIndex((t) => t.id === topicId);
  if (tIdx - 1 >= 0) {
    const prevTopic = TOPICS[tIdx - 1];
    return { topicId: prevTopic.id, lessonId: prevTopic.lessons[prevTopic.lessons.length - 1].id };
  }
  return null;
}

/** Total number of lessons across all topics. */
export const TOTAL_LESSONS = TOPICS.reduce((sum, t) => sum + t.lessons.length, 0);
