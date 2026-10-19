/**
 * Utility to get user avatar URL.
 * Falls back to a deterministic, beautifully colored letter avatar
 * generated via ui-avatars.com if no custom avatar is set.
 */
export const getAvatarUrl = (user) => {
  if (user?.avatar && user.avatar !== 'Avatar' && user.avatar !== '') {
    return user.avatar;
  }
  const name = user?.name || 'User';
  
  // Deterministic palette matching our premium dark theme
  const colors = [
    '6366F1', // Indigo / Primary
    '4F46E5', // Deep Indigo
    '3B82F6', // Blue
    '10B981', // Emerald
    '8B5CF6', // Purple
    '06B6D4', // Cyan
    'EC4899', // Pink
    'F59E0B', // Amber
  ];
  
  const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const colorIndex = charCodeSum % colors.length;
  const bgColor = colors[colorIndex];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&bold=true&size=128`;
};
