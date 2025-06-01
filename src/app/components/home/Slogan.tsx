// src/app/components/home/Slogan.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

const Slogan: React.FC = () => {
  const themeConfig = {
    textColor: "#E5E7EB",
    outlineColorHex: "#111827",
    hoverTextColorHex: "#00ADB5",
    sloganText: "It's-a Go Time!",

    fontFamily: "'Press_Start_2P', cursive",
  };

  const textOutlineStyle = {
    textShadow: `
      1.5px 1.5px 0px ${themeConfig.outlineColorHex},
      -1.5px 1.5px 0px ${themeConfig.outlineColorHex},
      1.5px -1.5px 0px ${themeConfig.outlineColorHex},
      -1.5px -1.5px 0px ${themeConfig.outlineColorHex},
      1.5px 0px 0px ${themeConfig.outlineColorHex},
      -1.5px 0px 0px ${themeConfig.outlineColorHex},
      0px 1.5px 0px ${themeConfig.outlineColorHex},
      0px -1.5px 0px ${themeConfig.outlineColorHex}
    `.replace(/\s+/g, " "), // Fjerner unødvendige mellomrom for renere CSS
  };

  // Varianter for Framer Motion animasjoner
  const sloganContainerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 180,
        damping: 15,
        delay: 0.2,
      },
    },
  };

  const sloganTextVariants = {
    // Ingen spesifikke varianter
  };

  return (
    <motion.div
      className="mb-6 sm:mb-8 text-center"
      initial="hidden"
      animate="visible"
      variants={sloganContainerVariants}
      whileHover={{ scale: 1.02 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 15,
      }}
    >
      <motion.p
        className="text-lg md:text-xl lg:text-2xl leading-relaxed text-left max-w-3xl mx-auto px-2"
        style={{
          fontFamily: themeConfig.fontFamily,
          color: themeConfig.textColor,
          ...textOutlineStyle,
        }}
        variants={sloganTextVariants}
        whileHover={{
          color: themeConfig.hoverTextColorHex,
          transition: { type: "tween", duration: 0.15, ease: "easeOut" },
        }}
      >
        {themeConfig.sloganText}
      </motion.p>
    </motion.div>
  );
};

export default Slogan;
