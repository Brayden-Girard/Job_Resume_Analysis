# 🎯 Job Analyzer Chrome Extension

A powerful Chrome extension that automatically analyzes job listings against your resume and preferences, providing intelligent match scoring and actionable insights to streamline your job search process.

![Job Analyzer Demo](https://img.shields.io/badge/version-1.1-blue.svg) ![Chrome Extension](https://img.shields.io/badge/platform-Chrome-green.svg) ![License](https://img.shields.io/badge/license-MIT-orange.svg)

## 🚀 Features

### ⚡ Smart Job Analysis
- **Intelligent Matching**: Advanced algorithm compares job requirements with your skills and experience
- **Precise Scoring**: Match percentage with decimal precision (e.g., 73.5%)
- **Multi-factor Analysis**: Considers skills, experience level, role seniority, and preferences
- **Real-time Results**: Instant analysis with detailed pros, cons, and recommendations

### 🔍 Advanced Web Scraping
- **Multi-site Support**: Works with LinkedIn, Indeed, Glassdoor, ZipRecruiter, and Monster
- **Comprehensive Data Extraction**: Job title, company, location, salary, and requirements
- **Enhanced Salary Detection**: Recognizes 15+ salary formats and patterns
- **Fallback Mechanisms**: Multiple extraction strategies ensure reliable data capture

### 📊 Export & Integration
- **Multiple Export Formats**: JSON and CSV downloads
- **Webhook Integration**: Real-time data streaming to external applications
- **Analysis History**: Automatic storage and searchable history of all analyses
- **Batch Operations**: Export all historical data at once

### 🎨 User Experience
- **Clean Interface**: Intuitive popup design with clear sections
- **Visual Feedback**: Color-coded match scores and progress indicators
- **Responsive Design**: Works on all screen sizes
- **Floating Analysis Widget**: Non-intrusive results display on job pages

## 📥 Installation

### Option 1: Load Unpacked (Recommended for Development)
1. **Download or Clone** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Option 2: Chrome Web Store
*Coming soon - Extension pending review*

## 🛠️ Setup & Configuration

### Initial Setup
1. **Click the extension icon** in your Chrome toolbar
2. **Add Resume Summary**: Paste key points from your resume (skills, experience, achievements)
3. **Set Job Preferences**: Define your boundaries (salary range, remote work, work-life balance)
4. **Save Settings** and you're ready to go!

### Optional: Webhook Integration
1. Click **"Webhook Settings"** in the extension popup
2. Enter your API endpoint URL
3. Add authentication token if required
4. Enable auto-send for real-time integration

## 🎯 How to Use

### Analyzing Jobs
1. **Visit any supported job site** (LinkedIn, Indeed, Glassdoor, etc.)
2. **Navigate to a job listing**
3. **Click "Analyze Current Job"** in the extension popup
4. **View results** in the floating analysis widget

### Viewing History
- Click **"View Analysis History"** to see all past analyses
- **Search and filter** by company, score, or keywords
- **Export individual analyses** or complete history

### Exporting Data
- **JSON Format**: Structured data for applications and APIs
- **CSV Format**: Spreadsheet-compatible for analysis
- **Direct Integration**: Webhook streaming to your systems

## 🧠 Analysis Algorithm

The extension uses a sophisticated multi-factor scoring system:

- **Skills Matching (50%)**: Technical and soft skills comparison with fuzzy matching
- **Experience Level (25%)**: Years of experience vs. job requirements
- **Role Seniority (15%)**: Junior/Mid/Senior level alignment
- **Preferences (10%)**: Remote work, work-life balance, salary transparency

### Smart Features
- **Fuzzy Skill Matching**: Recognizes similar technologies (JS/JavaScript, React/ReactJS)
- **Synonym Detection**: Handles common variations and abbreviations
- **Experience Extraction**: Automatically detects years of experience from text
- **Salary Pattern Recognition**: Identifies 15+ salary formats and ranges

## 📁 Project Structure

```
job-analyzer-extension/
├── manifest.json          # Extension configuration and permissions
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality and settings
├── content.js             # Main scraping and analysis logic
├── content.css            # Styling for analysis widgets
├── background.js          # Background service worker
└── README.md              # This file
```

## 🔧 Technical Details

### Supported Job Sites
- **LinkedIn** (`*.linkedin.com/jobs/*`)
- **Indeed** (`*.indeed.com/viewjob*`)
- **Glassdoor** (`*.glassdoor.com/job-listing/*`)
- **ZipRecruiter** (`*.ziprecruiter.com/jobs/*`)
- **Monster** (`*.monster.com/job-openings/*`)

### Permissions Required
- **activeTab**: Access current job listing page
- **storage**: Save user settings and analysis history
- **scripting**: Inject analysis scripts into job pages
- **downloads**: Export analysis data as files

### Data Storage
- **Chrome Sync Storage**: User settings (resume, preferences, webhooks)
- **Chrome Local Storage**: Analysis history (last 100 analyses)
- **No External Servers**: All data remains local to your browser

## 🚨 Troubleshooting

### Common Issues

**Extension not working on job sites:**
- Ensure you're on a supported job site URL
- Try refreshing the page and reloading the extension
- Check that content scripts are enabled

**Salary not being detected:**
- Some sites may have updated their structure
- The extension searches multiple locations and patterns
- Salary may be embedded in job description text

**Analysis seems inaccurate:**
- Verify your resume summary includes relevant skills and experience
- Check that job preferences are properly configured
- Algorithm works best with detailed resume information

### Debug Mode
1. Right-click extension popup → "Inspect"
2. Check Console tab for error messages
3. Use "Test Scraper" button to verify data extraction

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Setup
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Make changes to the code
4. Reload extension in `chrome://extensions/`
5. Test on various job sites

### Adding New Job Sites
1. Update `SITE_SELECTORS` object in `content.js`
2. Add site URL pattern to `manifest.json`
3. Test scraping functionality
4. Update README with new site support

## 📊 Roadmap

### Version 1.2 (Upcoming)
- [ ] Support for more job sites (Stack Overflow Jobs, AngelList)
- [ ] Advanced filtering options in history view
- [ ] Email notifications for high-match jobs
- [ ] Browser sync across devices

### Version 2.0 (Future)
- [ ] AI-powered job recommendations
- [ ] Integration with popular job tracking tools
- [ ] Bulk analysis of job search results pages
- [ ] Mobile app companion

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to the open-source community for inspiration and best practices
- Job sites for providing accessible content structures
- Chrome extension developers community for documentation and examples

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/job-analyzer-extension/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/job-analyzer-extension/discussions)
- **Email**: your.email@domain.com

---

**⭐ If this extension helps your job search, please consider starring the repository!**
