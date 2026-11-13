import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מתנה של נחמה", short_name: "מתנה של נחמה", description: "שוברים והטבות למשפחה בתקופת האבל",
    start_url: "/", display: "standalone", dir: "rtl", lang: "he", background_color: "#f7f2e8", theme_color: "#182a4a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
