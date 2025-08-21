import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, Calculator, BookOpen, PieChart } from 'lucide-react';

const HalalStockScreener = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [activeTab, setActiveTab] = useState('screening');

  // Mock stock data with financial metrics
  const stockDatabase = {
    'AAPL': {
      name: 'Apple Inc.',
      ticker: 'AAPL',
      price: 175.43,
      marketCap: '2.8T',
      metrics: {
        debtRatio: 45, // 45% debt
        haramRevenue: 8, // 8% non-halal revenue (interest income, etc.)
        totalRevenue: 394.3,
        haramAmount: 31.5,
        cashRatio: 12
      }
    },
    'ADBE': {
      name: 'Adobe Inc.',
      ticker: 'ADBE',
      price: 485.20,
      marketCap: '220B',
      metrics: {
        debtRatio: 15, // 15% debt
        haramRevenue: 2, // 2% non-halal revenue
        totalRevenue: 19.4,
        haramAmount: 0.39,
        cashRatio: 8
      }
    },
    'MSFT': {
      name: 'Microsoft Corporation',
      ticker: 'MSFT',
      price: 410.15,
      marketCap: '3.0T',
      metrics: {
        debtRatio: 22, // 22% debt
        haramRevenue: 1, // 1% non-halal revenue
        totalRevenue: 211.9,
        haramAmount: 2.1,
        cashRatio: 15
      }
    }
  };

  const screeningStandards = {
    aaoifi: {
      name: 'AAOIFI Standard',
      description: 'Global mainstream Islamic finance standard',
      rules: {
        maxDebt: 33,
        maxHaram: 5,
        note: 'AAOIFI Shariah Standard No. 21 - allows up to 33% debt and 5% non-halal revenue'
      }
    },
    strict: {
      name: 'Strict Mode',
      description: 'Zero tolerance approach',
      rules: {
        maxDebt: 0,
        maxHaram: 0,
        note: 'Conservative scholars require complete avoidance of interest and haram activities'
      }
    },
    malaysia: {
      name: 'Malaysia SC',
      description: 'Shariah Advisory Council of Malaysia',
      rules: {
        maxDebt: 33,
        maxHaram: 10,
        note: 'Malaysian Securities Commission Shariah guidelines - allows up to 10% non-compliant income'
      }
    },
    dowjones: {
      name: 'Dow Jones Islamic',
      description: 'Dow Jones Islamic Market Index',
      rules: {
        maxDebt: 33,
        maxHaram: 5,
        note: 'Dow Jones Islamic Index methodology - similar to AAOIFI with additional liquidity requirements'
      }
    }
  };

  const evaluateCompliance = (stock, standard) => {
    const rules = screeningStandards[standard].rules;
    const debtCompliant = stock.metrics.debtRatio <= rules.maxDebt;
    const haramCompliant = stock.metrics.haramRevenue <= rules.maxHaram;
    
    if (debtCompliant && haramCompliant) {
      return { status: 'compliant', icon: CheckCircle, color: 'text-green-600' };
    } else if (debtCompliant || haramCompliant) {
      return { status: 'mixed', icon: AlertTriangle, color: 'text-yellow-600' };
    } else {
      return { status: 'non-compliant', icon: XCircle, color: 'text-red-600' };
    }
  };

  const calculatePurification = (stock) => {
    const purificationRate = stock.metrics.haramRevenue;
    return {
      rate: purificationRate,
      amount: (purificationRate / 100) * 100, // Per $100 invested
      explanation: `${purificationRate}% of dividends/gains must be donated to charity`
    };
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const ticker = searchTerm.toUpperCase();
    if (stockDatabase[ticker]) {
      setSelectedStock(stockDatabase[ticker]);
    }
  };

  const ComplianceResult = ({ stock, standardKey, standard }) => {
    const result = evaluateCompliance(stock, standardKey);
    const Icon = result.icon;
    
    return (
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{standard.name}</h3>
          <Icon className={`h-6 w-6 ${result.color}`} />
        </div>
        <p className="text-sm text-gray-600 mb-3">{standard.description}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Debt Ratio:</span>
            <span className={stock.metrics.debtRatio <= standard.rules.maxDebt ? 'text-green-600' : 'text-red-600'}>
              {stock.metrics.debtRatio}% (max: {standard.rules.maxDebt}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Non-Halal Revenue:</span>
            <span className={stock.metrics.haramRevenue <= standard.rules.maxHaram ? 'text-green-600' : 'text-red-600'}>
              {stock.metrics.haramRevenue}% (max: {standard.rules.maxHaram}%)
            </span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">{standard.rules.note}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Halal Stock Screener</h1>
          <p className="text-gray-600">Multi-standard Islamic compliance screening</p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter stock ticker (AAPL, ADBE, MSFT)"
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(e);
                }
              }}
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-2 px-4 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-lg border shadow-sm">
            {[
              { key: 'screening', label: 'Screening', icon: CheckCircle },
              { key: 'purification', label: 'Purification', icon: Calculator },
              { key: 'portfolio', label: 'Portfolio', icon: PieChart }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center px-6 py-3 rounded-lg transition-colors ${
                  activeTab === tab.key 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {selectedStock && activeTab === 'screening' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedStock.name} ({selectedStock.ticker})
              </h2>
              <p className="text-gray-600">
                ${selectedStock.price} • Market Cap: {selectedStock.marketCap}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(screeningStandards).map(([key, standard]) => (
                <ComplianceResult
                  key={key}
                  stock={selectedStock}
                  standardKey={key}
                  standard={standard}
                />
              ))}
            </div>
          </div>
        )}

        {/* Purification Calculator */}
        {selectedStock && activeTab === 'purification' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Purification Calculator for {selectedStock.name}
              </h2>
            </div>

            <div className="max-w-md mx-auto">
              {(() => {
                const purification = calculatePurification(selectedStock);
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="text-center">
                      <Calculator className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Purification Required
                      </h3>
                      <div className="text-3xl font-bold text-yellow-600 mb-2">
                        {purification.rate}%
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {purification.explanation}
                      </p>
                      <div className="bg-white rounded-md p-3 text-sm">
                        <strong>Example:</strong> For every $100 in dividends, donate ${purification.rate} to charity
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Portfolio View */}
        {activeTab === 'portfolio' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h2>
              <p className="text-gray-600">Track compliance across your holdings</p>
            </div>
            <div className="text-center text-gray-500 py-12">
              <PieChart className="h-16 w-16 mx-auto mb-4" />
              <p>Add stocks to your portfolio to see compliance breakdown</p>
            </div>
          </div>
        )}

        {/* Information Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <BookOpen className="h-8 w-8 text-emerald-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Multiple Standards</h3>
            <p className="text-sm text-gray-600">
              Compare stocks against AAOIFI, Malaysia SC, Dow Jones Islamic, and strict interpretations
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <Calculator className="h-8 w-8 text-emerald-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Purification Guide</h3>
            <p className="text-sm text-gray-600">
              Automatic calculation of charity obligations for mixed-compliance investments
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <CheckCircle className="h-8 w-8 text-emerald-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Scholarly References</h3>
            <p className="text-sm text-gray-600">
              Each ruling backed by authentic Islamic finance scholarship and standards
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HalalStockScreener;