import { Button, Typography, Upload } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

// 백엔드(app/routers/records.py의 MAX_PAYSLIP_ZIP_RECORDS)와 반드시 같은 값으로 맞춘다.
const MAX_PAYSLIP_ZIP_RECORDS = 1000;

function BulkActions({
  uploading,
  onUpload,
  exporting,
  onExport,
  onDownloadTemplate,
  downloadingPayslips,
  onDownloadPayslipsZip,
  filteredRecordCount,
}) {
  const zipTooLarge = filteredRecordCount > MAX_PAYSLIP_ZIP_RECORDS;

  return (
    <div className="bulk-upload">
      <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>
        CSV 템플릿 다운로드
      </Button>
      <Upload accept=".csv" showUploadList={false} customRequest={onUpload} disabled={uploading}>
        <Button icon={<UploadOutlined />} loading={uploading}>
          CSV 일괄 업로드 (employee_name, gross_pay, bonus_pay, num_dependents, num_children_8_to_20 컬럼)
        </Button>
      </Upload>
      <Button icon={<DownloadOutlined />} loading={exporting} onClick={onExport}>
        엑셀로 내보내기
      </Button>
      <span>
        <Button
          icon={<DownloadOutlined />}
          loading={downloadingPayslips}
          disabled={zipTooLarge}
          onClick={onDownloadPayslipsZip}
        >
          급여명세서 일괄 다운로드 (ZIP, 현재 필터 적용)
        </Button>
        {zipTooLarge && (
          <div>
            <Typography.Text type="danger">
              현재 조건에 맞는 이력이 {filteredRecordCount.toLocaleString("ko-KR")}건이라 한 번에 받을 수
              있는 최대 {MAX_PAYSLIP_ZIP_RECORDS.toLocaleString("ko-KR")}건을 넘습니다. 직원·기간 등
              필터로 범위를 좁혀주세요.
            </Typography.Text>
          </div>
        )}
      </span>
    </div>
  );
}

export default BulkActions;
