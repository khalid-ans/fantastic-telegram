import { parseAndConvertDate } from '../utils/dateTimeFormatter';

/**
 * Word File Parser for Quiz Format
 * Parses quiz files in the format:
 * Channel: <channel_name>
 * Exam: <exam_name>
 * Questions:
 * Q1. <question>
 * A. <option>
 * B. <option>
 * C. <option>
 * D. <option>
 * Answer: <A-D>
 * Solution: <explanation>
 * Date: DD/MM/YYYY
 * Time: HH:MM AM/PM
 */

const wordFileParser = (rawText) => {
    rawText = rawText.replace(/\r/g, "");

    const channelMatch = rawText.match(/Channel\s*:\s*(.+)/i);
    const examMatch = rawText.match(/Exam\s*:\s*(.+)/i);

    const channel = channelMatch ? channelMatch[1].trim() : null;
    const exam = examMatch ? examMatch[1].trim() : null;

    let questionsPart = rawText.split(/Questions\s*:/i)[1];
    if (!questionsPart) {
        console.log("❌ No questions found");
        return [];
    }

    const questionBlocks = questionsPart
        .split(/(?=Q\s*\d*\s*\.)|(?=Q\d+\.)/i)
        .filter((b) => b.trim().length > 0);

    const parsed = [];

    questionBlocks.forEach((block) => {
        const qMatch = block.match(/Q\s*\d*\s*\.\s*(.+?)(?=\nA\.)/is);
        const question = qMatch ? qMatch[1].trim() : null;

        const optionMatches = [...block.matchAll(/^([A-D])\s*\.\s*(.+)$/gim)];

        let options = {};
        optionMatches.forEach((match) => {
            const letter = match[1].toUpperCase();
            const value = match[2].trim();
            options[letter] = value;
        });

        const answerMatch = block.match(/Answer\s*:\s*([A-D])/i);
        const answerLetter = answerMatch ? answerMatch[1].toUpperCase() : null;

        const answerText =
            answerLetter && options[answerLetter] ? options[answerLetter] : null;

        const solutionMatch = block.match(
            /Solution\s*:\s*(.+?)(?=\nDate:|\nDATE:|$)/is
        );
        const solution = solutionMatch ? solutionMatch[1].trim() : "";

        const dateMatch = block.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
        const date = dateMatch ? dateMatch[0] : null;

        const timeMatch = block.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        const time = timeMatch
            ? timeMatch[0].replace(/\s+/g, "").toUpperCase()
            : null;

        const scheduledAt = date && time ? parseAndConvertDate(date, time).UTC : null;

        // Convert options object to array for QuizBuilder
        const optionsArray = Object.values(options);
        const correctOption = answerLetter ? answerLetter.charCodeAt(0) - 65 : 0;

        if (question && optionsArray.length >= 2) {
            parsed.push({
                channel,
                exam,
                question,
                options: optionsArray,
                correctOption: Math.max(0, correctOption),
                explanation: solution,
                date,
                time,
                scheduledAt,
            });
        }
    });

    return parsed;
};

export { wordFileParser };
