import { blocks } from '../../../lib/prompts';

export const EVALUATOR_MODEL = 'gpt-5-mini';

const SCORE_OVERVIEW = `
You score user feed entries on a fishing community site.
Return an integer "score" from 0 to 100 representing the entry relative value to the platform.
100 means exceptional value — fixing a serious factual error, adding a high-value new section, or asking a sharp question many anglers need answered.
0 means no value — unrelated fluff, spam, noise, or edits that harm the page.
Use the full range. Small but useful fixes might score 20–40. Solid observations or good questions might score 50–75.
`.trim();

const QUESTION_CRITERIA = `
For questions: score higher when the question is specific, on-topic for the page, and likely useful to other anglers.
`.trim();

const OBSERVATION_CRITERIA = `
For observations: score higher when the advice is practical, accurate, and adds real fishing knowledge not already on the page.
`.trim();

const CORRECTION_CRITERIA = `
For corrections: compare the original page body, proposed body, and contributor explanation.
Score corrections higher when they fix factual errors, improve clarity, or add substantive useful content.
Score corrections lower when changes are trivial, cosmetic-only, off-topic, or the explanation misrepresents the edit.
`.trim();

const EVALUATE_OUTPUT = `
Write a brief internal note in "text" explaining the score.
`.trim();

export const EVALUATE_INSTRUCTIONS = blocks(
	SCORE_OVERVIEW,
	QUESTION_CRITERIA,
	OBSERVATION_CRITERIA,
	CORRECTION_CRITERIA,
	EVALUATE_OUTPUT,
);
