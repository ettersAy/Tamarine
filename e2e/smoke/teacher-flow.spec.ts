import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

/**
 * Teacher Critical Flow Smoke Test
 *
 * Covers:
 * 1. Navigate to exercise dashboard
 * 2. Create exercise via API (bypasses AI generation for CI compatibility)
 * 3. Generate share link
 * 4. View exercise details
 */

test.describe('Teacher Critical Flow', () => {
  let exerciseId: string;
  let shareCode: string;

  test.beforeAll(async ({ request }) => {
    // Create an exercise via API with pre-built questions
    const res = await request.post(`${API_BASE}/exercises`, {
      data: {
        subject: 'E2E Smoke Test Subject',
        question_count: 3,
        question_type: 'mixed',
        difficulty: 'medium',
        instructions: 'Answer all questions carefully.',
        questions: [
          {
            question_text: 'What is the capital of France?',
            type: 'mcq',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correct_answer: 'Paris',
            points: 10,
          },
          {
            question_text: 'Explain the concept of gravity.',
            type: 'essay',
            points: 20,
          },
          {
            question_text: 'What is 2 + 2?',
            type: 'short_answer',
            correct_answer: '4',
            points: 5,
          },
        ],
      },
    });

    const body = await res.json();
    expect(res.ok()).toBeTruthy();
    exerciseId = body.id;
  });

  test('exercise dashboard loads and shows created exercise', async ({ page }) => {
    await page.goto('/exercises');
    await expect(page.locator('h1')).toBeVisible();
    // The exercise list should render (may show loading then list)
    await page.waitForLoadState('networkidle');
    // Should not show error state
    await expect(page.locator('text=E2E Smoke Test Subject').first()).toBeVisible({ timeout: 10000 });
  });

  test('can generate share link for exercise', async ({ request }) => {
    const res = await request.post(`${API_BASE}/links`, {
      data: { exercise_id: exerciseId },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    shareCode = body.code;
    expect(shareCode).toBeTruthy();
  });

  test('share link is accessible', async ({ request }) => {
    expect(shareCode).toBeTruthy();
    const res = await request.get(`${API_BASE}/links/${shareCode}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.subject).toBe('E2E Smoke Test Subject');
    expect(body.questions).toHaveLength(3);
  });

  test('exercise results page loads', async ({ page }) => {
    await page.goto(`/exercises/${exerciseId}/results`);
    await page.waitForLoadState('networkidle');
    // Results page should render
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });
});
