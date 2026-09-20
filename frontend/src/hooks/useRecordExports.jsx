import { useState } from "react";
import api from "../api";
import { downloadBlob } from "../utils/download";
import { useErrorReporter } from "./useErrorReporter";

// 이력 관련 파일 다운로드(엑셀/ZIP/CSV 템플릿/개별 명세서)와 CSV 일괄 업로드를 모은 훅.
// buildFilterParams/refreshAll은 useSalaryRecords가 관리하는 필터·목록 상태와 맞물려야 해서 인자로 받는다.
export function useRecordExports({ message, modal, onLogout, buildFilterParams, refreshAll }) {
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadingPayslips, setDownloadingPayslips] = useState(false);

  const reportError = useErrorReporter({ message, onLogout });

  const uploadBulkCsv = async ({ file }) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/calculate/bulk", formData);
      const { created, errors } = response.data;
      await refreshAll();

      if (errors.length === 0) {
        message.success(`${created.length}건이 일괄 계산되었습니다.`);
      } else {
        if (created.length > 0) {
          message.warning(`${created.length}건 성공, ${errors.length}건 실패했습니다.`);
        } else {
          message.error("업로드에 실패했습니다. 아래 오류를 확인해주세요.");
        }
        modal.warning({
          title: "건너뛴 행이 있습니다",
          content: (
            <ul>
              {errors.map((e) => (
                <li key={e.row}>
                  {e.row}행: {e.reason}
                </li>
              ))}
            </ul>
          ),
        });
      }
    } catch (err) {
      if (err.response?.status === 400) {
        message.error(err.response.data?.detail || "CSV 파일을 확인해주세요.");
      } else {
        reportError(err, "CSV 일괄 업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const response = await api.get("/records/export", {
        params: buildFilterParams(),
        responseType: "blob",
      });
      downloadBlob(response.data, "salary_records.xlsx");
    } catch (err) {
      reportError(err, "엑셀 다운로드에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const downloadPayslipsZip = async () => {
    setDownloadingPayslips(true);
    try {
      const response = await api.get("/records/payslips", {
        params: buildFilterParams(),
        responseType: "blob",
      });
      downloadBlob(response.data, "salary_payslips.zip");
    } catch (err) {
      reportError(err, "급여명세서 일괄 다운로드에 실패했습니다.");
    } finally {
      setDownloadingPayslips(false);
    }
  };

  const downloadCsvTemplate = async () => {
    try {
      const response = await api.get("/records/csv-template", { responseType: "blob" });
      downloadBlob(response.data, "salary_upload_template.csv");
    } catch (err) {
      reportError(err, "CSV 템플릿 다운로드에 실패했습니다.");
    }
  };

  const downloadPayslip = async (id) => {
    try {
      const response = await api.get(`/records/${id}/payslip`, { responseType: "blob" });
      downloadBlob(response.data, `payslip_${id}.pdf`);
    } catch (err) {
      reportError(err, "급여명세서 다운로드에 실패했습니다.");
    }
  };

  return {
    uploading,
    exporting,
    downloadingPayslips,
    uploadBulkCsv,
    exportToExcel,
    downloadCsvTemplate,
    downloadPayslipsZip,
    downloadPayslip,
  };
}
