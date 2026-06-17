import { identity } from "@/data/portfolio";

// Canonical origin. Set NEXT_PUBLIC_SITE_URL in the deploy env (Vercel etc.).
// The fallback is a placeholder - replace it with the real production domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://yakshbambhroliya.com"
).replace(/\/+$/, "");

export const SITE_NAME = `${identity.name} - ${identity.role}`;

// kept tight (~150 chars) for SERP snippet; the full bio lives in JSON-LD
export const SEO_DESCRIPTION =
  "Yaksh Bambhroliya - full-stack developer architecting and shipping production systems end-to-end: MERN, AI/LLM integration, and cloud-native on AWS & GCP.";

export const SEO_KEYWORDS = [
  "Yaksh Bambhroliya",
  "Full-Stack Developer",
  "Systems Architect",
  "MERN Stack Developer",
  "Next.js Developer",
  "Node.js",
  "MongoDB",
  "React",
  "AI Integration",
  "LLM Integration",
  "Cloud-Native",
  "AWS",
  "GCP",
  "Microservices",
  "Software Engineer",
  "Ahmedabad",
  "India",
  "Portfolio",
];

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: identity.name,
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    jobTitle: identity.role,
    email: `mailto:${identity.email}`,
    description: identity.summary,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ahmedabad",
      addressRegion: "Gujarat",
      addressCountry: "IN",
    },
    sameAs: [identity.links.github, identity.links.linkedin].filter(Boolean),
    knowsAbout: [
      "MERN Stack",
      "Next.js",
      "Node.js",
      "MongoDB",
      "React",
      "AI/LLM Integration",
      "Cloud-Native Architecture",
      "AWS",
      "GCP",
      "Microservices",
      "CI/CD",
      "System Design",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    author: { "@type": "Person", name: identity.name },
  };
}
