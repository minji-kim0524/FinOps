import { expect, test } from "@playwright/test";

test("회원가입 → 계산 → 수정 → 삭제 → 로그아웃 전체 흐름", async ({ page }) => {
  const username = `e2euser${Date.now()}`;
  const password = "e2epass123";

  await page.goto("/");

  // 회원가입
  await page.getByText("회원가입", { exact: true }).click();
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByLabel("보안 질문").click();
  await page.getByTitle("가장 좋아하는 음식은 무엇인가요?").click();
  await page.getByLabel("보안 답변").fill("김치찌개");
  await page.getByRole("button", { name: "회원가입" }).click();

  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

  // 계산
  await page.getByPlaceholder("직원명", { exact: true }).fill("홍길동");
  await page.getByPlaceholder("세전 급여").fill("3000000");
  await page.getByRole("button", { name: "계산하기" }).click();

  const row = page.getByRole("row", { name: /홍길동/ });
  await expect(row).toContainText("3,000,000원");
  await expect(row).toContainText("2,636,093원");

  // 수정
  await row.getByRole("button", { name: "수정" }).click();
  const editDialog = page.getByRole("dialog", { name: "계산 이력 수정" });
  await editDialog.getByLabel("세전 급여").fill("5000000");
  await editDialog.getByRole("button", { name: "저장" }).click();

  await expect(row).toContainText("5,000,000원");
  await expect(row).toContainText("4,160,779원");

  // 삭제
  await row.getByRole("button", { name: "삭제" }).click();
  await page.getByRole("button", { name: "삭제" }).last().click();
  await expect(page.getByRole("cell", { name: "홍길동", exact: true })).toHaveCount(0);

  // 로그아웃
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});

test("보안 질문으로 비밀번호 재설정 후 새 비밀번호로 로그인", async ({ page }) => {
  const username = `e2ereset${Date.now()}`;
  const password = "oldpass123";
  const newPassword = "newpass123";

  await page.goto("/");

  // 회원가입
  await page.getByText("회원가입", { exact: true }).click();
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByLabel("보안 질문").click();
  await page.getByTitle("가장 좋아하는 음식은 무엇인가요?").click();
  await page.getByLabel("보안 답변").fill("김치찌개");
  await page.getByRole("button", { name: "회원가입" }).click();

  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();

  // 비밀번호 재설정
  await page.getByText("비밀번호를 잊으셨나요?").click();
  const resetDialog = page.getByRole("dialog", { name: "비밀번호 재설정" });
  await resetDialog.getByLabel("아이디").fill(username);
  await resetDialog.getByRole("button", { name: "다음" }).click();

  await expect(resetDialog.getByLabel("보안 질문")).toHaveValue("가장 좋아하는 음식은 무엇인가요?");
  await resetDialog.getByLabel("보안 답변").fill("김치찌개");
  await resetDialog.getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
  await resetDialog.getByLabel("새 비밀번호 확인").fill(newPassword);
  await resetDialog.getByRole("button", { name: "비밀번호 재설정" }).click();

  await expect(resetDialog).toBeHidden();

  // 새 비밀번호로 로그인
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(newPassword);
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
});
