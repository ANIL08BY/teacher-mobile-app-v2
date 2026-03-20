export const generateInitials = (name: string, surname: string): string => {
  if (!name || !surname) return '??';
  return `${name.charAt(0).toUpperCase()}${surname.charAt(0).toUpperCase()}`;
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  return phone.length >= 10;
};