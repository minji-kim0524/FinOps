import io
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models import SalaryRecord

FONT_NAME = "PayslipKorean"

# Docker/Render(Debian)는 fonts-nanum 패키지로, 로컬 macOS는 기본 내장된 AppleGothic으로 한글을 렌더링한다.
_FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
]


def _register_font() -> str:
    if FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return FONT_NAME

    for path in _FONT_CANDIDATES:
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(FONT_NAME, path))
            return FONT_NAME

    raise RuntimeError(
        "한글 폰트를 찾을 수 없습니다. 서버에 나눔고딕 등 한글 지원 폰트가 설치되어 있어야 합니다."
    )


def _won(value: int) -> str:
    return f"{value:,}원"


def build_payslip_pdf(record: SalaryRecord) -> bytes:
    font_name = _register_font()
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("PayslipTitle", parent=styles["Title"], fontName=font_name)
    info_style = ParagraphStyle("PayslipInfo", parent=styles["Normal"], fontName=font_name, fontSize=11)

    elements = [
        Paragraph("급여명세서", title_style),
        Spacer(1, 8 * mm),
        Paragraph(f"직원명: {record.employee_name or '-'}", info_style),
        Paragraph(f"계산일시: {record.created_at.strftime('%Y-%m-%d %H:%M')}", info_style),
        Paragraph(
            f"부양가족 수: {record.num_dependents}명 / 8~20세 자녀 수: {record.num_children_8_to_20}명",
            info_style,
        ),
        Spacer(1, 8 * mm),
    ]

    rows = [
        ["항목", "금액"],
        ["세전 급여", _won(record.gross_pay)],
        ["국민연금", _won(record.national_pension)],
        ["건강보험", _won(record.health_insurance)],
        ["장기요양보험", _won(record.long_term_care)],
        ["고용보험", _won(record.employment_insurance)],
        ["소득세", _won(record.income_tax)],
        ["지방소득세", _won(record.local_income_tax)],
        ["공제액 합계", _won(record.total_deduction)],
        ["실수령액", _won(record.net_pay)],
    ]

    table = Table(rows, colWidths=[80 * mm, 60 * mm])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#fafafa")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(table)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
    )
    doc.build(elements)

    return buffer.getvalue()
