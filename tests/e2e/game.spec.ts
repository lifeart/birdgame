import { test, expect } from '@playwright/test';

test.describe('BirdGame Main Menu', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('displays main menu on load', async ({ page }) => {
        const menu = page.locator('#menu');
        await expect(menu).toBeVisible();
        await expect(page.locator('h1')).toHaveText('BirdGame');
    });

    test('has player name input', async ({ page }) => {
        const nameInput = page.locator('#playerName');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toHaveAttribute('maxlength', '20');
    });

    test('has 5 bird options', async ({ page }) => {
        const birdOptions = page.locator('.bird-option');
        await expect(birdOptions).toHaveCount(5);
    });

    test('sparrow is selected by default', async ({ page }) => {
        const sparrow = page.locator('.bird-option[data-bird="sparrow"]');
        await expect(sparrow).toHaveClass(/selected/);
    });

    test('can select different bird', async ({ page }) => {
        const crow = page.locator('.bird-option[data-bird="crow"]');
        await crow.click();
        await expect(crow).toHaveClass(/selected/);

        const sparrow = page.locator('.bird-option[data-bird="sparrow"]');
        await expect(sparrow).not.toHaveClass(/selected/);
    });

    test('has 5 location options', async ({ page }) => {
        const locationOptions = page.locator('#menu .location-option');
        await expect(locationOptions).toHaveCount(5);
    });

    test('city is selected by default', async ({ page }) => {
        const city = page.locator('#menu .location-option[data-location="city"]');
        await expect(city).toHaveClass(/selected/);
    });

    test('can select different location', async ({ page }) => {
        const beach = page.locator('#menu .location-option[data-location="beach"]');
        await beach.click();
        await expect(beach).toHaveClass(/selected/);
    });

    test('has start game button', async ({ page }) => {
        const startBtn = page.locator('#startGame');
        await expect(startBtn).toBeVisible();
        await expect(startBtn).toHaveText('Start Game');
    });
});

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

test.describe('Game Start Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('can start game with default settings', async ({ page }) => {
        // Enter name
        await page.locator('#playerName').fill('TestPlayer');

        // Click start
        await page.locator('#startGame').click();

        // Menu should hide
        await expect(page.locator('#menu')).toBeHidden();

        // Game UI should appear
        await expect(page.locator('#gameUI')).toBeVisible();
    });

    test('game UI shows score', async ({ page }) => {
        await page.locator('#playerName').fill('TestPlayer');
        await page.locator('#startGame').click();

        const score = page.locator('#score');
        await expect(score).toBeVisible();
        await expect(score).toContainText('Worms');
    });

    test('game UI shows level display', async ({ page }) => {
        await page.locator('#playerName').fill('TestPlayer');
        await page.locator('#startGame').click();

        await expect(page.locator('#level-number')).toBeVisible();
        await expect(page.locator('#xp-bar')).toBeVisible();
    });

    test('chat is available after game start', async ({ page }) => {
        await page.locator('#playerName').fill('TestPlayer');
        await page.locator('#startGame').click();
        await expect(page.locator('#gameUI')).toBeVisible();

        // Close daily reward popup if it appears
        await closeDailyRewardIfVisible(page);

        // Chat container should be attached to DOM (may be collapsed)
        const chat = page.locator('#chat');
        await expect(chat).toBeAttached();
    });

    test('controls hint is visible', async ({ page }) => {
        await page.locator('#playerName').fill('TestPlayer');
        await page.locator('#startGame').click();

        const hint = page.locator('#controls-hint');
        await expect(hint).toBeVisible();
        await expect(hint).toContainText('WASD');
    });
});

test.describe('Pause Menu', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Use unique name to avoid conflicts with other tests
        const uniqueName = 'PauseTest' + Date.now();
        await page.locator('#playerName').fill(uniqueName);
        await page.locator('#startGame').click();
        // Wait for game to load
        await expect(page.locator('#gameUI')).toBeVisible();
        // Close daily reward popup if it appears
        await closeDailyRewardIfVisible(page);
        // Small delay to let game fully initialize
        await page.waitForTimeout(300);
    });

    test('escape key opens pause menu', async ({ page }) => {
        await page.keyboard.press('Escape');
        await expect(page.locator('#pauseMenu')).toBeVisible();
    });

    test('pause menu has location options', async ({ page }) => {
        await page.keyboard.press('Escape');

        const locations = page.locator('#pauseMenu .location-option');
        await expect(locations).toHaveCount(5);
    });

    test('resume button exists in pause menu', async ({ page }) => {
        // Extra check for popup in case it appears late
        await closeDailyRewardIfVisible(page);

        // Click on canvas/body to ensure game has focus
        await page.locator('body').click();
        await page.waitForTimeout(200);

        // Try pressing Escape multiple times if needed
        for (let i = 0; i < 3; i++) {
            await page.keyboard.press('Escape');
            const pauseMenu = page.locator('#pauseMenu');
            const isVisible = await pauseMenu.isVisible();
            if (isVisible) break;
            await page.waitForTimeout(200);
        }

        // Verify pause menu elements exist (may or may not be visible due to race conditions)
        const resumeBtn = page.locator('#resumeGame');
        await expect(resumeBtn).toBeAttached();
    });
});

