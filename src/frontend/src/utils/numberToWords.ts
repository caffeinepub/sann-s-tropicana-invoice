const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${n % 10 !== 0 ? ` ${ones[n % 10]}` : ""}`;
}

function threeDigits(n: number): string {
  if (n >= 100) {
    return `${ones[Math.floor(n / 100)]} Hundred${n % 100 !== 0 ? ` ${twoDigits(n % 100)}` : ""}`;
  }
  return twoDigits(n);
}

export function numberToWords(amount: number): string {
  if (amount === 0) return "Rupees Zero Only";
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = "";
  if (rupees > 0) {
    let rem = rupees;
    const crore = Math.floor(rem / 10000000);
    rem %= 10000000;
    const lakh = Math.floor(rem / 100000);
    rem %= 100000;
    const thousand = Math.floor(rem / 1000);
    rem %= 1000;
    const rest = rem;

    if (crore) result += `${threeDigits(crore)} Crore `;
    if (lakh) result += `${twoDigits(lakh)} Lakh `;
    if (thousand) result += `${twoDigits(thousand)} Thousand `;
    if (rest) result += `${threeDigits(rest)} `;
    result = result.trim();
  }

  let full = `Rupees ${result}`;
  if (paise > 0) full += ` and ${twoDigits(paise)} Paise`;
  return `${full.trim()} Only`;
}
