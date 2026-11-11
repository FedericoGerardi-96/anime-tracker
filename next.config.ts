import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Servir originales para no depender de la cuota de transformaciones de Vercel.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'static.tvmaze.com', pathname: '/uploads/images/**' },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 'api-cdn.myanimelist.net',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
    ],
  },
};

export default nextConfig;
