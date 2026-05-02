import { getDateDaysAhead, toDateInputValue } from "./dateTokens";

export const getTodayDateString = () => getDateDaysAhead(0);

export const getTomorrowDateString = () => getDateDaysAhead(1);

export const getDateTimeLocalShortcut = (dayOffset = 0) => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() + 30);
  date.setDate(date.getDate() + dayOffset);
  const localDate = toDateInputValue(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${localDate}T${hours}:${minutes}`;
};
