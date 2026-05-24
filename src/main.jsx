import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import InvestmentCalculator from './InvestmentCalculator.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <InvestmentCalculator />
  </StrictMode>,
);
