import type { MetadataRoute } from "next";

// Web App Manifest — enables "Add to Home Screen" (PWA install) and provides the
// icon/name/colors the iOS Capacitor shell and browsers use. Icons referenced
// below live in /public; generate them from the violet brand (#7C5CFC) with
// @capacitor/assets (see docs/SESSION_HANDOFF.md).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Planner",
    short_name: "FamilyPlanner",
    description:
      "Personal and family planning — tasks, goals, meals, and more.",
    start_url: "/dashboard/self",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#FAFAF8",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
