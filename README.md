 
# 🏛️ Halal Stock Screener

A web-based application that helps Muslim investors identify Shariah-compliant stocks by screening companies based on Islamic finance principles.

## 📋 Overview

The Halal Stock Screener is designed to assist Muslim investors in making investment decisions that align with their religious beliefs. The application filters stocks based on various Islamic finance criteria, ensuring investments comply with Shariah law.

## ✨ Features

### 🔐 User Authentication
- Secure login and registration system
- User account management
- Email-based authentication

### 📊 Screening Modes

#### 📈 Standard Mode
- Basic halal stock screening
- Standard Islamic finance compliance checks

#### 🔒 Strict Mode (Conservative Scholars)
- **Debt Limitation**: < 5% of market cap (almost debt-free)
- **Cash/Interest Securities**: < 10% of total assets
- **Non-Halal Revenue**: < 1% of total revenue
- Follows more conservative scholarly opinions for ultra-careful investors

### 🔍 Stock Analysis
- Real-time stock screening
- Comprehensive compliance reporting
- Multiple filtering criteria

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/halal-stock-screener.git
cd halal-stock-screener
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your configuration:
```env
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
API_KEY=your_stock_api_key
```

4. Run the application:
```bash
npm start
# or
yarn start
```

5. Open your browser and navigate to `http://localhost:3000`

## 🛠️ Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: [Your backend technology]
- **Database**: [Your database choice]
- **Authentication**: JWT-based authentication
- **Stock Data API**: [Your stock data provider]

## 📱 Usage

1. **Register/Login**: Create an account or log in with existing credentials
2. **Choose Screening Mode**: Select between Standard or Strict mode based on your preference
3. **Screen Stocks**: Use the screening tools to analyze stocks for Shariah compliance
4. **Review Results**: Get detailed reports on stock compliance status

## 🕌 Islamic Finance Criteria

The application screens stocks based on several key Islamic finance principles:

### Business Activity Screening
- Excludes companies involved in:
  - Alcohol production/distribution
  - Gambling and gaming
  - Conventional banking and insurance
  - Pork-related businesses
  - Adult entertainment
  - Tobacco industry

### Financial Ratio Screening
- **Debt-to-Market Cap Ratio**: Varies by mode
- **Interest-bearing securities**: Limited percentage of assets
- **Non-compliant revenue**: Strict limitations on haram income

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Ensure Islamic finance compliance accuracy

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- Islamic finance scholars for guidance on Shariah compliance
- Stock data providers
- Open source community
- Muslim developer community

## 📞 Support

If you have questions or need support:
- Create an issue on GitHub
- Email: [your-email@example.com]
- Documentation: [Link to detailed docs]

## 🔄 Roadmap

- [ ] Mobile app development
- [ ] Additional screening criteria
- [ ] Portfolio tracking
- [ ] Real-time alerts
- [ ] Multi-language support
- [ ] API for developers

## ⚠️ Disclaimer

This tool is for informational purposes only. While we strive for accuracy in our screening criteria, we recommend consulting with qualified Islamic finance scholars before making investment decisions. The application's screening is based on commonly accepted Islamic finance principles but may not reflect all scholarly opinions.

---

**Made with ❤️ for the Muslim community**