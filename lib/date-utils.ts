/**
 * Calculates dynamic Bangladesh Railway demo ticket issue date:
 * exactly 3 days before today, formatted in English (DD-MM-YYYY) and
 * Bengali digits (DD-MM-YYYY).
 */
export function getDynamicIssueDate(): {
  englishDate: string;
  banglaDate: string;
  fullIssueText: string;
  dynamicFileNamePart: string;
} {
  const d = new Date();
  d.setDate(d.getDate() - 3);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());

  const englishDate = `${day}-${month}-${year}`;

  const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const banglaDate = englishDate.replace(/\d/g, (num) => BENGALI_DIGITS[parseInt(num, 10)]);

  return {
    englishDate,
    banglaDate,
    fullIssueText: `${englishDate} 12:20 (${banglaDate} ১২:২০)`,
    dynamicFileNamePart: `${year}${month}${day}`,
  };
}
