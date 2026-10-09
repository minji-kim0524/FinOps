// 공제 항목: [화면 라벨, 서버 응답 필드]. 계산 결과 패널과 이력 카드의 상세 내역이 같은 순서·이름을 쓴다.
export const DEDUCTION_ROWS = [
  ["국민연금", "national_pension"],
  ["건강보험", "health_insurance"],
  ["장기요양보험", "long_term_care"],
  ["고용보험", "employment_insurance"],
  ["소득세", "income_tax"],
  ["지방소득세", "local_income_tax"],
];

export const DETAIL_ROWS = [
  ["세전 급여", "gross_pay"],
  ["상여금/성과급", "bonus_pay"],
  ...DEDUCTION_ROWS,
];
