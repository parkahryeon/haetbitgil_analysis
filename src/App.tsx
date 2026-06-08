import { useMemo, useState } from 'react'
import {
  calculateSolarOutputs,
  calculateInstallationCost,
  estimateMonthlyUsage,
  formatKRW,
} from './utils/calculations'
import type { SolarInputs, SolarOutputs } from './utils/calculations'
import './App.css'

const initialInputs: SolarInputs = {
  scenario: 'self',
  financeType: 'own',
  location: 'rooftop',
  systemSize: 5,
  installationCost: 5000000,
  gridConnectionCost: 500000,
  guaranteeFee: 0,
  annualProduction: 19000,
  annualOandM: 150000,
  subsidy: 2000000,
  monthlyElectricityCost: 150000,
  ratePlan: 'general',
  monthlyUsage: 430,
  smpPrice: 210,
  recPrice: 120,
  discountRate: 5,
  loanRate: 4.5,
  loanTerm: 10,
}

function App() {
  const [inputs, setInputs] = useState<SolarInputs>(initialInputs)

  const outputs: SolarOutputs = useMemo(
    () => calculateSolarOutputs(inputs),
    [inputs],
  )

  const handleNumber = (field: keyof SolarInputs, value: string) => {
    let newInputs = { ...inputs, [field]: Number(value) }
    if (field === 'systemSize') {
      newInputs.installationCost = calculateInstallationCost(inputs.location, Number(value))
    }
    if (field === 'monthlyElectricityCost') {
      newInputs.monthlyUsage = estimateMonthlyUsage(Number(value), inputs.ratePlan)
    }
    setInputs(newInputs)
  }

  const handleChange = (field: keyof SolarInputs, value: string | number) => {
    let newInputs = { ...inputs, [field]: value }
    if (field === 'ratePlan') {
      newInputs.monthlyUsage = estimateMonthlyUsage(inputs.monthlyElectricityCost, value as any)
    }
    if (field === 'location') {
      newInputs.installationCost = calculateInstallationCost(value as any, inputs.systemSize)
    }
    setInputs(newInputs)
  }

  return (
    <main className="app-shell">
      <header className="hero-block">
        <div>
          <p className="eyebrow">Solar Economy Planner</p>
          <h1>태양광 설치 경제성 분석기</h1>
          <p className="lead">
            설치 위치와 용량에 따른 자동 계산으로 20년 운영 시 경제성을 분석합니다.
            효율 감소와 요금제를 반영한 정확한 수익성 평가가 가능합니다.
          </p>
        </div>
      </header>

      <section className="grid-two">
        <article className="card form-card">
          <h2>입력 정보</h2>

          <div className="field-group">
            <label>설치 목적</label>
            <div className="button-group">
              <button
                type="button"
                className={inputs.scenario === 'self' ? 'active' : ''}
                onClick={() => handleChange('scenario', 'self')}
              >
                자가소비
              </button>
              <button
                type="button"
                className={inputs.scenario === 'sell' ? 'active' : ''}
                onClick={() => handleChange('scenario', 'sell')}
              >
                판매
              </button>
            </div>
          </div>

          <div className="field-group">
            <label>설치 위치</label>
            <div className="button-group">
              <button
                type="button"
                className={inputs.location === 'rooftop' ? 'active' : ''}
                onClick={() => handleChange('location', 'rooftop')}
              >
                옥상 (100만원/kW)
              </button>
              <button
                type="button"
                className={inputs.location === 'ground' ? 'active' : ''}
                onClick={() => handleChange('location', 'ground')}
              >
                토지 (120만원/kW)
              </button>
            </div>
          </div>

          <div className="field-grid">
            <label>
              설치 비용 (자동 계산, 원)
              <input type="text" disabled value={formatKRW(inputs.installationCost)} />
            </label>
            <label>
              계통연계비 (원)
              <input
                type="number"
                min="0"
                value={inputs.gridConnectionCost}
                onChange={(event) => handleNumber('gridConnectionCost', event.target.value)}
              />
            </label>
          </div>

          <div className="field-grid">
            <label>
              연 유지보수 비용 (원)
              <input
                type="number"
                min="0"
                value={inputs.annualOandM}
                onChange={(event) => handleNumber('annualOandM', event.target.value)}
              />
            </label>
            {inputs.financeType === 'building' && (
              <label>
                보조금 / 지원금 (원)
                <input
                  type="number"
                  min="0"
                  value={inputs.subsidy}
                  onChange={(event) => handleNumber('subsidy', event.target.value)}
                />
              </label>
            )}
            {inputs.financeType === 'factoring' && (
              <label>
                보증보험료 (원)
                <input
                  type="number"
                  min="0"
                  value={inputs.guaranteeFee}
                  onChange={(event) => handleNumber('guaranteeFee', event.target.value)}
                />
              </label>
            )}
          </div>

          <div className="field-group">
            <label>자금 조달</label>
            <div className="button-group">
              <button
                type="button"
                className={inputs.financeType === 'own' ? 'active' : ''}
                onClick={() => handleChange('financeType', 'own')}
              >
                자기자본
              </button>
              <button
                type="button"
                className={inputs.financeType === 'building' ? 'active' : ''}
                onClick={() => handleChange('financeType', 'building')}
              >
                건물지원사업
              </button>
              <button
                type="button"
                className={inputs.financeType === 'factoring' ? 'active' : ''}
                onClick={() => handleChange('financeType', 'factoring')}
              >
                무자본 팩토링
              </button>
            </div>
          </div>

          <div className="field-grid">
            <label>
              할인율 (%)
              <input
                type="number"
                min="0"
                step="0.1"
                value={inputs.discountRate}
                onChange={(event) => handleNumber('discountRate', event.target.value)}
              />
            </label>
            {inputs.financeType !== 'own' && (
              <>
                <label>
                  대출 금리 (%)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inputs.loanRate}
                    onChange={(event) => handleNumber('loanRate', event.target.value)}
                  />
                </label>
                <label>
                  대출 기간 (년)
                  <input
                    type="number"
                    min="1"
                    value={inputs.loanTerm}
                    onChange={(event) => handleNumber('loanTerm', event.target.value)}
                  />
                </label>
              </>
            )}
          </div>

          {inputs.scenario === 'self' ? (
            <div className="fieldset-block">
              <h3>자가소비 입력</h3>
              <div className="field-grid">
                <label>
                  월 평균 전기요금 (원)
                  <input
                    type="number"
                    min="0"
                    value={inputs.monthlyElectricityCost}
                    onChange={(event) => handleNumber('monthlyElectricityCost', event.target.value)}
                  />
                </label>
              </div>
              <div className="field-group">
                <label>요금제</label>
                <div className="button-group">
                  <button
                    type="button"
                    className={inputs.ratePlan === 'general' ? 'active' : ''}
                    onClick={() => handleChange('ratePlan', 'general')}
                  >
                    일반가정
                  </button>
                  <button
                    type="button"
                    className={inputs.ratePlan === 'progressive' ? 'active' : ''}
                    onClick={() => handleChange('ratePlan', 'progressive')}
                  >
                    누진요금제
                  </button>
                  <button
                    type="button"
                    className={inputs.ratePlan === 'nighttime' ? 'active' : ''}
                    onClick={() => handleChange('ratePlan', 'nighttime')}
                  >
                    심야전력
                  </button>
                  <button
                    type="button"
                    className={inputs.ratePlan === 'industrial' ? 'active' : ''}
                    onClick={() => handleChange('ratePlan', 'industrial')}
                  >
                    산업용
                  </button>
                </div>
              </div>
              <div className="field-grid">
                <label>
                  월 평균 사용량 (자동 계산, kWh)
                  <input type="text" disabled value={inputs.monthlyUsage.toFixed(0)} />
                </label>
              </div>
              <p className="help-text">월평균 전기요금과 요금제를 통해 예상 사용량이 자동 계산됩니다.</p>
            </div>
          ) : (
            <div className="fieldset-block">
              <h3>판매 입력</h3>
              <div className="field-grid">
                <label>
                  SMP 단가 (원/kWh)
                  <input
                    type="number"
                    min="0"
                    value={inputs.smpPrice}
                    onChange={(event) => handleNumber('smpPrice', event.target.value)}
                  />
                </label>
                <label>
                  REC 단가 (원/kWh)
                  <input
                    type="number"
                    min="0"
                    value={inputs.recPrice}
                    onChange={(event) => handleNumber('recPrice', event.target.value)}
                  />
                </label>
              </div>
              <p className="help-text">발전 판매 수익은 SMP와 REC를 합산한 가격으로 계산됩니다.</p>
            </div>
          )}
        </article>

        <article className="card result-card">
          <h2>경제성 결과 (20년 기준)</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">1년차 수익/절감액</span>
              <strong>{formatKRW(outputs.annualRevenue)}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">연간 O&M 비용</span>
              <strong>{formatKRW(inputs.annualOandM)}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">연간 대출 상환액</span>
              <strong>{formatKRW(outputs.annualLoanPayment)}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">1년차 순현금흐름</span>
              <strong>{formatKRW(outputs.annualNetCashFlow)}</strong>
            </div>
          </div>

          <div className="summary-block">
            <h3>투자금액 상세</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">설치 비용</span>
                <span className="detail-value">{formatKRW(outputs.installationCost)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">계통연계비</span>
                <span className="detail-value">{formatKRW(outputs.gridConnectionCost)}</span>
              </div>
              {outputs.subsidy > 0 && (
                <div className="detail-item">
                  <span className="detail-label">보조금</span>
                  <span className="detail-value">- {formatKRW(outputs.subsidy)}</span>
                </div>
              )}
              {outputs.guaranteeFee > 0 && (
                <div className="detail-item">
                  <span className="detail-label">보증보험료</span>
                  <span className="detail-value">{formatKRW(outputs.guaranteeFee)}</span>
                </div>
              )}
              <div className="detail-item highlight">
                <span className="detail-label"><strong>총 투자금액</strong></span>
                <span className="detail-value"><strong>{formatKRW(outputs.totalInvestment)}</strong></span>
              </div>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card wide">
              <span className="metric-label">초기 투자 (보조금 적용)</span>
              <strong>{formatKRW(outputs.initialInvestment)}</strong>
            </div>
            <div className="metric-card wide">
              <span className="metric-label">회수 기간</span>
              <strong>
                {outputs.paybackPeriod === null ? '20년 초과' : `${outputs.paybackPeriod.toFixed(1)}년`}
              </strong>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card wide">
              <span className="metric-label">20년 누적 수익</span>
              <strong>{formatKRW(outputs.cumulative20)}</strong>
            </div>
            <div className="metric-card wide">
              <span className="metric-label">NPV (할인율 {inputs.discountRate}%)</span>
              <strong>{formatKRW(outputs.npv)}</strong>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card wide">
              <span className="metric-label">IRR</span>
              <strong>{outputs.irr === null ? '계산 불가' : `${outputs.irr.toFixed(2)}%`}</strong>
            </div>
          </div>

          <section className="summary-block">
            <h3>핵심 가정</h3>
            <ul>
              <li>기준 발전량 = 설치용량 × 3.8시간/일</li>
              <li>모듈 효율 저하율 = 연 0.03%</li>
              <li>자가소비 = 발전량과 소비량 중 최소값</li>
              <li>판매 = 발전량 × (SMP + REC)</li>
            </ul>
          </section>

          <section className="table-block">
            <h3>20년 연도별 현금흐름</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>연도</th>
                    <th>수익</th>
                    <th>O&M</th>
                    <th>대출</th>
                    <th>순현금흐름</th>
                    <th>누적</th>
                  </tr>
                </thead>
                <tbody>
                  {outputs.cashflowSchedule.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td>{formatKRW(row.revenue)}</td>
                      <td>{formatKRW(row.oandm)}</td>
                      <td>{formatKRW(row.financing)}</td>
                      <td>{formatKRW(row.net)}</td>
                      <td>{formatKRW(row.cumulative)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </article>
      </section>

      <section className="note-block">
        <h2>빠른 확인 포인트</h2>
        <p>
          설치 위치(옥상/토지)와 용량을 입력하면 설치 비용이 자동 계산됩니다.
          자가소비는 요금제별 단가를 적용하며, 20년 운영 중 매년 모듈 효율이 0.03% 감소함을 반영합니다.
          IRR과 NPV로 투자 수익성을 종합 평가할 수 있습니다.
        </p>
      </section>
    </main>
  )
}

export default App
