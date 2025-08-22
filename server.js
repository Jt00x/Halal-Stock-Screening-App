const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"]
        }
    }
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database('./halal_screener.db');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        subscription_tier TEXT DEFAULT 'free',
        screening_mode TEXT DEFAULT 'standard',
        api_calls_today INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_reset_date DATE DEFAULT CURRENT_DATE
    )`);

    // Screening history table
    db.run(`CREATE TABLE IF NOT EXISTS screening_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        ticker TEXT NOT NULL,
        screening_mode TEXT NOT NULL,
        result TEXT NOT NULL,
        screened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next(); // Continue without authentication for public access
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to reset daily API calls
const resetDailyApiCalls = (userId) => {
    const today = new Date().toISOString().split('T')[0];
    db.run(
        `UPDATE users SET api_calls_today = 0, last_reset_date = ? WHERE id = ? AND last_reset_date < ?`,
        [today, userId, today]
    );
};

// Mock stock data for demonstration
const mockStockData = {
    'AAPL': {
        name: 'Apple Inc.',
        ticker: 'AAPL',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        current_price: '$175.43',
        market_cap: 2800000000000,
        total_debt: 1200000000000,
        cash_and_equivalents: 280000000000,
        total_revenue: 394300000000,
        non_halal_revenue: 31500000000,
        is_halal_business: true
    },
    'JPM': {
        name: 'JPMorgan Chase & Co.',
        ticker: 'JPM',
        sector: 'Financial Services',
        industry: 'Banks - Diversified',
        current_price: '$145.20',
        market_cap: 425000000000,
        total_debt: 320000000000,
        cash_and_equivalents: 850000000000,
        total_revenue: 128000000000,
        non_halal_revenue: 115200000000,
        is_halal_business: false
    },
    'TSLA': {
        name: 'Tesla, Inc.',
        ticker: 'TSLA',
        sector: 'Consumer Cyclical',
        industry: 'Auto Manufacturers',
        current_price: '$248.50',
        market_cap: 790000000000,
        total_debt: 60000000000,
        cash_and_equivalents: 135000000000,
        total_revenue: 96773000000,
        non_halal_revenue: 1935460000,
        is_halal_business: true
    },
    'MCD': {
        name: 'McDonald\'s Corporation',
        ticker: 'MCD',
        sector: 'Consumer Cyclical',
        industry: 'Restaurants',
        current_price: '$285.30',
        market_cap: 210000000000,
        total_debt: 45000000000,
        cash_and_equivalents: 8500000000,
        total_revenue: 23183000000,
        non_halal_revenue: 695490000,
        is_halal_business: false,
        boycott_info: {
            is_boycotted: true,
            reasons: ['Support for Israeli military operations', 'Provides free meals to Israeli Defense Forces'],
            sources: ['BDS Movement', 'Palestinian Campaign for Academic and Cultural Boycott']
        }
    },
    'MSFT': {
        name: 'Microsoft Corporation',
        ticker: 'MSFT',
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        current_price: '$410.15',
        market_cap: 3050000000000,
        total_debt: 670000000000,
        cash_and_equivalents: 456000000000,
        total_revenue: 211915000000,
        non_halal_revenue: 2119150000,
        is_halal_business: true,
        boycott_info: {
            is_boycotted: true,
            reasons: ['Cloud services contracts with Israeli military', 'AI technology for surveillance'],
            sources: ['Tech Workers Coalition', 'No Tech for Apartheid']
        }
    },
    'NVDA': {
        name: 'NVIDIA Corporation',
        ticker: 'NVDA',
        sector: 'Technology',
        industry: 'Semiconductors',
        current_price: '$875.20',
        market_cap: 2160000000000,
        total_debt: 95000000000,
        cash_and_equivalents: 290000000000,
        total_revenue: 60922000000,
        non_halal_revenue: 609220000,
        is_halal_business: true
    },
    'WMT': {
        name: 'Walmart Inc.',
        ticker: 'WMT',
        sector: 'Consumer Defensive',
        industry: 'Discount Stores',
        current_price: '$180.25',
        market_cap: 490000000000,
        total_debt: 85000000000,
        cash_and_equivalents: 25000000000,
        total_revenue: 648125000000,
        non_halal_revenue: 6481250000,
        is_halal_business: true
    },
    'UBER': {
        name: 'Uber Technologies Inc.',
        ticker: 'UBER',
        sector: 'Technology',
        industry: 'Software - Application',
        current_price: '$75.50',
        market_cap: 160000000000,
        total_debt: 12000000000,
        cash_and_equivalents: 8500000000,
        total_revenue: 37281000000,
        non_halal_revenue: 372810000,
        is_halal_business: true
    }
};

