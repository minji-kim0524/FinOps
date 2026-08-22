import { expect, test } from "@playwright/test";

test("회원가입 → 계산 → 수정 → 삭제 → 로그아웃 전체 흐름", async ({ page }) => {
  const username = `e2euser${Date.now()}`;
  const password = "e2epass123";

  await page.goto("/");

  // 회원가입
  await page.getByText("회원가입", { exact: true }).click();
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "회원가입" }).click();

  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

  // 계산
  await page.getByPlaceholder("직원명", { exact: true }).fill("홍길동");
  await page.getByPlaceholder("세전 급여").fill("3000000");
  await page.getByRole("button", { name: "계산하기" }).click();

  const row = page.getByRole("row", { name: /홍길동/ });
  await expect(row).toContainText("3,000,000원");
  await expect(row).toContainText("2,613,378원");

  // 수정
  await row.getByRole("button", { name: "수정" }).click();
  const editDialog = page.getByRole("dialog", { name: "계산 이력 수정" });
  await editDialog.getByLabel("세전 급여").fill("5000000");
  await editDialog.getByRole("button", { name: "저장" }).click();

  await expect(row).toContainText("5,000,000원");
  await expect(row).toContainText("4,199,796원");

  // 삭제
  await row.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("button", { name: "삭제" }).last().click();
  await expect(page.getByRole("cell", { name: "홍길동", exact: true })).toHaveCount(0);

  // 로그아웃
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});
