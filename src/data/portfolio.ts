// ============================================================
// CONTENT DATA LAYER — single source of truth
// Sourced from Yaksh Bambhroliya's CV
// ============================================================

export const identity = {
  name: "Yaksh Bambhroliya",
  callsign: "YAKSH-CORE",
  role: "Independent Systems Architect",
  // cycled in the hero typewriter — reinforces the narrative
  roleFramings: [
    "Independent Systems Architect",
    "Builder of Production Systems",
    "Digital Systems Engineer",
    "Full-Stack · AI · Cloud-Native",
  ],
  location: "Ahmedabad, GJ, India",
  email: "yaksh.core@gmail.com",
  phone: "+91 97257 83139",
  tagline: "I architect and ship production systems end-to-end.",
  summary:
    "Full-Stack Developer with 2 years of experience specialising in MERN-stack applications, AI/LLM integrations, and cloud-native deployments on AWS & GCP. Proven track record of independently architecting and shipping production systems — from visa CRM platforms to AI-powered food-tech products — with hands-on ownership across system design, microservices, CI/CD pipelines, and performance optimisation.",
  links: {
    github: "https://github.com/yakshcore",
    linkedin: "https://linkedin.com/in/yaksh-bambhroliya",
    site: "https://yakshdevani.framer.website",
  },
};

