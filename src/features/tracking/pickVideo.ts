/** Video analysis runs in the browser build only. */
export async function pickVideo(): Promise<{ url: string; name: string } | null> {
  return null;
}
