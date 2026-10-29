/** The 36 states and the FCT. */
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

/** National number (10 digits, starting 7/8/9) from what was typed:
 *  "0803 123 4567", "803 123 4567", "+234 803 123 4567". */
export function nationalNumber(input: string) {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

export function isNigerianMobile(input: string) {
  return /^[789]\d{9}$/.test(nationalNumber(input));
}

/** "8031234567" → "803 123 4567". */
export function formatPhone(input: string) {
  const d = nationalNumber(input).slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
}
