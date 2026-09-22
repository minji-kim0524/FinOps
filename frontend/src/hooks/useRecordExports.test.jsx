import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecordExports } from "./useRecordExports";
import api from "../api";
import { downloadBlob } from "../utils/download";

vi.mock("../api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../utils/download", () => ({
  downloadBlob: vi.fn(),
}));

function setup(overrides = {}) {
  const message = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
  const modal = { warning: vi.fn() };
  const onLogout = vi.fn();
  const buildFilterParams = vi.fn(() => ({ search: "홍길동" }));
  const refreshAll = vi.fn().mockResolvedValue(undefined);

  const { result } = renderHook(() =>
    useRecordExports({ message, modal, onLogout, buildFilterParams, refreshAll, ...overrides })
  );

  return { result, message, modal, onLogout, buildFilterParams, refreshAll };
}

describe("useRecordExports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exportToExcel은 현재 필터를 실어 /records/export를 blob으로 요청하고 파일로 저장한다", async () => {
    const blobData = new Blob(["xlsx"]);
    api.get.mockResolvedValueOnce({ data: blobData });
    const { result, buildFilterParams } = setup();

    let promise;
    act(() => {
      promise = result.current.exportToExcel();
    });
    expect(result.current.exporting).toBe(true);
    await act(async () => {
      await promise;
    });

    expect(api.get).toHaveBeenCalledWith("/records/export", {
      params: { search: "홍길동" },
      responseType: "blob",
    });
    expect(buildFilterParams).toHaveBeenCalled();
    expect(downloadBlob).toHaveBeenCalledWith(blobData, "salary_records.xlsx");
    expect(result.current.exporting).toBe(false);
  });

  it("exportToExcel이 실패하면 로딩 상태를 해제하고 실패 메시지를 보여준다", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });
    const { result, message } = setup();

    await act(async () => {
      await result.current.exportToExcel();
    });

    expect(message.error).toHaveBeenCalledWith("엑셀 다운로드에 실패했습니다.");
    expect(result.current.exporting).toBe(false);
  });

  it("downloadPayslipsZip은 현재 필터를 실어 /records/payslips를 blob으로 요청한다", async () => {
    const blobData = new Blob(["zip"]);
    api.get.mockResolvedValueOnce({ data: blobData });
    const { result } = setup();

    await act(async () => {
      await result.current.downloadPayslipsZip();
    });

    expect(api.get).toHaveBeenCalledWith("/records/payslips", {
      params: { search: "홍길동" },
      responseType: "blob",
    });
    expect(downloadBlob).toHaveBeenCalledWith(blobData, "salary_payslips.zip");
    expect(result.current.downloadingPayslips).toBe(false);
  });

  it("downloadCsvTemplate은 필터 없이 템플릿을 blob으로 요청한다", async () => {
    const blobData = new Blob(["csv"]);
    api.get.mockResolvedValueOnce({ data: blobData });
    const { result, buildFilterParams } = setup();

    await act(async () => {
      await result.current.downloadCsvTemplate();
    });

    expect(api.get).toHaveBeenCalledWith("/records/csv-template", { responseType: "blob" });
    expect(buildFilterParams).not.toHaveBeenCalled();
    expect(downloadBlob).toHaveBeenCalledWith(blobData, "salary_upload_template.csv");
  });

  it("downloadPayslip(id)은 해당 이력의 명세서만 blob으로 요청한다", async () => {
    const blobData = new Blob(["pdf"]);
    api.get.mockResolvedValueOnce({ data: blobData });
    const { result } = setup();

    await act(async () => {
      await result.current.downloadPayslip(42);
    });

    expect(api.get).toHaveBeenCalledWith("/records/42/payslip", { responseType: "blob" });
    expect(downloadBlob).toHaveBeenCalledWith(blobData, "payslip_42.pdf");
  });

  it("downloadPayslipsZip이 실패하면 로딩 상태를 해제하고 실패 메시지를 보여준다", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });
    const { result, message } = setup();

    await act(async () => {
      await result.current.downloadPayslipsZip();
    });

    expect(message.error).toHaveBeenCalledWith("급여명세서 일괄 다운로드에 실패했습니다.");
    expect(result.current.downloadingPayslips).toBe(false);
  });

  it("downloadCsvTemplate이 실패하면 실패 메시지를 보여준다", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });
    const { result, message } = setup();

    await act(async () => {
      await result.current.downloadCsvTemplate();
    });

    expect(message.error).toHaveBeenCalledWith("CSV 템플릿 다운로드에 실패했습니다.");
  });

  it("downloadPayslip이 실패하면 실패 메시지를 보여준다", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404 } });
    const { result, message } = setup();

    await act(async () => {
      await result.current.downloadPayslip(42);
    });

    expect(message.error).toHaveBeenCalledWith("급여명세서 다운로드에 실패했습니다.");
  });

  it("uploadBulkCsv가 전부 성공하면 성공 메시지만 보여주고 목록을 새로고침한다", async () => {
    api.post.mockResolvedValueOnce({
      data: { created: [{ id: 1 }, { id: 2 }], errors: [] },
    });
    const { result, message, modal, refreshAll } = setup();

    await act(async () => {
      await result.current.uploadBulkCsv({ file: new File(["a"], "a.csv") });
    });

    expect(refreshAll).toHaveBeenCalledTimes(1);
    expect(message.success).toHaveBeenCalledWith("2건이 일괄 계산되었습니다.");
    expect(modal.warning).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it("uploadBulkCsv가 일부만 성공하면 경고 메시지와 실패 행 안내 모달을 함께 보여준다", async () => {
    api.post.mockResolvedValueOnce({
      data: { created: [{ id: 1 }], errors: [{ row: 3, reason: "세전 급여 값이 없습니다" }] },
    });
    const { result, message, modal } = setup();

    await act(async () => {
      await result.current.uploadBulkCsv({ file: new File(["a"], "a.csv") });
    });

    expect(message.warning).toHaveBeenCalledWith("1건 성공, 1건 실패했습니다.");
    expect(modal.warning).toHaveBeenCalledTimes(1);
    expect(modal.warning.mock.calls[0][0].title).toBe("건너뛴 행이 있습니다");
  });

  it("uploadBulkCsv가 전부 실패하면 에러 메시지와 실패 행 안내 모달을 보여준다", async () => {
    api.post.mockResolvedValueOnce({
      data: { created: [], errors: [{ row: 2, reason: "세전 급여 값이 없습니다" }] },
    });
    const { result, message, modal } = setup();

    await act(async () => {
      await result.current.uploadBulkCsv({ file: new File(["a"], "a.csv") });
    });

    expect(message.error).toHaveBeenCalledWith("업로드에 실패했습니다. 아래 오류를 확인해주세요.");
    expect(modal.warning).toHaveBeenCalledTimes(1);
  });

  it("업로드 요청 자체가 400으로 실패하면 백엔드가 알려준 이유를 그대로 보여준다", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 400, data: { detail: "CSV 파일을 읽을 수 없습니다." } } });
    const { result, message, refreshAll } = setup();

    await act(async () => {
      await result.current.uploadBulkCsv({ file: new File(["a"], "a.csv") });
    });

    expect(message.error).toHaveBeenCalledWith("CSV 파일을 읽을 수 없습니다.");
    expect(refreshAll).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it("업로드 요청이 400 외의 이유로 실패하면 공용 폴백 메시지를 보여준다", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 500 } });
    const { result, message } = setup();

    await act(async () => {
      await result.current.uploadBulkCsv({ file: new File(["a"], "a.csv") });
    });

    expect(message.error).toHaveBeenCalledWith("CSV 일괄 업로드에 실패했습니다.");
  });
});
