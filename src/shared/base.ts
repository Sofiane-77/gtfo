// Single source of truth for the deploy base path.
// GitHub Pages serves the app from /<repo-name>/.
/*
export const BASE_PATH = import.meta.env.PROD ? "/GTFO" : "";

export function withBase(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${BASE_PATH}${path}`;
}
*/
const BASE_URL = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");


export function withBase(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalized}`;
}