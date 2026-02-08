export function formatPhone(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 7) {
    const area = "514";
    const mid = digits.slice(0, 3);
    const last = digits.slice(3);
    return `(${area})-${mid}-${last}`;
  }
  if (digits.length !== 10) return value;
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  return `(${area})-${mid}-${last}`;
}
