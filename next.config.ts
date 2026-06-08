import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // Set to your GitHub repo name, e.g. '/family-planner-app'
  // Leave empty ('') only if deploying to username.github.io directly
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default nextConfig;