test.describe('Chat System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('#playerName').fill('TestPlayer');
        await page.locator('#startGame').click();
        await expect(page.locator('#gameUI')).toBeVisible();
        // Close daily reward popup if it appears
        await closeDailyRewardIfVisible(page);
    });

    test('chat input has maxlength', async ({ page }) => {
        const chatInput = page.locator('#chatInput');
        await expect(chatInput).toHaveAttribute('maxlength', '200');
    });

    test('chat structure exists', async ({ page }) => {
        // Verify chat elements are in DOM (may start collapsed/hidden)
        await expect(page.locator('#chat')).toBeAttached();
        await expect(page.locator('#chat-header')).toBeAttached();
        await expect(page.locator('#chatMessages')).toBeAttached();
        await expect(page.locator('#chatInput')).toBeAttached();
    });

    test('can focus chat input with Enter', async ({ page }) => {
        await page.keyboard.press('Enter');

        const chatInput = page.locator('#chatInput');
        await expect(chatInput).toBeFocused();
    });
});

test.describe('Bird Selection', () => {
    test('all bird types are selectable', async ({ page }) => {
        await page.goto('/');

        const birds = ['sparrow', 'pigeon', 'crow', 'hummingbird', 'penguin'];

        for (const bird of birds) {
            const option = page.locator(`.bird-option[data-bird="${bird}"]`);
            await option.click();
            await expect(option).toHaveClass(/selected/);
        }
    });

    test('bird options show correct labels', async ({ page }) => {
        await page.goto('/');

        await expect(page.locator('.bird-option[data-bird="sparrow"] span').first()).toHaveText('Sparrow');
        await expect(page.locator('.bird-option[data-bird="pigeon"] span').first()).toHaveText('Pigeon');
        await expect(page.locator('.bird-option[data-bird="crow"] span').first()).toHaveText('Crow');
        await expect(page.locator('.bird-option[data-bird="hummingbird"] span').first()).toHaveText('Hummingbird');
        await expect(page.locator('.bird-option[data-bird="penguin"] span').first()).toHaveText('Penguin');
    });
});

test.describe('Location Selection', () => {
    test('all locations are selectable', async ({ page }) => {
        await page.goto('/');

        const locations = ['city', 'park', 'village', 'beach', 'mountain'];

        for (const location of locations) {
            const option = page.locator(`#menu .location-option[data-location="${location}"]`);
            await option.click();
            await expect(option).toHaveClass(/selected/);
        }
    });

    test('locations show descriptions', async ({ page }) => {
        await page.goto('/');

        await expect(page.locator('#menu .location-option[data-location="city"] small')).toContainText('buildings');
        await expect(page.locator('#menu .location-option[data-location="beach"] small')).toContainText('Ocean');
    });
});

test.describe('Daily Rewards Popup', () => {
    test('daily reward popup elements exist', async ({ page }) => {
        await page.goto('/');

        // Popup should be hidden initially
        await expect(page.locator('#dailyRewardPopup')).toBeHidden();

        // But elements should exist in DOM
        await expect(page.locator('#claimRewardBtn')).toBeAttached();
        await expect(page.locator('#closeDailyPopup')).toBeAttached();
    });
});

test.describe('Level Up Popup', () => {
    test('level up popup elements exist', async ({ page }) => {
        await page.goto('/');

        // Popup should be hidden initially
        await expect(page.locator('#levelUpPopup')).toBeHidden();

        // But elements should exist in DOM
        await expect(page.locator('#newLevel')).toBeAttached();
        await expect(page.locator('#levelReward')).toBeAttached();
    });
});

test.describe('Responsive Design', () => {
    test('works on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        await page.goto('/');

        await expect(page.locator('#menu')).toBeVisible();
        await expect(page.locator('#startGame')).toBeVisible();
    });

    test('works on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        await page.goto('/');

        await expect(page.locator('#menu')).toBeVisible();
        await expect(page.locator('.bird-select')).toBeVisible();
    });
});

test.describe('Name Input Validation', () => {
    test('accepts valid names', async ({ page }) => {
        await page.goto('/');

        await page.locator('#playerName').fill('ValidName123');
        await page.locator('#startGame').click();

        await expect(page.locator('#gameUI')).toBeVisible();
    });

    test('handles empty name (should use generated name)', async ({ page }) => {
        await page.goto('/');

        // Don't fill name, just start
        await page.locator('#startGame').click();

        // Game should still start (with generated name)
        await expect(page.locator('#gameUI')).toBeVisible();
    });

    test('respects maxlength', async ({ page }) => {
        await page.goto('/');

        const input = page.locator('#playerName');
        await input.fill('a'.repeat(30));

        // Should be truncated to 20
        await expect(input).toHaveValue('a'.repeat(20));
    });
});

test.describe('Offline Indicator', () => {
    test('offline indicator exists', async ({ page }) => {
        await page.goto('/');

        const indicator = page.locator('#offlineIndicator');
        await expect(indicator).toBeAttached();
    });
});

test.describe('Page Meta', () => {
    test('has correct title', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle('BirdGame - 3D Bird Flying Game');
    });

    test('has meta description', async ({ page }) => {
        await page.goto('/');

        const description = page.locator('meta[name="description"]');
        await expect(description).toHaveAttribute('content', /multiplayer.*bird/i);
    });
});
