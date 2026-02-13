"use client";

interface CloudIconProps {
  className?: string;
}

export default function CloudIcon({ className = "w-8 h-8" }: CloudIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 19a4.5 4.5 0 0 1-4-7 5.5 5.5 0 0 1 9-2 4.5 4.5 0 0 1 2 7" />
      <path d="M8 16a4 4 0 0 1-2-7 4.5 4.5 0 0 1 8-1 4 4 0 0 1 1 6" />
    </svg>
  );
}
