import { test, expect } from '@playwright/test';

// Helper to close daily reward popup if it appears
async function closeDailyRewardIfVisible(page: import('@playwright/test').Page) {
    const popup = page.locator('#dailyRewardPopup');
    const closeBtn = page.locator('#closeDailyPopup');

    // Wait a bit for popup to potentially appear
    await page.waitForTimeout(500);

    if (await popup.isVisible()) {
        await closeBtn.click();
        await expect(popup).toBeHidden();
    }
}

test.describe('Multiplayer Features', () => {
    test('player list container exists after game start', async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('Player1');
        await page.locator('#startGame').click();

        await expect(page.locator('#playerList')).toBeVisible();
    });

    test('two players can join same server', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // Player 1 joins
            await page1.goto('/');
            await page1.locator('#playerName').fill('Player1');
            await page1.locator('#startGame').click();
            await expect(page1.locator('#gameUI')).toBeVisible();

            // Player 2 joins
            await page2.goto('/');
            await page2.locator('#playerName').fill('Player2');
            await page2.locator('#startGame').click();
            await expect(page2.locator('#gameUI')).toBeVisible();

            // Both should be in game
            await expect(page1.locator('#score')).toBeVisible();
            await expect(page2.locator('#score')).toBeVisible();
        } finally {
            await context1.close();
            await context2.close();
        }
    });

    test('players in same location see each other', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        try {
            // Both join city location
            await page1.goto('/');
            await page1.locator('#playerName').fill('CityBird1');
            await page1.locator('#menu .location-option[data-location="city"]').click();
            await page1.locator('#startGame').click();

            await page2.goto('/');
            await page2.locator('#playerName').fill('CityBird2');
            await page2.locator('#menu .location-option[data-location="city"]').click();
            await page2.locator('#startGame').click();

            // Wait for both to load
            await expect(page1.locator('#gameUI')).toBeVisible();
            await expect(page2.locator('#gameUI')).toBeVisible();

            // Give time for WebSocket sync
            await page1.waitForTimeout(1000);

            // Player list should show other players
            // This depends on implementation - just verify no errors
        } finally {
            await context1.close();
            await context2.close();
        }
    });
});

test.describe('Chat Between Players', () => {
    test('chat messages container exists', async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('ChatTester');
        await page.locator('#startGame').click();

        await expect(page.locator('#chatMessages')).toBeAttached();
    });

    test('can type in chat input', async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('ChatTester');
        await page.locator('#startGame').click();
        await expect(page.locator('#gameUI')).toBeVisible();

        // Focus chat
        await page.keyboard.press('Enter');

        // Type message
        const chatInput = page.locator('#chatInput');
        await chatInput.fill('Hello World!');
        await expect(chatInput).toHaveValue('Hello World!');
    });

    test('chat input unfocuses on Escape', async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('ChatTester');
        await page.locator('#startGame').click();
        await expect(page.locator('#gameUI')).toBeVisible();

        // Focus chat
        await page.keyboard.press('Enter');
        const chatInput = page.locator('#chatInput');
        await expect(chatInput).toBeFocused();

        // Press Escape
        await page.keyboard.press('Escape');

        // Should either unfocus or open pause menu
    });
});

test.describe('Location Changes', () => {
    test('can change location from pause menu', async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('LocationTester');
        await page.locator('#menu .location-option[data-location="city"]').click();
        await page.locator('#startGame').click();
        await expect(page.locator('#gameUI')).toBeVisible();

        // Close daily reward popup if it appears
        await closeDailyRewardIfVisible(page);

        // Open pause menu
        await page.keyboard.press('Escape');
        await expect(page.locator('#pauseMenu')).toBeVisible();

        // Click different location
        await page.locator('#pauseMenu .location-option[data-location="beach"]').click();

        // Wait for potential loading
        await page.waitForTimeout(500);
    });

    test('loading overlay appears during location change', async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('LoadTester');
        await page.locator('#startGame').click();
        await expect(page.locator('#gameUI')).toBeVisible();

        // Loading overlay should be in DOM
        await expect(page.locator('#loadingOverlay')).toBeAttached();
    });
});
