/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "api.dicebear.com",
      "avatars.slack-edge.com",
      "i.imgur.com",
      "img.clerk.com"
    ]
  }
};

module.exports = nextConfig; 