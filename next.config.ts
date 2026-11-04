import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // o engine GL é um singleton com ciclo init/dispose; StrictMode duplicava-o em dev
  reactStrictMode: false,
  devIndicators: false,
  agentRules: false,
}

export default nextConfig
