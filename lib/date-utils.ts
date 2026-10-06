/**
 * Calculates dynamic Bangladesh Railway demo ticket issue date:
 * exactly 3 days before today at 10:28 (১০:২৮), formatted in English (DD-MM-YYYY) and
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
    fullIssueText: `${englishDate} 10:28 (${banglaDate} ১০:২৮)`,
    dynamicFileNamePart: `${year}${month}${day}`,
  };
}

export type TrainOption = 'drutojan' | 'rupsha';

/**
 * Calculates dynamic Journey Date & Time and Train Name & Number:
 * - Journey Date is always today's date in English & Bangla.
 * - Drutojan: Time is 12:40 (১২:৪০), Train: "DRUTOJAN EXPRESS [758] (দ্রুতযান এক্সপ্রেস [৭৫৮])".
 * - Rupsha: Time is 12:05 (১২:০৫), Train: "RUPSHA EXPRESS [728] (রূপসা এক্সপ্রেস [৭২৮])".
 */
export function getDynamicJourneyDate(train: TrainOption): {
  englishDate: string;
  banglaDate: string;
  timeEn: string;
  timeBn: string;
  fullJourneyText: string;
  trainNameText: string;
} {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());

  const englishDate = `${day}-${month}-${year}`;
  const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const banglaDate = englishDate.replace(/\d/g, (num) => BENGALI_DIGITS[parseInt(num, 10)]);

  const isRupsha = train === 'rupsha';
  const timeEn = isRupsha ? '12:05' : '12:40';
  const timeBn = isRupsha ? '১২:০৫' : '১২:৪০';

  const fullJourneyText = `${englishDate} ${timeEn} (${banglaDate} ${timeBn})`;
  const trainNameText = isRupsha
    ? 'RUPSHA EXPRESS [728] (রূপসা এক্সপ্রেস [৭২৮])'
    : 'DRUTOJAN EXPRESS [758] (দ্রুতযান এক্সপ্রেস [৭৫৮])';

  return {
    englishDate,
    banglaDate,
    timeEn,
    timeBn,
    fullJourneyText,
    trainNameText,
  };
}
