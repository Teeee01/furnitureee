/*
 * Card helpers — DEMO ONLY. They format and validate what's typed; card data
 * stays in component memory and is never saved or sent anywhere.
 */

export type CardBrand = "visa" | "mastercard" | "verve" | "amex" | null;

export function cardBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(5060|5061|5078|5079|6500)/.test(digits)) return "verve";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "mastercard";
  if (/^4/.test(digits)) return "visa";
  return null;
}

const MAX_LEN: Record<Exclude<CardBrand, null>, number> = { visa: 19, mastercard: 16, verve: 19, amex: 15 };

/** "4111111111111111" → "4111 1111 1111 1111". */
export function formatCardNumber(input: string) {
  const d = input.replace(/\D/g, "");
  const brand = cardBrand(d);
  return d
    .slice(0, brand ? MAX_LEN[brand] : 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function luhn(d: string) {
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function validCardNumber(input: string) {
  const d = input.replace(/\D/g, "");
  const brand = cardBrand(d);
  const lengthOk = brand === "amex" ? d.length === 15 : brand === "mastercard" ? d.length === 16 : d.length >= 13 && d.length <= 19;
  return lengthOk && luhn(d);
}

/** "1228" → "12/28". */
export function formatExpiry(input: string) {
  let d = input.replace(/\D/g, "").slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = "0" + d;
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function validExpiry(input: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(input);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  // Valid through the end of the expiry month.
  return new Date(year, month, 1) > now;
}

export function validCvc(input: string, brand: CardBrand) {
  return brand === "amex" ? /^\d{4}$/.test(input) : /^\d{3}$/.test(input);
}
