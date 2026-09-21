import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./download";

describe("downloadBlob", () => {
  let createObjectURL;
  let revokeObjectURL;
  let clickSpy;
  let clickedDownloadAttr;

  beforeEach(() => {
    clickedDownloadAttr = undefined;
    createObjectURL = vi.fn(() => "blob:mock-url");
    revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    // jsdom은 실제 다운로드를 수행하지 않으므로, 클릭 시점에 <a download> 속성이
    // 무엇으로 설정돼 있었는지만 확인하고 실제 클릭 동작(네비게이션)은 막는다.
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedDownloadAttr = this.getAttribute("download");
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it("blob URL을 만들어 지정한 파일명으로 다운로드 링크를 클릭한다", () => {
    downloadBlob("파일 내용", "salary_records.xlsx");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickedDownloadAttr).toBe("salary_records.xlsx");
  });

  it("클릭 후 블롭 URL을 해제하고 링크 엘리먼트를 DOM에서 제거한다", () => {
    downloadBlob("파일 내용", "salary_payslips.zip");

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(document.querySelector('a[download="salary_payslips.zip"]')).toBeNull();
  });
});
