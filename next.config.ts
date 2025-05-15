import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // It's generally not recommended to ignore TypeScript or ESLint errors in production builds.
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      // Add Google Maps domains for potential static map images or street view
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // For Street View images
        port: '',
        pathname: '/**',
      },
      { // Added for placeholder images
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
   // Expose environment variables prefixed with NEXT_PUBLIC_ to the browser
   // No need to list them here explicitly if using the prefix.
   // The prefix handles making them available client-side automatically.
};

export default nextConfig;
