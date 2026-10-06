import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BulkActions from "./BulkActions";

function renderBulkActions(overrides = {}) {
  const props = {
    uploading: false,
    onUpload: vi.fn(),
    exporting: false,
    onExport: vi.fn(),
    onDownloadTemplate: vi.fn(),
    downloadingPayslips: false,
    onDownloadPayslipsZip: vi.fn(),
    filteredRecordCount: 10,
    message: { error: vi.fn() },
    ...overrides,
  };
  const { container } = render(<BulkActions {...props} />);
  return { props, container };
}

describe("BulkActions", () => {
  it("버튼 라벨은 짧게 두고 CSV 컬럼·크기 제한은 안내 문구로 보여준다", () => {
    renderBulkActions();

    expect(screen.getByRole("button", { name: /CSV 일괄 업로드/ })).toBeInTheDocument();
    expect(screen.getByText(/컬럼: employee_name, gross_pay/)).toHaveTextContent("파일 최대 1MB");
  });

  it("템플릿·엑셀·ZIP 버튼이 각자의 콜백을 호출한다", async () => {
    const user = userEvent.setup();
    const { props } = renderBulkActions();

    await user.click(screen.getByRole("button", { name: /CSV 템플릿 다운로드/ }));
    await user.click(screen.getByRole("button", { name: /엑셀로 내보내기/ }));
    await user.click(screen.getByRole("button", { name: /급여명세서 ZIP 다운로드/ }));

    expect(props.onDownloadTemplate).toHaveBeenCalledTimes(1);
    expect(props.onExport).toHaveBeenCalledTimes(1);
    expect(props.onDownloadPayslipsZip).toHaveBeenCalledTimes(1);
  });

  it("현재 조건의 이력이 1,000건을 넘으면 ZIP 버튼을 비활성화하고 범위를 좁히라고 안내한다", () => {
    renderBulkActions({ filteredRecordCount: 1001 });

    expect(screen.getByRole("button", { name: /급여명세서 ZIP 다운로드/ })).toBeDisabled();
    expect(screen.getByText(/1,001건이라 한 번에 받을 수 있는 최대 1,000건을 넘습니다/)).toBeInTheDocument();
  });

  it("정확히 1,000건까지는 ZIP을 받을 수 있다", () => {
    renderBulkActions({ filteredRecordCount: 1000 });

    expect(screen.getByRole("button", { name: /급여명세서 ZIP 다운로드/ })).toBeEnabled();
  });

  it("1MB를 넘는 CSV는 서버로 보내지 않고 바로 경고한다", () => {
    const { props, container } = renderBulkActions();
    const input = container.querySelector('input[type="file"]');
    const bigFile = new File(["a"], "big.csv", { type: "text/csv" });
    Object.defineProperty(bigFile, "size", { value: 1024 * 1024 + 1 });

    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(props.message.error).toHaveBeenCalledWith(expect.stringContaining("CSV 파일이 너무 큽니다"));
    expect(props.onUpload).not.toHaveBeenCalled();
  });
});