// ------------------------------------------------------------
// Architecture node graph type — drives the self-drawing diagrams
// coords are on a 0..100 viewbox (percent), edges reference node ids
// ------------------------------------------------------------
export type DiagramNode = {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  kind: "client" | "edge" | "service" | "data" | "external" | "ai";
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

export type Project = {
  id: string;
  index: string; // SYS-01
  name: string;
  client: string;
  year: string;
  classification: string;
  summary: string;
  stack: string[];
  metrics: { value: string; label: string }[];
  highlights: string[];
  diagram: { nodes: DiagramNode[]; edges: DiagramEdge[] };
};

export const projects: Project[] = [
  {
    id: "pravasa",
    index: "SYS-01",
    name: "Pravasa Transworld",
    client: "Obscur Labs",
    year: "2026",
    classification: "VISA CRM PLATFORM",
    summary:
      "A full-stack visa CRM managing 100+ active applications with passwordless OTP auth, a real-time status pipeline, and secure document delivery. Architected and deployed end-to-end — cutting manual case-tracking effort by ~60%.",
    stack: ["Next.js", "Node.js", "MongoDB", "Cloudinary", "OTP Auth"],
    metrics: [
      { value: "100+", label: "active cases" },
      { value: "~60%", label: "manual effort ↓" },
      { value: "0", label: "passwords stored" },
    ],
    highlights: [
      "Passwordless OTP authentication flow",
      "Real-time application status pipeline & visa tracking",
      "Cloudinary-powered secure document upload / storage / retrieval",
      "Architected from system design to production deployment",
    ],
    diagram: {
      nodes: [
        { id: "client", label: "Client", sub: "Next.js", x: 8, y: 22, kind: "client" },
        { id: "otp", label: "OTP Auth", sub: "passwordless", x: 8, y: 70, kind: "edge" },
        { id: "api", label: "API Layer", sub: "Node / Express", x: 40, y: 46, kind: "service" },
        { id: "pipeline", label: "Status Pipeline", sub: "real-time", x: 72, y: 22, kind: "service" },
        { id: "db", label: "MongoDB", sub: "case store", x: 92, y: 50, kind: "data" },
        { id: "docs", label: "Cloudinary", sub: "documents", x: 72, y: 74, kind: "external" },
      ],
      edges: [
        { from: "client", to: "api", label: "HTTPS" },
        { from: "otp", to: "api", label: "verify" },
        { from: "api", to: "pipeline" },
        { from: "api", to: "db", label: "CRUD" },
        { from: "pipeline", to: "db" },
        { from: "api", to: "docs", label: "upload" },
      ],
    },
  },
  {
    id: "mealai",
    index: "SYS-02",
    name: "AI Meal-Planning Platform",
    client: "Techsture Technologies",
    year: "2025",
    classification: "AI FOOD-TECH ENGINE",
    summary:
      "Led end-to-end development of an AI-powered meal-planning & restaurant platform — 30+ restaurants, 435+ menu items, real-time order tracking. SSR/ISR improved load performance ~40%; Gemini & Claude drive 3+ recommendation flows.",
    stack: ["Next.js", "React", "Node.js", "MongoDB", "Gemini API", "Claude API", "AWS", "Docker"],
    metrics: [
      { value: "~40%", label: "load perf ↑" },
      { value: "435+", label: "menu items" },
      { value: "3+", label: "AI rec flows" },
    ],
    highlights: [
      "SSR/ISR rendering improving load performance by ~40%",
      "Gemini & Claude integrated into the recommendation engine",
      "RBAC, microservices, and 10+ reusable components",
      "Android via Capacitor; CI/CD cut deploy time ~30%",
      "Deployed on AWS EC2/S3 + Docker, IAM, Nginx reverse proxy",
    ],
    diagram: {
      nodes: [
        { id: "client", label: "Next.js", sub: "SSR / ISR", x: 8, y: 24, kind: "client" },
        { id: "android", label: "Android", sub: "Capacitor", x: 8, y: 72, kind: "client" },
        { id: "nginx", label: "Nginx", sub: "reverse proxy", x: 34, y: 48, kind: "edge" },
        { id: "api", label: "Services", sub: "Node · RBAC", x: 58, y: 26, kind: "service" },
        { id: "ai", label: "AI Engine", sub: "Gemini · Claude", x: 58, y: 72, kind: "ai" },
        { id: "db", label: "MongoDB", sub: "data store", x: 86, y: 28, kind: "data" },
        { id: "s3", label: "AWS S3", sub: "assets", x: 86, y: 72, kind: "external" },
      ],
      edges: [
        { from: "client", to: "nginx" },
        { from: "android", to: "nginx" },
        { from: "nginx", to: "api", label: "route" },
        { from: "api", to: "ai", label: "infer" },
        { from: "api", to: "db", label: "CRUD" },
        { from: "ai", to: "db" },
        { from: "api", to: "s3", label: "store" },
      ],
    },
  },
  {
    id: "gamersera",
    index: "SYS-03",
    name: "Gamers Era",
    client: "University Project",
    year: "2025",
    classification: "SOCIAL GAMING NETWORK",
    summary:
      "A scalable social gaming platform — discover games, build collections, follow gamers, and open real-time encrypted chats. 200+ registered users, 1,000+ collections. Web + Android via Capacitor, deployed on Google Cloud.",
    stack: ["Next.js", "TypeScript", "Node.js", "Firebase", "RAWG API", "WebSockets"],
    metrics: [
      { value: "200+", label: "users" },
      { value: "1,000+", label: "collections" },
      { value: "E2E", label: "encrypted chat" },
    ],
    highlights: [
      "Game discovery, collections, bookmarks, social follow graph",
      "Real-time encrypted chat over WebSockets",
      "Capacitor cross-platform → Android deployment",
      "Deployed on Google Cloud, built for community scale",
    ],
    diagram: {
      nodes: [
        { id: "web", label: "Web App", sub: "Next.js · TS", x: 8, y: 26, kind: "client" },
        { id: "mobile", label: "Android", sub: "Capacitor", x: 8, y: 72, kind: "client" },
        { id: "api", label: "Node API", sub: "social graph", x: 40, y: 48, kind: "service" },
        { id: "ws", label: "WebSocket", sub: "E2E chat", x: 70, y: 24, kind: "service" },
        { id: "fb", label: "Firebase", sub: "realtime db", x: 92, y: 50, kind: "data" },
        { id: "rawg", label: "RAWG API", sub: "game data", x: 70, y: 74, kind: "external" },
      ],
      edges: [
        { from: "web", to: "api" },
        { from: "mobile", to: "api" },
        { from: "api", to: "ws", label: "socket" },
        { from: "api", to: "fb", label: "sync" },
        { from: "ws", to: "fb" },
        { from: "api", to: "rawg", label: "fetch" },
      ],
    },
  },
];

// ------------------------------------------------------------
export type ExperienceEntry = {
  role: string;
  company: string;
  mode: string;
  period: string;
  points: string[];
};

export const experience: ExperienceEntry[] = [
  {
    role: "Freelance Full-Stack Developer",
    company: "Obscur Labs",
    mode: "Remote",
    period: "Feb 2026 — Present",
    points: [
      "Built Pravasa Transworld, a full-stack visa CRM with passwordless OTP auth, real-time status pipeline, and Cloudinary document delivery.",
      "Architected & deployed the full system, reducing manual case-tracking effort ~60%.",
    ],
  },
  {
    role: "MERN Stack Developer",
    company: "Techsture Technologies Pvt. Ltd.",
    mode: "On-site",
    period: "Apr 2025 — Jan 2026",
    points: [
      "Led end-to-end development of an AI-powered meal-planning platform.",
      "Next.js/React/Node/MongoDB/AWS; SSR/ISR improved load ~40%; RBAC, microservices, 10+ components.",
      "Integrated Gemini & Claude into the AI engine; Android via Capacitor; CI/CD cut deploy time ~30%.",
    ],
  },
  {
    role: "Full-Stack Developer",
    company: "Swiftrut Technologies Pvt. Ltd.",
    mode: "Remote",
    period: "Mar 2024 — Feb 2025",
    points: [
      "Built & deployed on Google Cloud, Redis, Supabase, WebSockets, microservices, n8n automation.",
      "Implemented RBAC and integrated Twilio, Nodemailer, and video APIs for real-time features.",
      "Shipped backend & cloud across 2 production platforms — supporting 500+ concurrent users via WebSockets.",
    ],
  },
];

// ------------------------------------------------------------
export const skillGroups: { group: string; items: string[] }[] = [
  { group: "Languages", items: ["JavaScript (ES6+)", "TypeScript"] },
  { group: "Frontend", items: ["React.js", "Next.js (SSR/ISR)", "HTML5", "CSS3"] },
  { group: "Backend & APIs", items: ["Node.js", "Express.js", "REST", "WebSockets", "Microservices", "OAuth", "RBAC"] },
  { group: "Cloud & DevOps", items: ["AWS (EC2/S3/IAM)", "Google Cloud", "Docker", "CI/CD", "Nginx"] },
  { group: "AI & Automation", items: ["Gemini API", "Claude API", "OpenAI API", "n8n"] },
  { group: "Data & Caching", items: ["MongoDB", "Redis", "Supabase", "Firebase", "Neo4j"] },
  { group: "Integrations", items: ["Twilio", "Nodemailer", "Cloudinary", "Agora", "Capacitor"] },
  { group: "Blockchain", items: ["Solidity", "Smart Contracts", "EVM", "ethers.js", "Web3"] },
];

// ------------------------------------------------------------
// THE STACK — scroll-story descended from the hero globe.
// Tap the globe → it opens fullscreen and walks these layers,
// each one lighting up its own constellation of nodes.
// Ordered foundation → frontier (core language up to blockchain).
// ------------------------------------------------------------
export type StackLayer = {
  code: string;
  role: string;
  title: string;
  narrative: string;
  items: string[];
  accent: "cyan" | "amber";
  status?: "LIVE" | "EXPLORING";
};

export const stackStory: {
  title: string;
  line: string;
  layers: StackLayer[];
} = {
  title: "THE STACK",
  line: "Seven layers, one operator. Descend the system I build with — from raw language at the core to the decentralized frontier I'm pushing into now.",
  layers: [
    {
      code: "L1",
      role: "FOUNDATION",
      title: "Language Core",
      narrative:
        "Every system I ship starts here — typed, strict, predictable. The bedrock the whole stack stands on.",
      items: ["TypeScript", "JavaScript (ES6+)"],
      accent: "cyan",
      status: "LIVE",
    },
    {
      code: "L2",
      role: "INTERFACE",
      title: "What People Touch",
      narrative:
        "The surface layer — fast, server-rendered, and built to feel alive. Where engineering meets the eye.",
      items: ["React.js", "Next.js (SSR/ISR)", "Three.js / R3F", "GSAP", "Tailwind"],
      accent: "cyan",
      status: "LIVE",
    },
    {
      code: "L3",
      role: "SERVICES",
      title: "The Logic Layer",
      narrative:
        "Where the rules live — APIs, sockets, and microservices wired for real-time and locked down with RBAC.",
      items: ["Node.js", "Express.js", "REST", "WebSockets", "Microservices", "OAuth", "RBAC"],
      accent: "cyan",
      status: "LIVE",
    },
    {
      code: "L4",
      role: "PERSISTENCE",
      title: "State That Survives",
      narrative:
        "Memory for the system — documents, caches, and graphs that hold the truth between requests.",
      items: ["MongoDB", "Redis", "Supabase", "Firebase", "Neo4j"],
      accent: "cyan",
      status: "LIVE",
    },
    {
      code: "L5",
      role: "INFRASTRUCTURE",
      title: "Where It Runs",
      narrative:
        "Containers, pipelines, and cloud — shipped end-to-end so deploys are boring and uptime isn't.",
      items: ["AWS (EC2/S3/IAM)", "Google Cloud", "Docker", "CI/CD", "Nginx"],
      accent: "cyan",
      status: "LIVE",
    },
    {
      code: "L6",
      role: "INTELLIGENCE",
      title: "Systems That Reason",
      narrative:
        "LLMs and automation wired into the product — recommendation engines, agents, and pipelines that think.",
      items: ["Gemini API", "Claude API", "OpenAI API", "n8n"],
      accent: "amber",
      status: "LIVE",
    },
    {
      code: "L7",
      role: "FRONTIER",
      title: "The Decentralized Edge",
      narrative:
        "The layer I'm pushing into right now — trustless, on-chain systems. Smart contracts, EVM, and Web3 rails. Currently going deep.",
      items: ["Solidity", "Smart Contracts", "EVM", "ethers.js", "Web3"],
      accent: "amber",
      status: "EXPLORING",
    },
  ],
};

export const achievements: { title: string; org: string; date: string }[] = [
  { title: "1st Runner-Up — Prompt Wars", org: "H2S Google India", date: "May 2026" },
  { title: "GDG on Campus Solution Challenge", org: "Google India", date: "Aug 2025" },
  { title: "Neo4j Certified Professional", org: "Neo4j", date: "Jul 2025" },
];

export const systemStats = [
  { label: "YEARS ACTIVE", value: "2+" },
  { label: "PROD SYSTEMS", value: "6+" },
  { label: "PEAK CONCURRENT", value: "500+" },
  { label: "GITHUB STARS", value: "70+" },
];

// ------------------------------------------------------------
// OPEN-SOURCE SIGNALS — pulled from github.com/yakshcore
// Social proof: real repos, real stars
// ------------------------------------------------------------
export const github = {
  handle: "yakshcore",
  url: "https://github.com/yakshcore",
  totalStars: 73,
  publicRepos: 18,
  followers: 10,
};

export type Repo = {
  name: string;
  desc: string;
  lang: string;
  stars: number;
  url: string;
  tag: string;
};

export const repos: Repo[] = [
  {
    name: "Gamers-Era",
    desc: "Full-stack social platform — bookmark games, build collections, connect with players.",
    lang: "TypeScript",
    stars: 33,
    url: "https://github.com/yakshcore/Gamers-Era",
    tag: "SOCIAL",
  },
  {
    name: "Solar-System-Explorer",
    desc: "3D web experience — explore planets with realistic orbits, time controls, and smooth camera.",
    lang: "TypeScript",
    stars: 23,
    url: "https://github.com/yakshcore/Solar-System-Explorer",
    tag: "WEBGL · 3D",
  },
  {
    name: "Keymaker",
    desc: "Cinematic, editorial, scroll-driven storytelling experience.",
    lang: "TypeScript",
    stars: 7,
    url: "https://github.com/yakshcore/Keymaker",
    tag: "CREATIVE",
  },
  {
    name: "LeadHunter-AI",
    desc: "AI-driven lead qualification & automation — Node, MongoDB, n8n, OpenAI.",
    lang: "JavaScript",
    stars: 2,
    url: "https://github.com/yakshcore/LeadHunter-AI",
    tag: "AI · AUTOMATION",
  },
  {
    name: "intelgraph",
    desc: "AI-powered investigation tool — builds timelines, connections & insights from internet data.",
    lang: "TypeScript",
    stars: 0,
    url: "https://github.com/yakshcore/intelgraph",
    tag: "AI · GRAPH",
  },
  {
    name: "opentradex",
    desc: "Open-source AI-driven trading cockpit.",
    lang: "TypeScript",
    stars: 0,
    url: "https://github.com/yakshcore/opentradex",
    tag: "AI · FINTECH",
  },
];
