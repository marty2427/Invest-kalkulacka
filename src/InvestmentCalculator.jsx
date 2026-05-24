import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ════════════════════════════════════════════════════════════════════
//  POMOCNÉ FUNKCE
// ════════════════════════════════════════════════════════════════════

const fmtCZK = (v) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(Math.round(v || 0));

const fmtNum = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '';
  return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(v);
};

const fmtPct = (v) => `${v.toFixed(1).replace('.', ',')} %`;

const fmtPctChange = (val, contrib) => {
  if (contrib <= 0) return '—';
  const pct = (val / contrib - 1) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')} %`;
};

const parseNum = (s) => {
  if (s === null || s === undefined || s === '') return 0;
  const cleaned = String(s).replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};

function simulate({ initial, monthly, years, contribGrowth, inflation, grossReturn }) {
  const rMonthly = Math.pow(1 + grossReturn / 100, 1 / 12) - 1;
  const data = [];
  let value = initial;
  let totalIn = initial;
  let curMonthly = monthly;

  data.push({
    year: 0, value, contributed: totalIn, valueReal: value, gain: 0, gainReal: 0,
  });

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value *= 1 + rMonthly;
      value += curMonthly;
      totalIn += curMonthly;
    }
    if (contribGrowth > 0) curMonthly *= 1 + contribGrowth / 100;

    const inflFactor = Math.pow(1 + inflation / 100, y);
    const valueReal = value / inflFactor;

    data.push({
      year: y,
      value: Math.round(value),
      contributed: Math.round(totalIn),
      valueReal: Math.round(valueReal),
      gain: Math.round(value - totalIn),
      gainReal: Math.round(valueReal - totalIn),
    });
  }
  return data;
}

