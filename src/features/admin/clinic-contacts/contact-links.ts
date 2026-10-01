export function contactPhoneLinks(phone: string): { tel: string; whatsapp: string | null } | null {
  if (!/^[+\d\s().-]+$/.test(phone)) return null;
  const value = phone
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+");
  if (!/^\+?\d{3,15}$/.test(value)) return null;
  return {
    tel: `tel:${value}`,
    whatsapp: /^\+\d{8,15}$/.test(value) ? `https://wa.me/${value.slice(1)}` : null,
  };
}
export function contactEmailLink(email: string): string | null {
  const value = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(email)
    ? `mailto:${encodeURIComponent(value).replace(/%40/g, "@")}`
    : null;
}
