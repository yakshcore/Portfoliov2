import type { MetadataRoute } from "next";
import { SITE_NAME, SEO_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Yaksh B.",
    description: SEO_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#060a16",
    theme_color: "#060a16",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
