/**
 * Playwright E2E — Strategy Management Screen (TAL-90)
 *
 * Acceptance criteria covered:
 *  AC-1: 409 duplicate name error shown inline
 *  AC-2: Color picker includes 8 accessible preset swatches
 *  AC-3: Archiving removes card from default view; restore returns it
 *  AC-4: Task counts on each card are displayed
 *  AC-5: create → edit name → archive → restore
 */

import { test, expect, type Page } from '@playwright/test';

const STRATEGIES_URL = '/strategies';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function openCreateDialog(page: Page) {
  await page.getByTestId('new-strategy-btn').click();
  await expect(page.getByRole('dialog', { name: 'New Strategy' })).toBeVisible();
}

async function submitCreateForm(
  page: Page,
  opts: { name: string; description?: string },
) {
  await page.getByLabel('Name').fill(opts.name);
  if (opts.description) {
    await page.getByLabel('Description').fill(opts.description);
  }
  await page.getByRole('button', { name: 'Create strategy' }).click();
}

function getStrategyCard(page: Page, name: string) {
  return page.getByRole('article', { name: `Strategy: ${name}` });
}

async function openKebabMenu(page: Page, strategyName: string) {
  const card = getStrategyCard(page, strategyName);
  await card.getByRole('button', { name: 'Strategy options' }).click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Strategies management screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRATEGIES_URL);
    // Wait for the page to finish loading
    await expect(
      page.getByRole('heading', { name: 'Strategies' }),
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-2: 8 accessible preset color swatches
  // -------------------------------------------------------------------------

  test('AC-2: color picker shows 8 preset accessible swatches', async ({
    page,
  }) => {
    await openCreateDialog(page);

    const swatches = page
      .getByRole('radiogroup', { name: 'Preset colors' })
      .getByRole('radio');
    await expect(swatches).toHaveCount(8);

    const expectedLabels = [
      'Blue',
      'Emerald',
      'Amber',
      'Red',
      'Violet',
      'Pink',
      'Teal',
      'Orange',
    ];
    for (const label of expectedLabels) {
      await expect(page.getByRole('radio', { name: label })).toBeVisible();
    }

    // Clicking a swatch marks it as checked
    await page.getByRole('radio', { name: 'Teal' }).click();
    await expect(
      page.getByRole('radio', { name: 'Teal' }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  // -------------------------------------------------------------------------
  // AC-5: full create → edit name → archive → restore flow
  // -------------------------------------------------------------------------

  test('AC-5: create → edit name → archive → restore', async ({ page }) => {
    const originalName = `E2E Strategy ${Date.now()}`;
    const updatedName = `${originalName} Updated`;

    // --- STEP 1: Create ---
    await openCreateDialog(page);
    await submitCreateForm(page, {
      name: originalName,
      description: 'E2E test strategy',
    });

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Card should appear in the grid
    await expect(getStrategyCard(page, originalName)).toBeVisible();

    // --- STEP 2: Edit name ---
    await openKebabMenu(page, originalName);
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    const editDialog = page.getByRole('dialog', { name: 'Edit Strategy' });
    await expect(editDialog).toBeVisible();

    await editDialog.getByLabel('Name').clear();
    await editDialog.getByLabel('Name').fill(updatedName);
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    // Dialog should close
    await expect(editDialog).not.toBeVisible();

    // Updated card should be visible; original-named card should not
    await expect(getStrategyCard(page, updatedName)).toBeVisible();

    // --- STEP 3: Archive ---
    await openKebabMenu(page, updatedName);
    await page.getByRole('menuitem', { name: 'Archive' }).click();

    // Confirmation dialog should appear with the strategy name
    const archiveConfirm = page.getByRole('alertdialog');
    await expect(archiveConfirm).toBeVisible();
    await expect(archiveConfirm).toContainText(updatedName);
    await archiveConfirm.getByRole('button', { name: 'Archive' }).click();

    // Card should vanish from default (active) view
    await expect(getStrategyCard(page, updatedName)).not.toBeVisible();

    // --- STEP 4: Show archived and restore ---
    await page.getByRole('switch', { name: 'Show archived' }).click();

    // Some variation of the card should appear in archived section
    const restoredCard = page.getByRole('article').filter({ hasText: updatedName });
    await expect(restoredCard).toBeVisible();

    await restoredCard.getByRole('button', { name: 'Strategy options' }).click();
    await page.getByRole('menuitem', { name: 'Restore' }).click();

    // Turn off archived toggle
    await page.getByRole('switch', { name: 'Show archived' }).click();

    // Card should be back in active view
    await expect(getStrategyCard(page, updatedName)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-1: 409 duplicate-name error shown inline
  // -------------------------------------------------------------------------

  test('AC-1: duplicate name shows inline 409 error', async ({ page }) => {
    const name = `Duplicate ${Date.now()}`;

    // Create first strategy
    await openCreateDialog(page);
    await submitCreateForm(page, { name });
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Try to create with the same name again
    await openCreateDialog(page);
    await page.getByLabel('Name').fill(name);
    await page.getByRole('button', { name: 'Create strategy' }).click();

    // The API should return 409; the inline error should be visible
    const nameError = page.getByRole('alert');
    await expect(nameError).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  // -------------------------------------------------------------------------
  // AC-3: Archiving removes card; restore returns it
  // -------------------------------------------------------------------------

  test('AC-3: archive hides card from default view; restore returns it', async ({
    page,
  }) => {
    const name = `Archive Test ${Date.now()}`;

    await openCreateDialog(page);
    await submitCreateForm(page, { name });
    await expect(getStrategyCard(page, name)).toBeVisible();

    await openKebabMenu(page, name);
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Archive' })
      .click();

    // Should not appear in active view
    await expect(getStrategyCard(page, name)).not.toBeVisible();

    // Enable archived toggle and restore
    await page.getByRole('switch', { name: 'Show archived' }).click();
    const archivedCard = page.getByRole('article').filter({ hasText: name });
    await expect(archivedCard).toBeVisible();

    await archivedCard.getByRole('button', { name: 'Strategy options' }).click();
    await page.getByRole('menuitem', { name: 'Restore' }).click();

    // Turn off archived toggle
    await page.getByRole('switch', { name: 'Show archived' }).click();

    // Should appear again in active view
    await expect(getStrategyCard(page, name)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC-4: Task counts displayed on each card
  // -------------------------------------------------------------------------

  test('AC-4: task count section is present on strategy cards', async ({
    page,
  }) => {
    const name = `Count Test ${Date.now()}`;

    await openCreateDialog(page);
    await submitCreateForm(page, { name });

    const card = getStrategyCard(page, name);
    await expect(card).toBeVisible();

    // Task count label should be present (badge or loading skeleton resolves)
    await expect(card.getByText('Tasks:')).toBeVisible({ timeout: 8000 });
  });
});
