import React from "react";

interface PlayIconProps {
  fillColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  className?: string;
  width?: string | number;
  height?: string | number;
}

const PlayIcon: React.FC<PlayIconProps> = ({
  fillColor = "#F8D048",
  outlineColor = "#784c24",
  outlineWidth = 2.5,
  className,
  width = 22,
  height = 22,
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24" // Holder viewBox konsistent for enkel koordinathåndtering
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M8 5V19L19 12L8 5Z"
      fill={fillColor}
      stroke={outlineColor}
      strokeWidth={outlineWidth}
      strokeLinejoin="round"
    />
  </svg>
);

export default PlayIcon;
