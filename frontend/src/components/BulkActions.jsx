import { Button, Typography, Upload } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

// 백엔드(app/routers/records.py의 MAX_PAYSLIP_ZIP_RECORDS)와 반드시 같은 값으로 맞춘다.
const MAX_PAYSLIP_ZIP_RECORDS = 1000;

// 백엔드(app/routers/records.py의 MAX_BULK_UPLOAD_CSV_BYTES)와 반드시 같은 값으로 맞춘다.
const MAX_BULK_UPLOAD_CSV_BYTES = 1 * 1024 * 1024;
const MAX_BULK_UPLOAD_CSV_MB = MAX_BULK_UPLOAD_CSV_BYTES / 1024 / 1024;

// 버튼 라벨은 짧게 두고, 긴 설명(CSV 컬럼, 제한 사항)은 버튼 아래 안내 문구로 뺀다.
// 좁은 화면에서 버튼 하나가 여러 줄을 차지하며 눌러야 할 대상을 가리는 것을 막기 위함이다.
function BulkActions({
  uploading,
  onUpload,
  exporting,
  onExport,
  onDownloadTemplate,
  downloadingPayslips,
  onDownloadPayslipsZip,
  filteredRecordCount,
  message,
}) {
  const zipTooLarge = filteredRecordCount > MAX_PAYSLIP_ZIP_RECORDS;

  const beforeCsvUpload = (file) => {
    if (file.size > MAX_BULK_UPLOAD_CSV_BYTES) {
      message.error(
        `CSV 파일이 너무 큽니다(현재 ${(file.size / 1024 / 1024).toFixed(1)}MB, 최대 ` +
          `${MAX_BULK_UPLOAD_CSV_MB.toFixed(0)}MB). 파일을 나눠서 업로드해주세요.`
      );
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  return (
    <div className="bulk-actions">
      <section className="bulk-group" aria-labelledby="bulk-import-title">
        <Typography.Text strong id="bulk-import-title">
          가져오기
        </Typography.Text>
        <div className="bulk-buttons">
          <Upload
            accept=".csv"
            showUploadList={false}
            beforeUpload={beforeCsvUpload}
            customRequest={onUpload}
            disabled={uploading}
          >
            <Button type="primary" ghost icon={<UploadOutlined />} loading={uploading}>
              CSV 일괄 업로드
            </Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
            CSV 템플릿 다운로드
          </Button>
        </div>
        <Typography.Text type="secondary" className="bulk-hint">
          컬럼: employee_name, gross_pay, bonus_pay, num_dependents, num_children_8_to_20 · 파일 최대{" "}
          {MAX_BULK_UPLOAD_CSV_MB}MB
        </Typography.Text>
      </section>

      <section className="bulk-group" aria-labelledby="bulk-export-title">
        <Typography.Text strong id="bulk-export-title">
          내보내기
        </Typography.Text>
        <div className="bulk-buttons">
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={onExport}>
            엑셀로 내보내기
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={downloadingPayslips}
            disabled={zipTooLarge}
            onClick={onDownloadPayslipsZip}
          >
            급여명세서 ZIP 다운로드
          </Button>
        </div>
        {zipTooLarge ? (
          <Typography.Text type="danger" className="bulk-hint">
            현재 조건에 맞는 이력이 {filteredRecordCount.toLocaleString("ko-KR")}건이라 한 번에 받을 수
            있는 최대 {MAX_PAYSLIP_ZIP_RECORDS.toLocaleString("ko-KR")}건을 넘습니다. 직원·기간 등
            필터로 범위를 좁혀주세요.
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" className="bulk-hint">
            아래 이력에 적용한 필터 기준으로 내려받습니다 · ZIP은 한 번에 최대{" "}
            {MAX_PAYSLIP_ZIP_RECORDS.toLocaleString("ko-KR")}건
          </Typography.Text>
        )}
      </section>
    </div>
  );
}

export default BulkActions;
