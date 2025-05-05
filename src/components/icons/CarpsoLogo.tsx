// src/components/icons/CarpsoLogo.tsx
import React from 'react';

const CarpsoLogo = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 150 50" // Adjusted viewBox for better aspect ratio of the core logo elements
        className={className}
        aria-label="Carpso Logo"
    >
        {/* Stylized circles */}
        <circle cx="55" cy="12" r="2" fill="currentColor" />
        <circle cx="62" cy="12" r="2" fill="currentColor" />
        <circle cx="69" cy="12" r="2" fill="currentColor" />
        <circle cx="80" cy="12" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
        <circle cx="93" cy="12" r="5" fill="currentColor" />

        {/* Carpso Text */}
        <text
            x="75" // Centered relative to the 150 width
            y="35" // Positioned below the circles
            fontFamily="Arial, sans-serif" // Approximation
            fontSize="18" // Adjusted size
            fontWeight="bold"
            fill="currentColor"
            textAnchor="middle" // Center the text horizontally
        >
            Carpso
        </text>

        {/* Tagline Text - Omitting for simple icon usage, can be added if needed elsewhere */}
        {/* <text
            x="75"
            y="48"
            fontFamily="Arial, sans-serif"
            fontSize="6"
            fill="currentColor"
            textAnchor="middle"
        >
            making life easier within your space...
        </text> */}
    </svg>
);

export default CarpsoLogo;
