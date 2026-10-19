import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/half-3d", destination: "/slice-comparison", permanent: false },
      { source: "/katalog", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
