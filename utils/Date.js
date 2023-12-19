import memoize from 'memoizee';
import { localNumber } from '#root/utils/Number.js';

const monthNames = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const longMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();

const getMonthName = (index) => monthNames[index];
const getLongMonthName = (index) => longMonthNames[index];

const getHumanReadableDate = (timestamp, {
  displayTime = true,
  hideTimeIf00 = false, // Used to reduce precision for dates that weren't entered as timestamps
  displayDay = true,
  useLongMonthNames = false,
} = {}) => {
  const date = new Date(timestamp * 1000);
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();
  const yearText = year === currentYear ? '' : ` ${year}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const getMonthNameFn = useLongMonthNames ? getLongMonthName : getMonthName;

  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();

  return (
    (displayDay && displayTime) ? (
      (hideTimeIf00 && utcHours === 0 && utcMinutes === 0 && utcSeconds === 0) ?
        `${getMonthNameFn(month)} ${day}${yearText}` :
        `${getMonthNameFn(month)} ${day}${yearText} ${hours}:${minutes}`
    ) :
      displayDay ? `${getMonthNameFn(month)} ${day}${yearText}` :
        `${getMonthNameFn(month)}${yearText}`
  );
};

const getHumanReadableDayDifference = (timestampAfter, timestampBefore = (+Date.now() / 1000)) => {
  const dayDiff = Math.abs(Math.ceil((timestampAfter - timestampBefore) / 60 / 60 / 24));
  const weekDiff = Math.floor(dayDiff / 7);
  return weekDiff > 3 ?
    `${localNumber(weekDiff)} ${weekDiff > 1 ? 'weeks' : 'week'}` :
    `${localNumber(dayDiff)} ${dayDiff > 1 ? 'days' : 'day'}`;
};

// Since date strings are returned as utc, wa manually offset them to always get
// the proper data string. (e.g. when in UTC-2, w/o this fix, retrieving the date
// string on June 2 at 1am would return 'YYYY-06-01' because the underlying iso string
// would be 'YYYY-06-01T23:00:00.000Z')
const getDateISOString = (date) => {
  const correctedDate = date;
  correctedDate.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return correctedDate.toISOString().slice(0, 10);
};

const getTodayDateISOString = () => getDateISOString(new Date());

// Drop the ms precision at the end
// YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DDTHH:mm:ssZ
const getISOStringInSeconds = (date) => `${date.toISOString().slice(0, -5)}Z`;

const getNowTimestamp = () => Math.trunc(+Date.now() / 1000);

const memoedGetNextThursdayTimestamp = memoize((tsNow) => {
  const date = new Date(tsNow * 1000);
  const day = 4; // Thur

  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);

  while (date.getUTCDay() !== day || date.getTime() < tsNow * 1000) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.getTime() / 1000;
}, {
  maxAge: 60 * 1000,
});

const getNextThursdayTimestamp = (tsNow = getNowTimestamp()) => memoedGetNextThursdayTimestamp(tsNow);

export {
  getHumanReadableDate,
  getHumanReadableDayDifference,
  getDateISOString,
  getTodayDateISOString,
  getISOStringInSeconds,
  getNowTimestamp,
  getNextThursdayTimestamp,
};
