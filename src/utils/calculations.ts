export type ScenarioType = 'self' | 'sell'
export type FinanceType = 'own' | 'loan'
export type LocationType = 'rooftop' | 'ground'
export type RatePlanType = 'general' | 'progressive' | 'nighttime' | 'industrial'

export interface SolarInputs {
  scenario: ScenarioType
  financeType: FinanceType
  location: LocationType
  systemSize: number
  installationCost: number
  annualProduction: number
  annualOandM: number
  subsidy: number
  monthlyElectricityCost: number
  ratePlan: RatePlanType
  monthlyUsage: number
  smpPrice: number
  recPrice: number
  discountRate: number
  loanRate: number
  loanTerm: number
}

export interface CashflowYear {
  year: number
  revenue: number
  oandm: number
  financing: number
  net: number
  cumulative: number
}

export interface SolarOutputs {
  unitElectricityCost: number
  annualRevenue: number
  annualLoanPayment: number
  initialInvestment: number
  annualNetCashFlow: number
  cashflowSchedule: CashflowYear[]
  cumulative20: number
  paybackPeriod: number | null
  npv: number
  irr: number | null
}

export function formatKRW(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

// 설치 비용 자동 계산
export function calculateInstallationCost(location: LocationType, systemSize: number): number {
  const costPerKw = location === 'rooftop' ? 1000000 : 1200000
  return systemSize * costPerKw
}

// 요금제별 kWh당 단가 계산
export function getUnitPriceByPlan(ratePlan: RatePlanType, monthlyUsage: number): number {
  if (ratePlan === 'general') {
    return 160
  }
  if (ratePlan === 'progressive') {
    // 누진요금제: 200kWh 이하 140원, 초과분 210원 (평균)
    if (monthlyUsage <= 200) {
      return 140
    }
    const excess = monthlyUsage - 200
    return (200 * 140 + excess * 210) / monthlyUsage
  }
  if (ratePlan === 'nighttime') {
    return 85
  }
  if (ratePlan === 'industrial') {
    // 산업용: 일반적으로 가정용보다 낮은 단가 적용
    return 120
  }
  return 160
}

// 월평균 사용량 역계산 (월전기요금 / 추정 단가)
export function estimateMonthlyUsage(monthlyElectricityCost: number, ratePlan: RatePlanType): number {
  let estimatedUsage = monthlyElectricityCost / 160

  for (let i = 0; i < 3; i += 1) {
    const unitPrice = getUnitPriceByPlan(ratePlan, estimatedUsage)
    estimatedUsage = monthlyElectricityCost / unitPrice
  }

  return Math.max(0, estimatedUsage)
}

// 연도별 발전량 계산 (효율 감소율 적용)
export function calculateAnnualProduction(
  systemSize: number,
  yearIndex: number,
  baseHoursPerDay: number = 4.2,
): number {
  // 기준 발전량 = 설치용량 × 일평균 발전시간 × 365일
  const baseProduction = systemSize * baseHoursPerDay * 365

  // 연간 효율 감소율 0.5% 적용 (더 정확한 값)
  const efficiencyDegradation = Math.pow(1 - 0.005, yearIndex)

  return baseProduction * efficiencyDegradation
}

export function amortizingPayment(principal: number, annualRate: number, years: number) {
  if (principal <= 0 || years <= 0) {
    return 0
  }
  const monthlyRate = annualRate / 100 / 12
  if (monthlyRate === 0) {
    return principal / (years * 12)
  }
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -years * 12))
}

export function calculateSolarOutputs(inputs: SolarInputs): SolarOutputs {
  const monthlyUsage = estimateMonthlyUsage(inputs.monthlyElectricityCost, inputs.ratePlan)
  const unitCost = getUnitPriceByPlan(inputs.ratePlan, monthlyUsage)
  
  const subsidy = Math.min(Math.max(inputs.subsidy, 0), inputs.installationCost)
  const netInvestment = Math.max(inputs.installationCost - subsidy, 0)
  const annualLoanPayment = inputs.financeType === 'loan' ? amortizingPayment(netInvestment, inputs.loanRate, inputs.loanTerm) * 12 : 0
  
  const initialCashflow = inputs.financeType === 'own' ? -netInvestment : 0
  
  const schedule: CashflowYear[] = []
  let cumulative = initialCashflow
  let firstYearRevenue = 0

  for (let year = 1; year <= 20; year += 1) {
    const yearProduction = calculateAnnualProduction(inputs.systemSize, year - 1)
    
    let revenue = 0
    if (inputs.scenario === 'self') {
      const annualConsumption = monthlyUsage * 12
      revenue = Math.min(yearProduction, annualConsumption) * unitCost
    } else {
      revenue = yearProduction * (inputs.smpPrice + inputs.recPrice)
    }
    
    if (year === 1) {
      firstYearRevenue = revenue
    }
    
    const yearNet = revenue - inputs.annualOandM - annualLoanPayment
    cumulative += yearNet
    schedule.push({
      year,
      revenue,
      oandm: inputs.annualOandM,
      financing: annualLoanPayment,
      net: yearNet,
      cumulative,
    })
  }

  const cumulative20 = schedule[schedule.length - 1]?.cumulative ?? initialCashflow
  const paybackPeriod = calculatePaybackPeriod(initialCashflow, firstYearRevenue - inputs.annualOandM - annualLoanPayment)
  const npv = calculateNPV(initialCashflow, schedule, inputs.discountRate)
  const irr = calculateIRR(initialCashflow, schedule)

  return {
    unitElectricityCost: unitCost,
    annualRevenue: firstYearRevenue,
    annualLoanPayment,
    initialInvestment: netInvestment,
    annualNetCashFlow: firstYearRevenue - inputs.annualOandM - annualLoanPayment,
    cashflowSchedule: schedule,
    cumulative20,
    paybackPeriod,
    npv,
    irr,
  }
}

function calculatePaybackPeriod(initial: number, annualNet: number) {
  if (annualNet <= 0) {
    return null
  }
  if (initial >= 0) {
    return 0
  }
  return Math.max(0, -initial / annualNet)
}

function calculateNPV(initial: number, schedule: CashflowYear[], discountRate: number) {
  const rate = discountRate / 100
  let npv = initial

  for (const year of schedule) {
    npv += year.net / Math.pow(1 + rate, year.year)
  }

  return npv
}

function calculateIRR(initial: number, schedule: CashflowYear[]) {
  if (schedule.length === 0) {
    return null
  }

  let low = -0.99
  let high = 1
  let irr: number | null = null

  const npvAtRate = (rate: number) => {
    let sum = initial
    for (const year of schedule) {
      sum += year.net / Math.pow(1 + rate, year.year)
    }
    return sum
  }

  if (npvAtRate(low) * npvAtRate(high) > 0) {
    return null
  }

  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2
    const value = npvAtRate(mid)
    if (Math.abs(value) < 1e-3) {
      irr = mid
      break
    }
    if (value > 0) {
      low = mid
    } else {
      high = mid
    }
  }

  if (irr === null) {
    irr = (low + high) / 2
  }

  return irr * 100
}
