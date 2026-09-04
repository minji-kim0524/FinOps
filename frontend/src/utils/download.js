// blob 응답을 파일로 저장한다 (엑셀 내보내기, 급여명세서 PDF 다운로드에서 공용으로 사용).
export function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
