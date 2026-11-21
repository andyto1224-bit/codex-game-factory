const paths = {
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>',
  retry: '<path d="M12 4a8 8 0 1 1-8 8h3a5 5 0 1 0 5-5v4L5 6l7-5z"/>',
} as const;

export function icon(name: keyof typeof paths): string {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