function findRequiredMonthly({ initial, nominalTarget, years, contribGrowth, inflation, grossReturn }) {
  if (years <= 0) return Infinity;
  const finalValueAt = (monthly) => {
    const d = simulate({ initial, monthly, years, contribGrowth, inflation, grossReturn });
    return d[d.length - 1].value;
  };
  if (finalValueAt(0) >= nominalTarget) return 0;
  let low = 0;
  let high = Math.max(nominalTarget / (years * 12), 1000);
  for (let i = 0; i < 25; i++) {
    if (finalValueAt(high) >= nominalTarget) break;
    high *= 2;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (finalValueAt(mid) < nominalTarget) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// ════════════════════════════════════════════════════════════════════
//  UI KOMPONENTY
// ════════════════════════════════════════════════════════════════════

function ChevronToggle({ open }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span
        style={{
          color: '#A84E2E',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontWeight: 500,
        }}
      >
        {open ? 'Skrýt' : 'Zobrazit'}
      </span>
      <span
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          backgroundColor: '#FFFFFF',
          border: '1px solid rgba(217, 119, 87, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(217, 119, 87, 0.15)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#D97757" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

function ModernToggle({ value, onChange, options }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px',
        backgroundColor: '#F0E5D0',
        borderRadius: '9999px',
        border: '2px solid #A47148',
        boxShadow: 'inset 0 2px 5px rgba(60,40,20,0.12)',
      }}
    >
      {options.map((opt, idx) => {
        const isActive = value === opt.value;
        const isHover = hoverIdx === idx;
        const activeStyle = {
          background: 'linear-gradient(180deg, #D87358 0%, #BE5530 100%)',
          color: '#FFFFFF',
          textShadow: '0 1px 3px rgba(70, 25, 5, 0.55)',
          border: '1.5px solid #9A4623',
          boxShadow: '0 5px 18px rgba(190, 85, 48, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
          fontWeight: 800,
        };
        const inactiveStyle = {
          background: isHover ? 'rgba(255, 255, 255, 0.75)' : 'transparent',
          color: '#1C1917',
          border: '1.5px solid transparent',
          boxShadow: 'none',
          textShadow: 'none',
          fontWeight: 700,
        };
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              padding: '12px 32px',
              fontSize: '15px',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              borderRadius: '9999px',
              cursor: 'pointer',
              transition: 'all 220ms ease',
              fontFamily: "'Inter', system-ui, sans-serif",
              ...(isActive ? activeStyle : inactiveStyle),
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({ label, value, onChange, suffix, hint }) {
  const inputRef = useRef(null);
  const cursorTarget = useRef(null);

  useLayoutEffect(() => {
    if (cursorTarget.current !== null && inputRef.current) {
      const formatted = fmtNum(value);
      let pos = 0;
      let digits = 0;
      while (digits < cursorTarget.current && pos < formatted.length) {
        if (/\d/.test(formatted[pos])) digits++;
        pos++;
      }
      inputRef.current.setSelectionRange(pos, pos);
      cursorTarget.current = null;
    }
  });

  const handleChange = (e) => {
    const newVal = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    const digitsBeforeCursor = (newVal.slice(0, cursorPos).match(/\d/g) || []).length;
    cursorTarget.current = digitsBeforeCursor;
    onChange(parseNum(newVal));
  };

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: '#78716C',
          marginBottom: '8px',
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <div
        className="ms-input-wrapper"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5DDD0',
          borderRadius: '6px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={fmtNum(value)}
          onFocus={(e) => setTimeout(() => e.target.select(), 0)}
          onChange={handleChange}
          style={{
            flex: 1,
            background: 'transparent',
            padding: '12px 14px',
            color: '#1C1917',
            outline: 'none',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '22px',
            fontVariantNumeric: 'tabular-nums',
            border: 'none',
            minWidth: 0,
            width: '100%',
          }}
        />
        {suffix && (
          <span
            style={{
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              color: '#A47148',
              fontSize: '14px',
              borderLeft: '1px solid #E5DDD0',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p
          style={{
            fontSize: '11px',
            color: '#78716C',
            marginTop: '8px',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function PremiumSlider({ label, value, onChange, min, max, step = 1, suffix, hint }) {
  const pct = ((value - min) / (max - min)) * 100;
  const safePct = Math.min(100, Math.max(0, pct));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <label
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: '#78716C',
            fontWeight: 500,
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '20px',
            color: '#1C1917',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value.toLocaleString('cs-CZ', { maximumFractionDigits: step < 1 ? 1 : 0 })}
          <span style={{ marginLeft: '6px', fontSize: '12px', color: '#A47148', fontWeight: 500 }}>{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--val': `${safePct}%` }}
        className="premium-slider"
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#A8A29E',
          marginTop: '6px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {hint && (
        <p
          style={{
            fontSize: '11px',
            color: '#78716C',
            marginTop: '8px',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, accent = 'neutral', sub }) {
  const borderColors = {
    neutral: '#D4C5B0',
    gold: '#A47148',
    green: '#6B8E4E',
    orange: '#D97757',
  };
  const valueColors = {
    neutral: '#1C1917',
    gold: '#7A5734',
    green: '#4F6B3A',
    orange: '#A84E2E',
  };
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5DDD0',
        borderLeft: `4px solid ${borderColors[accent]}`,
        borderRadius: '6px',
        padding: '18px',
        boxShadow: '0 1px 3px rgba(60,40,20,0.04)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: '#57534E',
          marginBottom: '10px',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(1.1rem, 2vw, 1.65rem)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15,
          textAlign: 'right',
          color: valueColors[accent],
          wordBreak: 'normal',
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: '11px',
            color: '#78716C',
            marginTop: '8px',
            fontStyle: 'italic',
            textAlign: 'right',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5DDD0',
        borderRadius: '8px',
        padding: '32px 28px',
        boxShadow: '0 1px 3px rgba(60,40,20,0.04)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h3
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.75rem, 2.5vw, 2.15rem)',
            color: '#1C1917',
            letterSpacing: '-0.01em',
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        <div
          style={{
            marginTop: '14px',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: '72px',
            height: '3px',
            backgroundColor: '#D97757',
            borderRadius: '9999px',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          flex: 1,
          justifyContent: 'space-around',
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
//  HLAVNÍ KOMPONENTA
// ════════════════════════════════════════════════════════════════════
export default function InvestmentCalculator() {
  const [activeTab, setActiveTab] = useState('growth');

  const [initial, setInitial] = useState(100_000);
  const [monthly, setMonthly] = useState(5_000);
  const [years, setYears] = useState(20);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [inflation, setInflation] = useState(3);
  const [valorization, setValorization] = useState(3);
  const [displayMode, setDisplayMode] = useState('nominal');
  const [tableOpen, setTableOpen] = useState(false);

  const [targetAmount, setTargetAmount] = useState(3_000_000);
  const [targetInitial, setTargetInitial] = useState(50_000);
  const [targetYears, setTargetYears] = useState(20);
  const [targetReturn, setTargetReturn] = useState(7);
  const [targetInflation, setTargetInflation] = useState(3);
  const [targetValorization, setTargetValorization] = useState(0);
  const [goalMode, setGoalMode] = useState('nominal');

  const data = useMemo(
    () => simulate({ initial, monthly, years, contribGrowth: valorization, inflation, grossReturn: annualReturn }),
    [initial, monthly, years, valorization, inflation, annualReturn],
  );
  const final = data[data.length - 1];
  const isReal = displayMode === 'real';
  const lossOfPurchasingPower = (1 - 1 / Math.pow(1 + inflation / 100, years)) * 100;

  const nominalTarget = useMemo(
    () =>
      goalMode === 'real'
        ? targetAmount * Math.pow(1 + targetInflation / 100, targetYears)
        : targetAmount,
    [targetAmount, goalMode, targetInflation, targetYears],
  );

  const reqMonthly = useMemo(
    () =>
      findRequiredMonthly({
        initial: targetInitial,
        nominalTarget,
        years: targetYears,
        contribGrowth: targetValorization,
        inflation: targetInflation,
        grossReturn: targetReturn,
      }),
    [targetInitial, nominalTarget, targetYears, targetValorization, targetInflation, targetReturn],
  );

  const goalData = useMemo(
    () =>
      simulate({
        initial: targetInitial,
        monthly: reqMonthly,
        years: targetYears,
        contribGrowth: targetValorization,
        inflation: targetInflation,
        grossReturn: targetReturn,
      }),
    [targetInitial, reqMonthly, targetYears, targetValorization, targetInflation, targetReturn],
  );
  const goalFinal = goalData[goalData.length - 1];

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5DDD0',
          borderRadius: '6px',
          padding: '12px 16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            color: '#A84E2E',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '14px',
            marginBottom: '8px',
            borderBottom: '1px solid #F0EBE0',
            paddingBottom: '6px',
          }}
        >
          Rok {label}
        </div>
        {payload.map((p, i) => (
          <div
            key={i}
            style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontVariantNumeric: 'tabular-nums',
              margin: '4px 0',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                background: p.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#57534E' }}>{p.name}:</span>
            <span style={{ fontWeight: 500, marginLeft: 'auto', color: '#1C1917' }}>{fmtCZK(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Inputy renderované do 2 sloupců ───
  const growthInputs = (
    <>
      <SectionCard title="Vklady a horizont">
        <div className="ms-input-row">
          <NumberInput label="Jednorázový" value={initial} onChange={setInitial} suffix="Kč" />
          <NumberInput label="Měsíční" value={monthly} onChange={setMonthly} suffix="Kč" />
        </div>
        <PremiumSlider
          label="Valorizace vkladu"
          value={valorization}
          onChange={setValorization}
          min={0} max={10} step={0.5}
          suffix="% ročně"
          hint="O kolik se každý rok zvýší měsíční vklad — pomáhá udržet krok s růstem mezd a inflací."
        />
        <PremiumSlider
          label="Investiční horizont"
          value={years}
          onChange={setYears}
          min={1} max={50} step={1}
          suffix="let"
        />
      </SectionCard>
      <SectionCard title="Výnos a inflace" distributeEvenly>
        <PremiumSlider
          label="Roční výnos portfolia"
          value={annualReturn}
          onChange={setAnnualReturn}
          min={0} max={15} step={0.5}
          suffix="% p.a."
          hint="📈 MSCI World za posledních ~30 let dosáhl průměrného výnosu ~9 % p.a. (1987–2025, v USD)."
        />
        <PremiumSlider
          label="Roční inflace"
          value={inflation}
          onChange={setInflation}
          min={0} max={10} step={0.1}
          suffix="%"
          hint="📊 Průměrná inflace v ČR za posledních 20 let činí ~3 % p.a. (zdroj: ČSÚ / investujeme.cz)"
        />
      </SectionCard>
    </>
  );

  const goalInputs = (
    <>
      <SectionCard title="Cíl a vstupní vklad">
        <NumberInput
          label="Cílová částka"
          value={targetAmount}
          onChange={setTargetAmount}
          suffix="Kč"
          hint={goalMode === 'real' ? 'Zadáno v dnešní kupní síle' : 'Zadáno jako nominální (budoucí) hodnota'}
        />
        <NumberInput
          label="Jednorázový vklad nyní"
          value={targetInitial}
          onChange={setTargetInitial}
          suffix="Kč"
          hint="Volitelné — snižuje potřebný měsíční vklad."
        />
        <PremiumSlider
          label="Valorizace vkladu"
          value={targetValorization}
          onChange={setTargetValorization}
          min={0} max={10} step={0.5}
          suffix="% ročně"
        />
      </SectionCard>
      <SectionCard title="Horizont, výnos a inflace">
        <PremiumSlider label="Za jak dlouho" value={targetYears} onChange={setTargetYears} min={1} max={50} step={1} suffix="let" />
        <PremiumSlider
          label="Očekávaný výnos"
          value={targetReturn}
          onChange={setTargetReturn}
          min={0.5} max={15} step={0.5}
          suffix="% p.a."
          hint="📈 MSCI World za posledních ~30 let dosáhl ~9 % p.a. (1987–2025, v USD)."
        />
        <PremiumSlider
          label="Roční inflace"
          value={targetInflation}
          onChange={setTargetInflation}
          min={0} max={10} step={0.1}
          suffix="%"
          hint="📊 Průměrná inflace v ČR za posledních 20 let činí ~3 % p.a."
        />
      </SectionCard>
    </>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        color: '#1C1917',
        background: 'radial-gradient(ellipse at top, #FAF8F2 0%, #F5F1E8 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap');

        .ms-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        @media (min-width: 768px) {
          .ms-container { padding: 56px 40px; }
        }

        /* HLAVNÍ LAYOUT — sloupce inputů */
        .ms-inputs-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        @media (min-width: 900px) {
          .ms-inputs-grid {
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            align-items: start;
          }
        }

        /* Vstupy uvnitř Vklady (jednorázový + měsíční) */
        .ms-input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* STAT karty */
        .ms-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (min-width: 720px) {
          .ms-stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }
        .ms-stats-grid-3 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        @media (min-width: 720px) {
          .ms-stats-grid-3 { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }

        .ms-input-wrapper:focus-within {
          border-color: #D97757 !important;
          box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.15) !important;
        }

        .premium-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 24px;
          background: transparent;
          outline: none;
          cursor: pointer;
          padding: 0;
          margin: 0;
        }
        .premium-slider::-webkit-slider-runnable-track {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            #BE5530 0%,
            #D97757 var(--val, 0%),
            #EADFCB var(--val, 0%),
            #EADFCB 100%
          );
        }
        .premium-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #D97757;
          cursor: grab;
          box-shadow: 0 3px 10px rgba(217, 119, 87, 0.35);
          transition: transform 0.15s ease;
          margin-top: -7px;
        }
        .premium-slider::-webkit-slider-thumb:hover { transform: scale(1.08); }
        .premium-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.12); }
        .premium-slider::-moz-range-track {
          height: 10px;
          border-radius: 999px;
          background: #EADFCB;
        }
        .premium-slider::-moz-range-progress {
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(to right, #BE5530, #D97757);
        }
        .premium-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #D97757;
          cursor: grab;
          box-shadow: 0 3px 10px rgba(217, 119, 87, 0.35);
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        .ms-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          color: #1C1917;
          letter-spacing: -0.02em;
          line-height: 1.05;
          margin: 0;
          text-align: center;
          font-weight: 600;
        }

        .ms-hero-underline {
          margin: 24px auto 0;
          height: 3px;
          width: 100%;
          max-width: 1400px;
          background: linear-gradient(
            to right,
            transparent 0%,
            #D97757 15%,
            #BE5530 50%,
            #D97757 85%,
            transparent 100%
          );
          border-radius: 9999px;
          box-shadow: 0 1px 3px rgba(217, 119, 87, 0.25);
        }

        .ms-result-amount {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 700;
          color: #1C1917;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          word-break: break-word;
        }

        .ms-bg-dots {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle at 1px 1px, rgba(28, 25, 23, 0.22) 1px, transparent 0);
          background-size: 22px 22px;
          z-index: 0;
        }

        .ms-section-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.5rem;
          color: #1C1917;
          letter-spacing: -0.01em;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
        }

        .ms-table-base {
          width: 100%;
          font-size: 15px;
          border-collapse: collapse;
        }
        .ms-table-base th { padding: 14px; font-weight: 600; text-align: center; }
        .ms-table-base td {
          padding: 14px;
          text-align: center;
          font-family: 'Playfair Display', Georgia, serif;
          font-variant-numeric: tabular-nums;
        }
        @media (max-width: 720px) {
          .ms-table-base { font-size: 12px; }
          .ms-table-base th, .ms-table-base td { padding: 8px 4px; }
        }
      `}</style>

      {/* TEČKY NA POZADÍ — výraznější */}
      <div className="ms-bg-dots" />

      <div className="ms-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* ─── HEADER ─── */}
        <header style={{ marginBottom: '40px' }}>
          <h1 className="ms-hero-title">Investiční kalkulačka</h1>
          <div className="ms-hero-underline" />
        </header>

        {/* HLAVNÍ TAB PŘEPÍNAČ */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <ModernToggle
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: 'growth', label: 'Růst investice' },
              { value: 'goal', label: 'Cílová částka' },
            ]}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  RŮST INVESTICE                                                */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'growth' && (
          <>
            {/* INPUTY — 2 SLOUPCE VEDLE SEBE (Vklady | Výnos, horizont a inflace) */}
            <div className="ms-inputs-grid">{growthInputs}</div>

            {/* Display mode toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '72px 0 48px' }}>
              <ModernToggle
                value={displayMode}
                onChange={setDisplayMode}
                options={[
                  { value: 'nominal', label: 'Nominální hodnota' },
                  { value: 'real', label: 'Reálná hodnota' },
                ]}
              />
            </div>

            {/* VÝSLEDEK */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FBF4E7 0%, #FFFFFF 50%, #FBF4E7 100%)',
                border: '1px solid #D9C5A0',
                borderRadius: '10px',
                padding: '36px 24px',
                boxShadow: '0 4px 20px rgba(217, 119, 87, 0.12)',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3em',
                  color: '#A84E2E',
                  marginBottom: '14px',
                  fontWeight: 500,
                }}
              >
                Konečná hodnota investice {isReal ? '(reálně)' : '(nominálně)'}
              </div>
              <div className="ms-result-amount">{fmtCZK(isReal ? final.valueReal : final.value)}</div>
              <div
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '12px 32px',
                  fontSize: '14px',
                  color: '#57534E',
                }}
              >
                <span>Za <span style={{ color: '#1C1917' }}>{years} let</span></span>
                <span>Výnos <span style={{ color: '#1C1917' }}>{fmtPct(annualReturn)} p.a.</span></span>
                <span>
                  Z toho zhodnocení{' '}
                  <span style={{ color: '#A84E2E', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtCZK(isReal ? final.gainReal : final.gain)}
                  </span>
                </span>
              </div>
            </div>

            {/* STAT KARTY */}
            <div className="ms-stats-grid" style={{ marginBottom: '24px' }}>
              <StatCard label="Celkem vloženo" value={fmtCZK(final.contributed)} accent="neutral" sub="Skutečně z účtu" />
              <StatCard
                label="Zhodnocení"
                value={fmtCZK(isReal ? final.gainReal : final.gain)}
                accent="green"
                sub={fmtPctChange(isReal ? final.valueReal : final.value, final.contributed)}
              />
              <StatCard
                label={isReal ? 'Nominální hodnota' : 'Reálná hodnota'}
                value={fmtCZK(isReal ? final.value : final.valueReal)}
                accent="orange"
                sub={isReal ? 'V budoucích cenách' : `Po inflaci ${fmtPct(inflation)}`}
              />
              <StatCard label="Ztráta kupní síly" value={fmtPct(lossOfPurchasingPower)} accent="gold" sub={`Za ${years} let inflace`} />
            </div>

            {/* GRAF */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DDD0',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(60,40,20,0.04)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 className="ms-section-title">
                  <span style={{ width: '24px', height: '1px', backgroundColor: '#D97757' }} />
                  Vývoj hodnoty v čase
                </h3>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                  {years} let · {fmtPct(annualReturn)} p.a.
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EADFCB" />
                  <XAxis dataKey="year" stroke="#A8A29E" tick={{ fill: '#78716C', fontSize: 11 }} label={{ value: 'Rok', position: 'insideBottom', offset: -3, fill: '#78716C', fontSize: 11 }} />
                  <YAxis stroke="#A8A29E" tick={{ fill: '#78716C', fontSize: 11 }} tickFormatter={(v) => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)} mld.` : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} mil.` : v >= 1000 ? `${(v / 1000).toFixed(0)} tis.` : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="line" />
                  <Line type="monotone" dataKey="contributed" name="Celkem vloženo" stroke="#A8A29E" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey={isReal ? 'valueReal' : 'value'} name="Hodnota investice" stroke="#D97757" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* INFO BOX */}
            <div
              style={{
                backgroundColor: '#FBF4E7',
                border: '1px solid #E5D5B5',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(217, 119, 87, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <span style={{ color: '#A84E2E', fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700 }}>i</span>
                </div>
                <p style={{ fontSize: '14px', color: '#44403C', lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: '#1C1917', fontFamily: "'Playfair Display', serif" }}>Vliv inflace.</strong>{' '}
                  Při inflaci <span style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmtPct(inflation)}</span>{' '}
                  ztratí peníze za {years} let cca{' '}
                  <strong style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums' }}>{fmtPct(lossOfPurchasingPower)}</strong>{' '}
                  své kupní síly. Z konečné nominální hodnoty{' '}
                  <span style={{ color: '#1C1917', fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(final.value)}</span>{' '}
                  odpovídá v dnešních cenách jen{' '}
                  <strong style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(final.valueReal)}</strong>.
                </p>
              </div>
            </div>

            {/* TABULKA */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DDD0',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(60,40,20,0.04)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setTableOpen(!tableOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FBF7EE')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="ms-section-title" style={{ fontSize: '1.25rem' }}>
                  <span style={{ width: '24px', height: '1px', backgroundColor: '#D97757' }} />
                  Detailní rozpis po letech
                </span>
                <ChevronToggle open={tableOpen} />
              </button>
              {tableOpen && (
                <div style={{ overflowX: 'auto', borderTop: '1px solid #E5DDD0' }}>
                  <table className="ms-table-base" style={{ tableLayout: 'fixed' }}>
                    <thead style={{ backgroundColor: '#FBF7EE' }}>
                      <tr style={{ color: '#A84E2E', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        <th style={{ width: '8%' }}>Rok</th>
                        <th style={{ width: '23%' }}>Vloženo</th>
                        <th style={{ width: '23%' }}>Zhodnocení</th>
                        <th style={{ width: '23%' }}>Hodnota</th>
                        <th style={{ width: '23%' }}>Reálná hodnota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #F0EBE0', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FBF9F3' }}>
                          <td style={{ color: '#78716C', fontWeight: 500 }}>{row.year}</td>
                          <td style={{ color: '#44403C' }}>{fmtCZK(row.contributed)}</td>
                          <td style={{ color: '#4F6B3A' }}>{fmtCZK(row.gain)}</td>
                          <td style={{ color: '#1C1917', fontWeight: 500 }}>{fmtCZK(row.value)}</td>
                          <td style={{ color: '#A84E2E', fontWeight: 700 }}>{fmtCZK(row.valueReal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  CÍLOVÁ ČÁSTKA                                                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeTab === 'goal' && (
          <>
            <div className="ms-inputs-grid">{goalInputs}</div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '72px 0 48px' }}>
              <ModernToggle
                value={goalMode}
                onChange={setGoalMode}
                options={[
                  { value: 'nominal', label: 'Nominální hodnota' },
                  { value: 'real', label: 'Dnešní kupní síla' },
                ]}
              />
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #FBF4E7 0%, #FFFFFF 50%, #FBF4E7 100%)',
                border: '1px solid #D9C5A0',
                borderRadius: '10px',
                padding: '36px 24px',
                boxShadow: '0 4px 20px rgba(217, 119, 87, 0.12)',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3em',
                  color: '#A84E2E',
                  marginBottom: '14px',
                  fontWeight: 500,
                }}
              >
                Potřebný měsíční vklad
              </div>
              <div className="ms-result-amount">{fmtCZK(Math.ceil(reqMonthly))}</div>
              <div style={{ marginTop: '20px', fontSize: '14px', color: '#57534E', lineHeight: 1.6 }}>
                abyste za <span style={{ color: '#1C1917', fontWeight: 500 }}>{targetYears} let</span> naspořili{' '}
                {goalMode === 'real' ? (
                  <>
                    <span style={{ color: '#1C1917', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(targetAmount)}</span> v dnešních cenách
                    <span style={{ color: '#78716C' }}> ({fmtCZK(nominalTarget)} nominálně)</span>
                  </>
                ) : (
                  <span style={{ color: '#1C1917', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(targetAmount)}</span>
                )}
              </div>
              {targetValorization > 0 && (
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#78716C', fontStyle: 'italic' }}>
                  Počáteční měsíční vklad — bude se každoročně navyšovat o {targetValorization.toString().replace('.', ',')} %. V posledním roce už budete vkládat ≈{' '}
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#44403C' }}>
                    {fmtCZK(reqMonthly * Math.pow(1 + targetValorization / 100, targetYears - 1))}
                  </span>/měs.
                </div>
              )}
            </div>

            <div className="ms-stats-grid-3" style={{ marginBottom: '24px' }}>
              <StatCard label="Celkem vložíte" value={fmtCZK(goalFinal.contributed)} accent="neutral" />
              <StatCard
                label="Trh vám přidá"
                value={fmtCZK(goalFinal.gain)}
                accent="green"
                sub={fmtPctChange(goalFinal.value, goalFinal.contributed)}
              />
              <StatCard
                label={goalMode === 'real' ? 'Nominální cíl' : 'Reálná hodnota cíle'}
                value={fmtCZK(goalMode === 'real' ? nominalTarget : goalFinal.valueReal)}
                accent="orange"
                sub={goalMode === 'real' ? 'V budoucích cenách' : 'V dnešní kupní síle'}
              />
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DDD0',
                borderRadius: '10px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(60,40,20,0.04)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 className="ms-section-title">
                  <span style={{ width: '24px', height: '1px', backgroundColor: '#D97757' }} />
                  Cesta k cíli
                </h3>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                  {targetYears} let · {fmtPct(targetReturn)} p.a.
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={goalData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#EADFCB" />
                  <XAxis dataKey="year" stroke="#A8A29E" tick={{ fill: '#78716C', fontSize: 11 }} />
                  <YAxis stroke="#A8A29E" tick={{ fill: '#78716C', fontSize: 11 }} tickFormatter={(v) => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)} mld.` : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} mil.` : v >= 1000 ? `${(v / 1000).toFixed(0)} tis.` : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="line" />
                  <ReferenceLine y={nominalTarget} stroke="#A84E2E" strokeDasharray="4 4" label={{ value: 'Cíl', fill: '#A84E2E', fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="contributed" name="Vlastní vklady" stroke="#A8A29E" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="value" name="Hodnota portfolia" stroke="#D97757" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                backgroundColor: '#FBF4E7',
                border: '1px solid #E5D5B5',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(217, 119, 87, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <span style={{ color: '#A84E2E', fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700 }}>i</span>
                </div>
                <p style={{ fontSize: '14px', color: '#44403C', lineHeight: 1.6, margin: 0 }}>
                  <strong style={{ color: '#1C1917', fontFamily: "'Playfair Display', serif" }}>Pozor na inflaci.</strong>{' '}
                  {goalMode === 'real' ? (
                    <>
                      Cíl <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(targetAmount)}</span> v dnešní kupní síle odpovídá za {targetYears} let při inflaci{' '}
                      <span style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmtPct(targetInflation)}</span> nominální částce{' '}
                      <strong style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(nominalTarget)}</strong>.
                    </>
                  ) : (
                    <>
                      Cíl <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(targetAmount)}</span> bude mít za {targetYears} let při inflaci{' '}
                      <span style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmtPct(targetInflation)}</span> stejnou kupní sílu jako dnes pouhých{' '}
                      <strong style={{ color: '#A84E2E', fontVariantNumeric: 'tabular-nums' }}>{fmtCZK(goalFinal.valueReal)}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5DDD0',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(60,40,20,0.04)',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setTableOpen(!tableOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FBF7EE')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="ms-section-title" style={{ fontSize: '1.25rem' }}>
                  <span style={{ width: '24px', height: '1px', backgroundColor: '#D97757' }} />
                  Detailní rozpis po letech
                </span>
                <ChevronToggle open={tableOpen} />
              </button>
              {tableOpen && (
                <div style={{ overflowX: 'auto', borderTop: '1px solid #E5DDD0' }}>
                  <table className="ms-table-base" style={{ tableLayout: 'fixed' }}>
                    <thead style={{ backgroundColor: '#FBF7EE' }}>
                      <tr style={{ color: '#A84E2E', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        <th style={{ width: '8%' }}>Rok</th>
                        <th style={{ width: '23%' }}>Vloženo</th>
                        <th style={{ width: '23%' }}>Zhodnocení</th>
                        <th style={{ width: '23%' }}>Hodnota</th>
                        <th style={{ width: '23%' }}>Reálná hodnota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goalData.map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #F0EBE0', backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FBF9F3' }}>
                          <td style={{ color: '#78716C', fontWeight: 500 }}>{row.year}</td>
                          <td style={{ color: '#44403C' }}>{fmtCZK(row.contributed)}</td>
                          <td style={{ color: '#4F6B3A' }}>{fmtCZK(row.gain)}</td>
                          <td style={{ color: '#1C1917', fontWeight: 500 }}>{fmtCZK(row.value)}</td>
                          <td style={{ color: '#A84E2E', fontWeight: 700 }}>{fmtCZK(row.valueReal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <footer style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid #E5DDD0', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#78716C', lineHeight: 1.6, maxWidth: '640px', margin: '0 auto' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.2em', color: '#57534E' }}>Upozornění ·</span>{' '}
            Kalkulačka slouží k orientačním modelovým výpočtům. Historické výnosy negarantují budoucí výsledky.
            Výpočet předpokládá konstantní výnos i inflaci po celou dobu investice. Nejedná se o investiční doporučení.
          </p>
        </footer>
      </div>
    </div>
  );
}
