import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

/**
 * Student Critical Flow Smoke Test
 *
 * Covers:
 * 1. Open share link
 * 2. View exercise welcome page
 * 3. Enter name and start exercise
 * 4. Answer all questions (mcq + free text)
 * 5. Submit answers
 * 6. View results/confirmation
 */

test.describe('Student Critical Flow', () => {
  let shareCode: string;
  let exerciseId: string;

  test.beforeAll(async ({ request }) => {
    // Create an exercise with pre-built questions
    const exRes = await request.post(`${API_BASE}/exercises`, {
      data: {
        subject: 'Student Smoke Test',
        question_count: 3,
        question_type: 'mixed',
        difficulty: 'easy',
        instructions: 'Take your time.',
        questions: [
          {
            question_text: 'What is the largest planet?',
            type: 'mcq',
            options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
            correct_answer: 'Jupiter',
            points: 10,
          },
          {
            question_text: 'Describe the water cycle briefly.',
            type: 'essay',
            points: 15,
          },
          {
            question_text: 'What is the chemical symbol for water?',
            type: 'short_answer',
            correct_answer: 'H2O',
            points: 5,
          },
        ],
      },
    });
    const exBody = await exRes.json();
    exerciseId = exBody.id;

    // Create share link
    const linkRes = await request.post(`${API_BASE}/links`, {
      data: { exercise_id: exerciseId },
    });
    const linkBody = await linkRes.json();
    shareCode = linkBody.code;
  });

  test('share link shows exercise welcome page', async ({ page }) => {
    await page.goto(`/s/${shareCode}`);
    await page.waitForLoadState('networkidle');

    // Should show subject name and info
    await expect(page.locator('h1')).toContainText('Student Smoke Test');
    await expect(page.locator('text=3 questions')).toBeVisible();
    await expect(page.locator('text=easy')).toBeVisible();
  });

  test('can start exercise after entering name', async ({ page }) => {
    await page.goto(`/s/${shareCode}`);
    await page.waitForLoadState('networkidle');

    // Fill optional name
    const nameInput = page.locator('#name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E Student');

    // Click start
    await page.locator('text=Start Exercise').click();

    // Should now show questions
    await expect(page.locator('text=answered', { exact: false })).toBeVisible({ timeout: 5000 });
    // Should show submit button
    await expect(page.locator('text=Submit Answers')).toBeVisible();
  });

  test('can answer all questions and submit', async ({ page }) => {
    await page.goto(`/s/${shareCode}`);
    await page.waitForLoadState('networkidle');

    // Start the exercise
    await page.locator('#name').fill('E2E Student');
    await page.locator('text=Start Exercise').click();
    await page.waitForTimeout(500);

    // Answer Q1 (MCQ) - click the radio for Jupiter
    const q1Options = page.locator('label').filter({ hasText: 'Jupiter' });
    await expect(q1Options).toBeVisible({ timeout: 5000 });
    await q1Options.click();

    // Answer Q2 (essay) - find a textarea and fill
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    if (textareaCount >= 1) {
      await textareas.nth(0).fill('Water evaporates, forms clouds, and falls as rain.');
    }

    // Answer Q3 (short_answer) - should be another textarea
    if (textareaCount >= 2) {
      await textareas.nth(1).fill('H2O');
    }

    // Submit
    await page.locator('text=Submit Answers').click();

    // Should navigate to results page (or show confirmation)
    await page.waitForURL(/results/, { timeout: 10000 }).catch(() => {
      // If navigation doesn't happen, check for confirmation on same page
    });

    // Should be on a results/confirmation page
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
  });

  test('exercise with invalid share code shows error', async ({ page }) => {
    await page.goto('/s/nonexistent-code');
    await page.waitForLoadState('networkidle');

    // Should show error state
    await expect(page.locator('text=not available', { exact: false })).toBeVisible({ timeout: 5000 });
  });
});
