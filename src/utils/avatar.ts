/**
 * Converts any hex color or name into a clean 10% opacity background
 * and matching high-contrast foreground color.
 */
export function getAvatarBgWithOpacity(colorHex: string = '#1862D6', opacity: number = 0.1): string {
  if (!colorHex) return `rgba(24, 98, 214, ${opacity})`;

  let hex = colorHex.replace('#', '').trim();
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length === 8) {
    hex = hex.substring(0, 6);
  }
  if (hex.length !== 6) {
    return `rgba(24, 98, 214, ${opacity})`;
  }

  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Standard vibrant palette for worker avatars that look great at 10% opacity
 */
export const AVATAR_PALETTE = [
  '#E65100', // Warm Amber / Orange (like 'A' in screenshot)
  '#00897B', // Mint Teal / Green (like 'V' in screenshot)
  '#1862D6', // Royal Blue
  '#8E24AA', // Purple
  '#D81B60', // Rose / Pink
  '#3949AB', // Indigo
  '#FB8C00', // Tangerine
  '#43A047', // Green
  '#E53935', // Crimson Red
  '#00ACC1', // Cyan
];

export function getWorkerAvatarStyle(avatarColorHex?: string, opacity: number = 0.1) {
  const bg = getAvatarBgWithOpacity(avatarColorHex || AVATAR_PALETTE[0], opacity);
  return {
    backgroundColor: bg,
  };
}