// Screening thresholds for different modes
const screeningThresholds = {
    standard: {
        debt: 33,
        cash: 33,
        revenue: 5
    },
    strict: {
        debt: 5,
        cash: 10,
        revenue: 1
    }
};

// Recommendations data
const recommendations = {
    halal_clean: [
        { ticker: 'AAPL', name: 'Apple Inc.', reason: 'Clean tech company with minimal debt' },
        { ticker: 'NVDA', name: 'NVIDIA Corporation', reason: 'Leading semiconductor company' },
        { ticker: 'TSLA', name: 'Tesla, Inc.', reason: 'Clean energy and sustainable transport' }
    ],
    strict_mode: [
        { ticker: 'NVDA', name: 'NVIDIA Corporation', reason: 'Low debt ratio, minimal non-halal revenue' },
        { ticker: 'TSLA', name: 'Tesla, Inc.', reason: 'Clean business model, low debt' }
    ]
};

// Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, screening_mode = 'standard' } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run(
                'INSERT INTO users (email, password_hash, screening_mode) VALUES (?, ?, ?)',
                [email, hashedPassword, screening_mode],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }

                    const token = jwt.sign(
                        { userId: this.lastID, email },
                        process.env.JWT_SECRET || 'fallback_secret',
                        { expiresIn: '7d' }
                    );

                    res.json({
                        token,
                        user: {
                            id: this.lastID,
                            email,
                            subscription_tier: 'free',
                            screening_mode,
                            api_calls_today: 0
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        db.get(
            'SELECT * FROM users WHERE email = ?',
            [email],
            async (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                if (!user) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const validPassword = await bcrypt.compare(password, user.password_hash);
                if (!validPassword) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                resetDailyApiCalls(user.id);

                const token = jwt.sign(
                    { userId: user.id, email: user.email },
                    process.env.JWT_SECRET || 'fallback_secret',
                    { expiresIn: '7d' }
                );

                res.json({
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        subscription_tier: user.subscription_tier,
                        screening_mode: user.screening_mode,
                        api_calls_today: user.api_calls_today
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// User profile route
app.get('/api/user/profile', authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    db.get(
        'SELECT id, email, subscription_tier, screening_mode, api_calls_today FROM users WHERE id = ?',
        [req.user.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            resetDailyApiCalls(user.id);
            res.json({ user });
        }
    );
});

// Update user screening mode
app.patch('/api/user/screening-mode', authenticateToken, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { screening_mode } = req.body;

        if (!['standard', 'strict'].includes(screening_mode)) {
            return res.status(400).json({ error: 'Invalid screening mode' });
        }

        db.run(
            'UPDATE users SET screening_mode = ? WHERE id = ?',
            [screening_mode, req.user.userId],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ success: true });
            }
        );
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Stock screening route - FIXED VERSION
app.get('/api/screen/:ticker', authenticateToken, (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const mode = req.query.mode || 'standard';

    // Simple API call tracking without complex async database calls
    if (req.user) {
        db.run(
            'UPDATE users SET api_calls_today = api_calls_today + 1 WHERE id = ?',
            [req.user.userId],
            (err) => {
                if (err) {
                    console.error('Error updating API calls:', err);
                }
            }
        );
    }

    // Get stock data (mock data for now)
    const stockData = mockStockData[ticker];
    
    if (!stockData) {
        return res.status(404).json({ error: 'Stock not found' });
    }

    // Calculate financial ratios
    const debtRatio = (stockData.total_debt / stockData.market_cap) * 100;
    const cashRatio = (stockData.cash_and_equivalents / stockData.market_cap) * 100;
    const nonHalalRevenueRatio = (stockData.non_halal_revenue / stockData.total_revenue) * 100;

    const thresholds = screeningThresholds[mode];

    // Determine Shariah compliance
    const isDebtCompliant = debtRatio < thresholds.debt;
    const isCashCompliant = cashRatio < thresholds.cash;
    const isRevenueCompliant = nonHalalRevenueRatio < thresholds.revenue;
    const isBusinessHalal = stockData.is_halal_business;

    let shariahStatus, shariahText;
    if (isDebtCompliant && isCashCompliant && isRevenueCompliant && isBusinessHalal) {
        shariahStatus = 'halal';
        shariahText = '✅ Shariah Compliant';
    } else if (!isBusinessHalal) {
        shariahStatus = 'haram';
        shariahText = '❌ Haram Business';
    } else {
        shariahStatus = 'mixed';
        shariahText = '⚠️ Mixed (Purification Required)';
    }

    // Check boycott status
    const boycottInfo = stockData.boycott_info || { is_boycotted: false };
    const boycottStatus = boycottInfo.is_boycotted ? 'boycott' : 'clear';
    const boycottText = boycottInfo.is_boycotted ? '⛔ Boycotted' : '✅ No Boycott Issues';

    // Calculate purification percentage
    const purificationPercentage = shariahStatus === 'mixed' ? nonHalalRevenueRatio : 0;

    // Get recommendations
    const recs = mode === 'strict' ? recommendations.strict_mode : recommendations.halal_clean;

    const result = {
        company: {
            name: stockData.name,
            ticker: stockData.ticker,
            sector: stockData.sector,
            industry: stockData.industry,
            is_halal_business: stockData.is_halal_business
        },
        price_data: {
            current_price: stockData.current_price
        },
        financial_ratios: {
            debt_ratio: Math.round(debtRatio * 100) / 100,
            cash_ratio: Math.round(cashRatio * 100) / 100,
            non_halal_revenue: Math.round(nonHalalRevenueRatio * 100) / 100
        },
        shariah_verdict: {
            status: shariahStatus,
            text: shariahText,
            thresholds: thresholds
        },
        boycott_verdict: {
            status: boycottStatus,
            text: boycottText,
            details: boycottInfo.is_boycotted ? boycottInfo : null
        },
        purification_percentage: purificationPercentage,
        screening_mode: mode,
        screening_date: new Date().toISOString(),
        data_source: 'mock_data',
        recommendations: recs.filter(r => r.ticker !== ticker).slice(0, 3)
    };

    // Save to history if user is authenticated (simplified)
    if (req.user) {
        db.run(
            'INSERT INTO screening_history (user_id, ticker, screening_mode, result) VALUES (?, ?, ?, ?)',
            [req.user.userId, ticker, mode, JSON.stringify(result)],
            (err) => {
                if (err) {
                    console.error('Error saving to history:', err);
                }
            }
        );
    }

    // Send the response
    res.json(result);
});

// Recommendations route
app.get('/api/recommendations/strict', (req, res) => {
    res.json({
        recommendations: recommendations.strict_mode,
        mode: 'strict',
        description: 'Stocks that meet strict Islamic finance criteria'
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});

// Add this function after your mock data and before the routes

// Function to fetch real stock data from Alpha Vantage
async function fetchStockData(ticker) {
    try {
        const apiKey = process.env.STOCK_API_KEY;
        
        // Get company overview (includes financial data)
        const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;
        const overviewResponse = await axios.get(overviewUrl);
        const overview = overviewResponse.data;
        
        // Get current price
        const priceUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`;
        const priceResponse = await axios.get(priceUrl);
        const quote = priceResponse.data['Global Quote'];
        
        // Check if we got valid data
        if (!overview || !overview.Symbol || !quote || !quote['05. price']) {
            return null;
        }
        
        // Determine if business is halal (basic screening)
        const haram_sectors = ['Banks', 'Insurance', 'Gambling', 'Alcohol', 'Tobacco', 'Adult Entertainment'];
        const haram_industries = ['Banks—Diversified', 'Banks—Regional', 'Insurance—Life', 'Insurance—Property & Casualty', 'Insurance—Diversified', 'Gambling', 'Tobacco', 'Beverages—Wineries & Distilleries'];
        
        const isHalalBusiness = !haram_sectors.some(sector => overview.Sector?.includes(sector)) && 
                              !haram_industries.some(industry => overview.Industry?.includes(industry));
        
        // Parse financial data (handle cases where data might be missing)
        const marketCap = parseFloat(overview.MarketCapitalization) || 0;
        const totalDebt = parseFloat(overview.QuarterlyEarningsGrowthYOY) || 0; // This is approximate
        const currentPrice = parseFloat(quote['05. price']) || 0;
        const totalRevenue = parseFloat(overview.RevenueTTM) || 0;
        
        // Estimate cash (Alpha Vantage doesn't provide this directly)
        const estimatedCash = marketCap * 0.1; // Rough estimate
        
        // Estimate non-halal revenue (conservative estimate for mixed businesses)
        let nonHalalRevenue = 0;
        if (!isHalalBusiness) {
            nonHalalRevenue = totalRevenue * 0.9; // Assume 90% haram for haram businesses
        } else {
            nonHalalRevenue = totalRevenue * 0.02; // Assume 2% interest income for halal businesses
        }
        
        return {
            name: overview.Name || `${ticker} Inc.`,
            ticker: ticker.toUpperCase(),
            sector: overview.Sector || 'Unknown',
            industry: overview.Industry || 'Unknown',
            current_price: `$${currentPrice.toFixed(2)}`,
            market_cap: marketCap,
            total_debt: totalDebt,
            cash_and_equivalents: estimatedCash,
            total_revenue: totalRevenue,
            non_halal_revenue: nonHalalRevenue,
            is_halal_business: isHalalBusiness,
            pe_ratio: parseFloat(overview.PERatio) || 0,
            dividend_yield: parseFloat(overview.DividendYield) || 0
        };
    } catch (error) {
        console.error('Error fetching stock data:', error);
        return null;
    }
}

// Replace your stock screening route with this enhanced version:
app.get('/api/screen/:ticker', authenticateToken, async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const mode = req.query.mode || 'standard';

    // Simple API call tracking
    if (req.user) {
        db.run(
            'UPDATE users SET api_calls_today = api_calls_today + 1 WHERE id = ?',
            [req.user.userId],
            (err) => {
                if (err) {
                    console.error('Error updating API calls:', err);
                }
            }
        );
    }

    // Try to get real stock data first, fall back to mock data
    let stockData = await fetchStockData(ticker);
    
    // If API fails, check mock data
    if (!stockData) {
        stockData = mockStockData[ticker];
    }
    
    if (!stockData) {
        return res.status(404).json({ 
            error: 'Stock not found or API limit reached. Please try again later.' 
        });
    }

    // Calculate financial ratios
    const debtRatio = stockData.market_cap > 0 ? (stockData.total_debt / stockData.market_cap) * 100 : 0;
    const cashRatio = stockData.market_cap > 0 ? (stockData.cash_and_equivalents / stockData.market_cap) * 100 : 0;
    const nonHalalRevenueRatio = stockData.total_revenue > 0 ? (stockData.non_halal_revenue / stockData.total_revenue) * 100 : 0;

    const thresholds = screeningThresholds[mode];

    // Determine Shariah compliance
    const isDebtCompliant = debtRatio < thresholds.debt;
    const isCashCompliant = cashRatio < thresholds.cash;
    const isRevenueCompliant = nonHalalRevenueRatio < thresholds.revenue;
    const isBusinessHalal = stockData.is_halal_business;

    let shariahStatus, shariahText;
    if (isDebtCompliant && isCashCompliant && isRevenueCompliant && isBusinessHalal) {
        shariahStatus = 'halal';
        shariahText = '✅ Shariah Compliant';
    } else if (!isBusinessHalal) {
        shariahStatus = 'haram';
        shariahText = '❌ Haram Business';
    } else {
        shariahStatus = 'mixed';
        shariahText = '⚠️ Mixed (Purification Required)';
    }

    // Check boycott status (you can expand this with a boycott database)
    const boycottInfo = stockData.boycott_info || { is_boycotted: false };
    const boycottStatus = boycottInfo.is_boycotted ? 'boycott' : 'clear';
    const boycottText = boycottInfo.is_boycotted ? '⛔ Boycotted' : '✅ No Boycott Issues';

    // Calculate purification percentage
    const purificationPercentage = shariahStatus === 'mixed' ? Math.round(nonHalalRevenueRatio * 100) / 100 : 0;

    // Get recommendations
    const recs = mode === 'strict' ? recommendations.strict_mode : recommendations.halal_clean;

    const result = {
        company: {
            name: stockData.name,
            ticker: stockData.ticker,
            sector: stockData.sector,
            industry: stockData.industry,
            is_halal_business: stockData.is_halal_business
        },
        price_data: {
            current_price: stockData.current_price,
            pe_ratio: stockData.pe_ratio || 'N/A',
            dividend_yield: stockData.dividend_yield || 'N/A'
        },
        financial_ratios: {
            debt_ratio: Math.round(debtRatio * 100) / 100,
            cash_ratio: Math.round(cashRatio * 100) / 100,
            non_halal_revenue: Math.round(nonHalalRevenueRatio * 100) / 100
        },
        shariah_verdict: {
            status: shariahStatus,
            text: shariahText,
            thresholds: thresholds,
            compliance_details: {
                debt_compliant: isDebtCompliant,
                cash_compliant: isCashCompliant,
                revenue_compliant: isRevenueCompliant,
                business_halal: isBusinessHalal
            }
        },
        boycott_verdict: {
            status: boycottStatus,
            text: boycottText,
            details: boycottInfo.is_boycotted ? boycottInfo : null
        },
        purification_percentage: purificationPercentage,
        screening_mode: mode,
        screening_date: new Date().toISOString(),
        data_source: stockData === mockStockData[ticker] ? 'mock_data' : 'alpha_vantage',
        recommendations: recs.filter(r => r.ticker !== ticker).slice(0, 3)
    };

    // Save to history if user is authenticated
    if (req.user) {
        db.run(
            'INSERT INTO screening_history (user_id, ticker, screening_mode, result) VALUES (?, ?, ?, ?)',
            [req.user.userId, ticker, mode, JSON.stringify(result)],
            (err) => {
                if (err) {
                    console.error('Error saving to history:', err);
                }
            }
        );
    }

    res.json(result);
});