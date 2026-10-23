/** Opens the browser's file picker for a video; resolves null if cancelled. */
export function pickVideo(): Promise<{ url: string; name: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file ? { url: URL.createObjectURL(file), name: file.name } : null);
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    document.body.appendChild(input);
    input.click();
  });
}
