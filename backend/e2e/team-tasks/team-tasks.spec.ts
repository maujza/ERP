import { test, expect } from "@playwright/test";
import { adminDelete, adminGet, createTask } from "../_seed";

test.describe("Team Tasks — board CRUD", () => {
  test("navigates to team tasks board", async ({ page }) => {
    await page.goto("/app/team-tasks");
    await expect(page.locator("body")).not.toContainText("404", { timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("500");
    await expect(page).toHaveURL(/\/team-tasks/);
  });

  test("team tasks page renders without error", async ({ page }) => {
    await page.goto("/app/team-tasks");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("body")).not.toContainText("Unhandled error");
  });

  test("team-tasks API returns non-500", async ({ page }) => {
    const response = await adminGet(page.request, "/admin/team-tasks");
    expect([200, 401].includes(response.status())).toBeTruthy();
  });

  test("can open create task form", async ({ page }) => {
    await page.goto("/app/team-tasks");

    const createBtn = page.getByRole("button", { name: /nueva tarea|new task|create|add/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    const titleField = page.getByPlaceholder(/reponer|título|title/i).first();
    await expect(titleField).toBeVisible({ timeout: 5000 });
  });

  test("creates a new task and it appears in the board", async ({ page }) => {
    await page.goto("/app/team-tasks");

    const createBtn = page.getByRole("button", { name: /nueva tarea|new task|create|add/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    const titleField = page.getByPlaceholder(/reponer|título|title/i).first();
    await expect(titleField).toBeVisible({ timeout: 5000 });

    const uniqueTitle = `E2E Task ${Date.now()}`;
    await titleField.fill(uniqueTitle);

    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });
  });

  test("task edit dialog opens from the card menu", async ({ page }) => {
    // Seed a task so the board always has a card to act on, then open its
    // edit dialog via the card's "⋯" menu (the board is a kanban — there is
    // no clickable row, the detail/edit form opens from the dropdown).
    const { title } = await createTask(page.request);
    await page.goto("/app/team-tasks");

    const card = page.locator("div.rounded-xl", { hasText: title }).first();
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.getByRole("button").first().click();
    await page.getByRole("menuitem", { name: "Editar" }).click();

    await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible({ timeout: 5000 });
  });

  test("can delete a task via API", async ({ request }) => {
    // Create via API then delete to verify the DELETE endpoint works.
    const { id } = await createTask(request, `E2E Delete Test ${Date.now()}`);

    const deleteRes = await adminDelete(request, `/admin/team-tasks/${id}`);
    expect([200, 204].includes(deleteRes.status())).toBeTruthy();
  });
});
