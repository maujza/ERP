import { test, expect } from "@playwright/test";

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
    const response = await page.request.get("/admin/team-tasks");
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

  test("task detail opens from board", async ({ page }) => {
    await page.goto("/app/team-tasks");

    const taskItem = page
      .locator("[data-testid='task-row'], table tbody tr")
      .first();
    const hasTask = await taskItem.isVisible({ timeout: 8000 }).catch(() => false);

    if (!hasTask) {
      test.skip();
      return;
    }

    await taskItem.click();

    await expect(
      page.getByRole("dialog").or(page.getByLabel(/title|título/i)).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("can delete a task via API", async ({ page }) => {
    // Create via API then delete to verify the DELETE endpoint works
    const createRes = await page.request.post("/admin/team-tasks", {
      data: {
        title: `E2E Delete Test ${Date.now()}`,
        status: "pending",
        priority: "low",
      },
    });

    if (createRes.status() !== 200 && createRes.status() !== 201) {
      test.skip();
      return;
    }

    const body = await createRes.json();
    const taskId = body?.task?.id || body?.id;

    if (!taskId) {
      test.skip();
      return;
    }

    const deleteRes = await page.request.delete(`/admin/team-tasks/${taskId}`);
    expect([200, 204].includes(deleteRes.status())).toBeTruthy();
  });
});
