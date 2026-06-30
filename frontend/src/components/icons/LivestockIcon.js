import React from 'react';

export default function LivestockIcon({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="59" height="59" rx="19.5" stroke="#8A8A8A" strokeWidth="1" fill="none" />
      <g transform="translate(30, 32)">
        {/* Body */}
        <ellipse cx="0" cy="2" rx="11" ry="8" fill="#3F8C0F" />
        {/* Head */}
        <ellipse cx="-10" cy="-3" rx="5" ry="5.5" fill="#3F8C0F" />
        {/* Ear */}
        <ellipse cx="-13" cy="-8" rx="2.5" ry="1" fill="#3F8C0F" transform="rotate(-20 -13 -8)" />
        <ellipse cx="-7" cy="-8" rx="2.5" ry="1" fill="#3F8C0F" transform="rotate(20 -7 -8)" />
        {/* Eye */}
        <circle cx="-11.5" cy="-4" r="0.8" fill="white" />
        <circle cx="-11.5" cy="-4" r="0.4" fill="#3F8C0F" />
        {/* Nose */}
        <ellipse cx="-14" cy="-1.5" rx="0.8" ry="0.5" fill="#2D6B0A" />
        {/* Legs */}
        <rect x="-7" y="9" width="2.5" height="5" rx="1" fill="#3F8C0F" />
        <rect x="-3" y="9" width="2.5" height="5" rx="1" fill="#3F8C0F" />
        <rect x="2" y="9" width="2.5" height="5" rx="1" fill="#3F8C0F" />
        <rect x="6" y="9" width="2.5" height="5" rx="1" fill="#3F8C0F" />
        {/* Tail */}
        <ellipse cx="11" cy="-1" rx="2" ry="1.5" fill="#3F8C0F" />
        {/* Wool texture */}
        <circle cx="-4" cy="0" r="2" fill="#4DAF15" opacity="0.3" />
        <circle cx="0" cy="-2" r="2.5" fill="#4DAF15" opacity="0.3" />
        <circle cx="4" cy="1" r="2" fill="#4DAF15" opacity="0.3" />
        <circle cx="7" cy="-2" r="1.8" fill="#4DAF15" opacity="0.3" />
      </g>
    </svg>
  );
}
