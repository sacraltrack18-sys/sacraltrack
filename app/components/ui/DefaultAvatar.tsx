"use client";

import React from "react";

interface DefaultAvatarProps {
  size?: number;
  className?: string;
}

const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  size = 64,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#20DDBB]/20 to-[#5D59FF]/20 border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Simple user icon - basic person silhouette */}
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        className="text-white/40"
      >
        <path
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};

export default DefaultAvatar;
