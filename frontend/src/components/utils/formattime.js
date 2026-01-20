export const formatTime = (time) => {
  if (!time) return 'N/A';
  const [hours, minutes] = time.split(':');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes} ${suffix}`;
};

export const isMidnight = (time) => {
  return time === '12:00 AM' || time === '00:00:00';
};
