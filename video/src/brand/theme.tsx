import React, { createContext, useContext } from "react";
import { AbsoluteFill } from "remotion";
import { BRAND, PALETTES, type Palette, type ThemeName } from "./tokens";

/**
 * Night and Day as a React context, so every kit component picks the right colours without props:
 *
 *   <World theme="night">  ... </World>      // Fathom ground (A1)
 *   <World theme="night" ground="black">     // black ground (the cold open)
 *   <World theme="day">    ... </World>      // Paper ground (A2 onward)
 *
 * Any kit component also takes a `theme` prop that wins over the context.
 */

const ThemeContext = createContext<Palette>(PALETTES.day);

export const ThemeProvider: React.FC<{ theme: ThemeName; children: React.ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={PALETTES[theme]}>{children}</ThemeContext.Provider>
);

/** The palette in effect: the `theme` override if given, else the nearest <World>/<ThemeProvider>, else Day. */
export function useTheme(override?: ThemeName): Palette {
  const ctx = useContext(ThemeContext);
  return override ? PALETTES[override] : ctx;
}

/** A full-frame ground in one world. `ground="black"` gives the cold open's black instead of Fathom. */
export const World: React.FC<{
  theme: ThemeName;
  ground?: "default" | "black" | "surface" | "sunk";
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ theme, ground = "default", style, children }) => {
  const p = PALETTES[theme];
  const bg = ground === "black" ? BRAND.black : ground === "surface" ? p.surface : ground === "sunk" ? p.surfaceSunk : p.ground;
  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ background: bg, color: p.text, ...style }}>{children}</AbsoluteFill>
    </ThemeProvider>
  );
};
