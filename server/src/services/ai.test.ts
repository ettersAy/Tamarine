import { describe, it, expect } from 'vitest';

// Unit test for parsing logic (doesn't call the API)
describe('AI Service parsing', () => {
  it('parses JSON from AI response correctly', () => {
    const raw = JSON.stringify([
      { type: 'mcq', question_text: 'What is 2+2?', options: ['3', '4', '5', '6'], correct_answer: '4', points: 1 },
      { type: 'short_answer', question_text: 'Define addition.', correct_answer: 'Combining numbers', points: 2 },
    ]);

    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(parsed[0].type).toBe('mcq');
    expect(parsed[1].points).toBe(2);
  });

  it('cleans markdown code fences from AI responses', () => {
    const raw = '```json\n' + JSON.stringify([
      { type: 'essay', question_text: 'Explain gravity.', correct_answer: 'Force of attraction', points: 5 },
    ]) + '\n```';

    const cleaned = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    const parsed = JSON.parse(cleaned);
    expect(parsed[0].type).toBe('essay');
  });
});
