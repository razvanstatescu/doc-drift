import { getStaticFiles } from "remotion";

/**
 * Whether a file exists under public/ (path relative to public/, as in the data files: "vo/V00.wav"). getStaticFiles()
 * works in the Studio and during renders (it returns [] in the Player). Used so a missing voice line, effect or capture
 * renders nothing (or a placeholder) instead of failing a render.
 */
export function hasStaticFile(path: string | null | undefined): boolean {
  if (!path) return false;
  const clean = path.replace(/^\/+/, "");
  return getStaticFiles().some((f) => f.name === clean);
}
