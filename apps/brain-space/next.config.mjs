/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "localhost",
      "lh3.googleusercontent.com",
      "s.gravatar.com",
      "platform-lookaside.fbsbx.com",
      "avatars.githubusercontent.com",
    ],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/videos/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/thumbnails/**",
      },
    ],
  },
};

export default nextConfig;
