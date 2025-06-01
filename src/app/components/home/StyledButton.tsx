"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface StyledButtonProps extends React.PropsWithChildren {
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit" | "reset";
  as?: "button" | "a";
  disabled?: boolean;
}

const StyledButton: React.FC<StyledButtonProps> = ({
  href,
  onClick,
  variant = "primary",
  children,
  className = "",
  type = "button",
  as = href ? "a" : "button",
  disabled = false,
}) => {
  const baseClasses = `
    py-[10px] px-[20px] rounded-xl font-bold inline-flex items-center justify-center
    uppercase tracking-[0.5px] text-base leading-normal min-w-[180px]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent 
  `;

  const variantStyles = {
    primary: {
      bg: "bg-[#00ADB5]",
      text: "text-slate-900",
      border: "border-[3px] border-[#008C9E]",
      ringFocus: "focus-visible:ring-[#00ADB5]",
      shadowBase: "shadow-[0px_6px_0px_#007A87,_2px_8px_10px_#00000066]",
    },
    secondary: {
      bg: "bg-[#393E46]",
      text: "text-slate-200",
      border: "border-[3px] border-[#4A5568]",
      ringFocus: "focus-visible:ring-[#4A5568]",

      shadowBase: "shadow-[0px_6px_0px_#222831,_2px_8px_10px_#00000080]",
    },
  };

  const currentVariant = variantStyles[variant];

  const combinedClasses = `
    ${baseClasses}
    ${currentVariant.bg}
    ${currentVariant.text}
    ${currentVariant.border}
    ${currentVariant.ringFocus}
    ${currentVariant.shadowBase}
    ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} 
    ${className}
  `
    .trim()
    .replace(/\s+/g, " "); // Fjerner ekstra mellomrom

  const motionProps = {
    whileHover: disabled
      ? {}
      : {
          scale: 1.03,
          y: -1, // Lett løft på hover
          transition: { type: "spring", stiffness: 350, damping: 10 },
        },
    whileTap: disabled
      ? {}
      : {
          scale: 0.97,
          y: 2, // Simulerer at knappen trykkes ned.
          transition: { type: "spring", stiffness: 400, damping: 15 },
        },
    transition: { type: "spring", stiffness: 400, damping: 17 },
  };

  if (as === "a" && href) {
    const MotionLink = motion(Link);

    const handleClickForLink = (e: React.MouseEvent<HTMLElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <MotionLink
        href={disabled ? "#" : href}
        className={combinedClasses}
        onClick={handleClickForLink}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        {...motionProps}
      >
        {children}
      </MotionLink>
    );
  }

  const MotionButton = motion.button;

  return (
    <MotionButton
      type={type}
      className={combinedClasses}
      onClick={onClick}
      disabled={disabled}
      {...motionProps}
    >
      {children}
    </MotionButton>
  );
};

export default StyledButton;
