import { Button, Upload } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";

function BulkActions({ uploading, onUpload, exporting, onExport }) {
  return (
    <div className="bulk-upload">
      <Upload accept=".csv" showUploadList={false} customRequest={onUpload} disabled={uploading}>
        <Button icon={<UploadOutlined />} loading={uploading}>
          CSV 일괄 업로드 (employee_name, gross_pay, bonus_pay, num_dependents, num_children_8_to_20 컬럼)
        </Button>
      </Upload>
      <Button icon={<DownloadOutlined />} loading={exporting} onClick={onExport}>
        엑셀로 내보내기
      </Button>
    </div>
  );
}

export default BulkActions;
