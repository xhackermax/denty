import type { NextConfig } from "next";
const apiBase=process.env.DENTY_API_URL??"http://127.0.0.1:4000";
const nextConfig:NextConfig={eslint:{ignoreDuringBuilds:true},async rewrites(){return[{source:"/api/:path*",destination:`${apiBase}/api/:path*`},{source:"/health/:path*",destination:`${apiBase}/health/:path*`}]} };
export default nextConfig;
