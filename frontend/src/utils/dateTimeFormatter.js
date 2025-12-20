/**
 * Date/Time Formatter Utility
 * Handles IST to UTC conversion for quiz scheduling
 */

const formatDate = (dateStr) => {
    const [d, m, y] = dateStr.split("/");

    const day = d.padStart(2, "0");
    const month = m.padStart(2, "0");
    const year = y.length === 2 ? `20${y}` : y;

    return `${year}-${month}-${day}`; // final format: YYYY-MM-DD
};

const formatTime = (timeStr) => {
    // Remove spaces for easier parsing
    let input = timeStr.trim().replace(/\s+/g, "");

    // Extract AM/PM if exists
    const ampmMatch = input.match(/(AM|PM)$/i);
    const hasAMPM = !!ampmMatch;
    const modifier = hasAMPM ? ampmMatch[1].toUpperCase() : null;

    // Remove AM/PM from time part
    if (hasAMPM) {
        input = input.replace(/AM|PM/i, "");
    }

    // Split hours and minutes
    let [hourStr, minuteStr] = input.split(":");

    let hours = parseInt(hourStr, 10);
    let minutes = parseInt(minuteStr, 10);

    // Convert to 24-hour
    if (hasAMPM) {
        if (modifier === "PM" && hours !== 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
    }

    // Pad values
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");

    return `${hh}:${mm}`; // final clean 24-hour time
};

const parseAndConvertDate = (date, time) => {
    if (!date || !time) return { IST: null, UTC: null };

    const formattedDate = formatDate(date);
    const formattedTime = formatTime(time);

    // Parse as IST by appending +05:30
    const IST_DATE = `${formattedDate}T${formattedTime}+05:30`;
    const UTC_DATE = new Date(IST_DATE).toISOString();

    return { IST: IST_DATE, UTC: UTC_DATE };
};

export { formatDate, formatTime, parseAndConvertDate };
