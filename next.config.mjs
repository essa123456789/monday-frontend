/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits .next/standalone with a self-contained server.js, so the Docker
  // runtime stage carries only the traced dependencies.
  output: "standalone",
};

export default nextConfig;
