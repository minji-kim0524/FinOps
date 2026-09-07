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

  // 직원별 집계 표에도 같은 이름이 나오므로, 계산 이력 표(첫 번째 표)로 범위를 좁힌다.
  const historyTable = page.getByRole("table").first();
  const row = historyTable.getByRole("row", { name: /홍길동/ });
  await expect(row).toContainText("3,000,000원");
  await expect(row).toContainText("2,636,093원");

  // 급여명세서 PDF 다운로드
  const downloadPromise = page.waitForEvent("download");
  await row.getByRole("button", { name: "명세서" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^payslip_\d+\.pdf$/);

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

test("상여금/성과급을 입력하면 세전 급여와 합산되어 실수령액에 반영된다", async ({ page }) => {
  const username = `e2ebonus${Date.now()}`;
  const password = "e2epass123";

  await page.goto("/");

  await page.getByText("회원가입", { exact: true }).click();
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByLabel("보안 질문").click();
  await page.getByTitle("가장 좋아하는 음식은 무엇인가요?").click();
  await page.getByLabel("보안 답변").fill("김치찌개");
  await page.getByRole("button", { name: "회원가입" }).click();
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

  await page.getByPlaceholder("직원명", { exact: true }).fill("김보너스");
  await page.getByPlaceholder("세전 급여").fill("3000000");
  await page.getByPlaceholder("상여금/성과급").fill("1000000");
  await page.getByRole("button", { name: "계산하기" }).click();

  const historyTable = page.getByRole("table").first();
  const row = historyTable.getByRole("row", { name: /김보너스/ });
  await expect(row).toContainText("3,000,000원");
  await expect(row).toContainText("1,000,000원");
  await expect(row).toContainText("3,408,281원");

  // 수정 모달에도 상여금 값이 그대로 채워져 있는지 확인
  await row.getByRole("button", { name: "수정" }).click();
  const editDialog = page.getByRole("dialog", { name: "계산 이력 수정" });
  await expect(editDialog.getByLabel("상여금/성과급")).toHaveValue("1000000");
  await editDialog.getByRole("button", { name: "취소" }).click();
});

test("이력이 10건을 넘으면 서버 사이드 페이지네이션으로 다음 페이지를 불러온다", async ({ page }) => {
  const username = `e2epage${Date.now()}`;
  const password = "e2epass123";

  await page.goto("/");

  await page.getByText("회원가입", { exact: true }).click();
  await page.getByLabel("아이디").fill(username);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByLabel("보안 질문").click();
  await page.getByTitle("가장 좋아하는 음식은 무엇인가요?").click();
  await page.getByLabel("보안 답변").fill("김치찌개");
  await page.getByRole("button", { name: "회원가입" }).click();
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

  const employeeNameInput = page.getByPlaceholder("직원명", { exact: true });
  for (let i = 1; i <= 12; i++) {
    await employeeNameInput.fill(`직원${i}`);
    await page.getByPlaceholder("세전 급여").fill("3000000");
    await page.getByRole("button", { name: "계산하기" }).click();
    await expect(employeeNameInput).toHaveValue(""); // 제출 성공 시 폼이 초기화됨
  }

  const historyTable = page.getByRole("table").first();
  await expect(historyTable.getByRole("row")).toHaveCount(11); // 헤더 1행 + 데이터 10행

  await page.getByTitle("2").locator("a").click();
  await expect(historyTable.getByRole("row")).toHaveCount(3); // 헤더 1행 + 데이터 2행
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

test.describe("모바일 뷰포트", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("모바일 화면에서는 페이지 전체가 가로로 스크롤되지 않는다", async ({ page }) => {
    const username = `e2emobile${Date.now()}`;
    const password = "e2epass123";

    await page.goto("/");

    await page.getByText("회원가입", { exact: true }).click();
    await page.getByLabel("아이디").fill(username);
    await page.getByLabel("비밀번호").fill(password);
    await page.getByLabel("보안 질문").click();
    await page.getByTitle("가장 좋아하는 음식은 무엇인가요?").click();
    await page.getByLabel("보안 답변").fill("김치찌개");
    await page.getByRole("button", { name: "회원가입" }).click();
    await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

    await page.getByPlaceholder("직원명", { exact: true }).fill("홍길동");
    await page.getByPlaceholder("세전 급여").fill("3000000");
    await page.getByRole("button", { name: "계산하기" }).click();
    await expect(page.getByRole("table").first().getByRole("row", { name: /홍길동/ })).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
