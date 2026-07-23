/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 100],
    remotePatterns: [
      { protocol: "https", hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev" },
      { protocol: "https", hostname: "eshopmedia.s3.eu-west-1.amazonaws.com" },
      { protocol: "https", hostname: "eshopmedia.s3.amazonaws.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" }
    ]
  }
};

export default nextConfig;
