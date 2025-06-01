"use client";
import Link from "next/link";
import { motion } from "framer-motion";

const PopcornStyleGoLogo: React.FC = () => {
  const primaryTextColor = "#E5E7EB";
  const hoverTextColor = "#00ADB5";
  const outlineColorHex = "#111827";

  const textOutlineStyle = {
    textShadow: `
      1.5px 1.5px 0px ${outlineColorHex},
      -1.5px 1.5px 0px ${outlineColorHex},
      1.5px -1.5px 0px ${outlineColorHex},
      -1.5px -1.5px 0px ${outlineColorHex},
      1.5px 0px 0px ${outlineColorHex},
      -1.5px 0px 0px ${outlineColorHex},
      0px 1.5px 0px ${outlineColorHex},
      0px -1.5px 0px ${outlineColorHex}
    `.replace(/\s+/g, " "), // Fjerner unødvendige mellomrom for renere CSS
  };

  return (
    <Link
      href="/"
      className="group inline-flex items-center cursor-pointer no-underline"
      aria-label="Hjem"
    >
      <motion.div
        className="flex flex-row items-center" // Forenklet, space-x-3 fjernet da det ikke er bilde
        whileHover={{ scale: 1.03 }} // Litt mer subtil hover-skalering
        transition={{
          type: "spring",
          stiffness: 300, // Litt mykere spring
          damping: 12,
        }}
      >
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold drop-shadow-md text-left" // Fjernet text-[#ffb1b1] og text-shadow (håndteres av style-objekt)
          style={{
            color: primaryTextColor, // Setter primærfargen via style for konsistens
            ...textOutlineStyle, // Applikerer tekst-outline
          }}
          initial={{ opacity: 0, x: -20, scale: 0.95 }} // Justert initial animasjon
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 18,
            delay: 0.1,
          }}
          whileHover={{
            color: hoverTextColor,
            // Skalering håndteres av forelder-div for enhetlig effekt
            transition: { type: "spring", stiffness: 280, damping: 10 },
          }}
        >
          GO GAME
        </motion.h1>
      </motion.div>
    </Link>
  );
};

export default PopcornStyleGoLogo;
