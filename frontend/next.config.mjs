/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",  // Static HTML export for S3 hosting
  images: {
    unoptimized: true,  // Required for static export (no Next.js image server)
  },
};

export default nextConfig;
