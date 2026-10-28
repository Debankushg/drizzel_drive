import { getExtension } from './fileTypes';

/** "report.pdf" -> "report (1).pdf" -> "report (2).pdf" ... until `exists` says the name is free. */
export async function uniqueName(name: string, exists: (candidate: string) => Promise<boolean>): Promise<string> {
  if (!(await exists(name))) return name;
  const ext = getExtension(name);
  const base = ext ? name.slice(0, -ext.length) : name;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base} (${Date.now()})${ext}`;
}

/** Escapes % and _ so user input can't act as ILIKE wildcards. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);
