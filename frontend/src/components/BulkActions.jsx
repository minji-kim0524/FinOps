import { Button, Upload } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

function BulkActions({
  uploading,
  onUpload,
  exporting,
  onExport,
  onDownloadTemplate,
  downloadingPayslips,
  onDownloadPayslipsZip,
}) {
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
      <Button icon={<DownloadOutlined />} loading={downloadingPayslips} onClick={onDownloadPayslipsZip}>
        급여명세서 일괄 다운로드 (ZIP, 현재 필터 적용)
      </Button>
    </div>
  );
}

export default BulkActions;
