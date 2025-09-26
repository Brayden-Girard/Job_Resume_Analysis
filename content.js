// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'testScraper') {
        const jobData = scrapeJobData();
        console.log('Scraped job data:', jobData);
        sendResponse({success: true, jobData: jobData});
        return true;
    }
    
    if (request.action === 'showHistory') {
        // Show history modal directly in content script
        chrome.storage.local.get(['analysisHistory'], (data) => {
            const history = data.analysisHistory || [];
            if (history.length === 0) {
                showNotification('No analysis history found', 'info');
                sendResponse({success: false, message: 'No history found'});
                return;
            }
            showHistoryModal(history);
            sendResponse({success: true});
        });
        return true;
    }
    
    if (request.action === 'analyzeJob') {
        const jobData = scrapeJobData();
        
        if (!jobData || !jobData.title) {
            sendResponse({success: false, error: 'Could not scrape job data from this page'});
            return true;
        }

        // Get user settings
        chrome.storage.sync.get(['resumeText', 'preferencesText', 'webhookUrl', 'webhookAuth', 'autoSendWebhook'], (data) => {
            if (!data.resumeText) {
                sendResponse({success: false, error: 'Please add your resume information in the extension popup first'});
                return;
            }

            const analysis = analyzeJobFit(jobData, data.resumeText, data.preferencesText);
            
            // Save to history
            saveAnalysisToHistory(jobData, analysis);
            
            // Auto-send to webhook if enabled
            if (data.autoSendWebhook && data.webhookUrl) {
                sendToWebhook(data.webhookUrl, data.webhookAuth, {
                    jobData: jobData,
                    analysis: analysis,
                    timestamp: new Date().toISOString()
                }).catch(error => {
                    console.error('Auto-webhook failed:', error);
                });
            }
            
            createAnalysisDisplay(jobData, analysis);
            sendResponse({success: true, analysis: analysis, jobData: jobData});
        });
        
        return true; // Keep message channel open for async response
    }
});

function saveAnalysisToHistory(jobData, analysis) {
    const analysisRecord = {
        jobData: jobData,
        analysis: analysis,
        analyzedAt: new Date().toISOString(),
        id: Date.now() + Math.random()
    };
    
    chrome.storage.local.get(['analysisHistory'], (data) => {
        const history = data.analysisHistory || [];
        history.unshift(analysisRecord); // Add to beginning
        
        // Keep only last 100 analyses
        if (history.length > 100) {
            history.splice(100);
        }
        
        chrome.storage.local.set({analysisHistory: history});
    });
}

function exportAnalysisAsJSON(jobData, analysis) {
    const exportData = {
        jobData: jobData,
        analysis: analysis,
        exportedAt: new Date().toISOString(),
        extensionVersion: chrome.runtime.getManifest().version
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-analysis-${jobData.company}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('JSON export completed!', 'success');
}

function exportAnalysisAsCSV(jobData, analysis) {
    const csvData = [
        ['Field', 'Value'],
        ['Job Title', jobData.title || ''],
        ['Company', jobData.company || ''],
        ['Location', jobData.location || ''],
        ['URL', jobData.url || ''],
        ['Salary', jobData.salary || ''],
        ['Match Score', analysis.matchScore + '%'],
        ['Pros', analysis.pros.join('; ')],
        ['Cons', analysis.cons.join('; ')],
        ['Recommendations', analysis.recommendations.join('; ')],
        ['Analyzed At', new Date().toISOString()],
        ['Description Preview', (jobData.description || '').substring(0, 200) + '...']
    ];
    
    const csvContent = csvData.map(row => 
        row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const dataBlob = new Blob([csvContent], {type: 'text/csv'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-analysis-${jobData.company}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('CSV export completed!', 'success');
}

function sendToWebhookFromWidget(jobData, analysis) {
    chrome.storage.sync.get(['webhookUrl', 'webhookAuth'], async (data) => {
        if (!data.webhookUrl) {
            showNotification('No webhook URL configured. Set it up in extension settings.', 'error');
            return;
        }
        
        try {
            const response = await sendToWebhook(data.webhookUrl, data.webhookAuth, {
                jobData: jobData,
                analysis: analysis,
                timestamp: new Date().toISOString(),
                source: 'manual_export'
            });
            
            if (response.ok) {
                showNotification('Successfully sent to webhook!', 'success');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            showNotification(`Webhook error: ${error.message}`, 'error');
            console.error('Webhook send failed:', error);
        }
    });
}

async function sendToWebhook(url, auth, data) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (auth) {
        if (auth.toLowerCase().startsWith('bearer ')) {
            headers['Authorization'] = auth;
        } else {
            headers['Authorization'] = `Bearer ${auth}`;
        }
    }
    
    return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}// Job scraping selectors for different sites
const SITE_SELECTORS = {
    'linkedin.com': {
        title: '.t-24.t-bold',
        company: '.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name',
        location: '.job-details-jobs-unified-top-card__bullet',
        description: '.jobs-box__html-content, .job-details-jobs-unified-top-card__job-description',
        salary: '.job-details-jobs-unified-top-card__job-insight-view-model-secondary',
        requirements: '.jobs-box__html-content ul, .jobs-box__html-content ol'
    },
    'indeed.com': {
        title: '[data-testid="jobsearch-JobInfoHeader-title"] span, .jobsearch-JobInfoHeader-title',
        company: '[data-testid="inlineHeader-companyName"] a, .jobsearch-InlineCompanyRating-companyHeader a',
        location: '[data-testid="job-location"]',
        description: '#jobDescriptionText, .jobsearch-jobDescriptionText',
        salary: '.jobsearch-JobMetadataHeader-item:contains("$"), [data-testid="job-compensation"]',
        requirements: '#jobDescriptionText ul, #jobDescriptionText ol'
    },
    'glassdoor.com': {
        title: '[data-test="job-title"]',
        company: '[data-test="employer-name"]',
        location: '[data-test="job-location"]',
        description: '#JobDescriptionContainer, .jobDescriptionContent',
        salary: '[data-test="detailSalary"]',
        requirements: '.jobDescriptionContent ul, .jobDescriptionContent ol'
    }
};

function getSiteSelectors() {
    const hostname = window.location.hostname;
    for (const site in SITE_SELECTORS) {
        if (hostname.includes(site)) {
            return SITE_SELECTORS[site];
        }
    }
    return null;
}

function scrapeJobData() {
    const selectors = getSiteSelectors();
    if (!selectors) {
        return null;
    }

    function getTextContent(selector) {
        const elements = document.querySelectorAll(selector);
        for (let el of elements) {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                return text;
            }
        }
        return '';
    }

    function getRequirements(selector) {
        const lists = document.querySelectorAll(selector);
        const requirements = [];
        lists.forEach(list => {
            const items = list.querySelectorAll('li');
            items.forEach(item => {
                const text = item.textContent?.trim();
                if (text) requirements.push(text);
            });
        });
        return requirements;
    }

    const jobData = {
        title: getTextContent(selectors.title),
        company: getTextContent(selectors.company),
        location: getTextContent(selectors.location),
        description: getTextContent(selectors.description),
        salary: getTextContent(selectors.salary),
        requirements: getRequirements(selectors.requirements),
        url: window.location.href,
        scrapedAt: new Date().toISOString()
    };

    // Clean up the data
    Object.keys(jobData).forEach(key => {
        if (typeof jobData[key] === 'string') {
            jobData[key] = jobData[key].replace(/\s+/g, ' ').trim();
        }
    });

    return jobData;
}

function analyzeJobFit(jobData, resumeText, preferencesText) {
    const analysis = {
        pros: [],
        cons: [],
        matchScore: 0,
        recommendations: []
    };

    if (!jobData || !resumeText) {
        return analysis;
    }

    const jobText = `${jobData.title} ${jobData.description}`.toLowerCase();
    const resume = resumeText.toLowerCase();
    const preferences = preferencesText ? preferencesText.toLowerCase() : '';

    // Enhanced skill matching with broader categories
    const extractSkills = (text) => {
        const skillPatterns = [
            // Programming languages
            /\b(?:javascript|js|typescript|ts|python|java|c#|c\+\+|php|ruby|go|rust|swift|kotlin|scala|r|matlab)\b/gi,
            // Web technologies
            /\b(?:html|css|sass|scss|react|angular|vue|next\.?js|node\.?js|express|django|flask|laravel|spring)\b/gi,
            // Databases
            /\b(?:sql|mysql|postgresql|postgres|mongodb|redis|elasticsearch|oracle|sqlite)\b/gi,
            // Cloud/DevOps
            /\b(?:aws|azure|gcp|docker|kubernetes|jenkins|git|github|gitlab|terraform|ansible)\b/gi,
            // Tools/Frameworks
            /\b(?:figma|sketch|jira|confluence|salesforce|tableau|excel|powerbi|photoshop)\b/gi,
            // Methodologies
            /\b(?:agile|scrum|kanban|devops|ci\/cd|tdd|microservices|api|rest|graphql)\b/gi,
        ];
        
        let skills = [];
        skillPatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            skills.push(...matches);
        });
        
        return [...new Set(skills.map(skill => skill.toLowerCase()))];
    };

    // Extract skills from resume and job
    const resumeSkills = extractSkills(resume);
    const jobSkills = extractSkills(jobText);

    // Calculate skill matches with fuzzy matching
    const matchingSkills = resumeSkills.filter(skill => 
        jobSkills.some(jobSkill => {
            // Exact match
            if (jobSkill === skill) return true;
            // Contains match
            if (jobSkill.includes(skill) || skill.includes(jobSkill)) return true;
            // Similar technologies
            const synonyms = {
                'js': 'javascript',
                'ts': 'typescript',
                'postgres': 'postgresql',
                'node': 'nodejs',
                'react': 'reactjs'
            };
            const skillSynonym = synonyms[skill] || synonyms[Object.keys(synonyms).find(key => synonyms[key] === skill)];
            const jobSynonym = synonyms[jobSkill] || synonyms[Object.keys(synonyms).find(key => synonyms[key] === jobSkill)];
            return skillSynonym === jobSkill || jobSynonym === skill;
        })
    );
    
    const uniqueMatchingSkills = [...new Set(matchingSkills)];
    const uniqueJobSkills = [...new Set(jobSkills)];

    // Skills scoring (50% of total score)
    if (uniqueMatchingSkills.length > 0) {
        const skillMatchRatio = uniqueMatchingSkills.length / Math.max(uniqueJobSkills.length, 1);
        analysis.matchScore += skillMatchRatio * 50;
        
        if (uniqueMatchingSkills.length >= 3) {
            analysis.pros.push(`🎯 Strong technical alignment: ${uniqueMatchingSkills.slice(0, 4).join(', ')}`);
        } else {
            analysis.pros.push(`✅ Key skill matches: ${uniqueMatchingSkills.join(', ')}`);
        }
    } else {
        analysis.cons.push(`❌ Limited technical skill overlap detected`);
    }

    // Experience level analysis (25% of total)
    const extractYears = (text) => {
        const patterns = [
            /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi,
            /(?:experience|exp).*?(\d+)\+?\s*(?:years?|yrs?)/gi
        ];
        let years = [];
        patterns.forEach(pattern => {
            const matches = [...text.matchAll(pattern)];
            years.push(...matches.map(m => parseInt(m[1])));
        });
        return years.length > 0 ? Math.max(...years) : 0;
    };

    const resumeYears = extractYears(resume);
    const jobYears = extractYears(jobText);
    
    if (resumeYears > 0) {
        if (jobYears > 0) {
            if (resumeYears >= jobYears) {
                analysis.matchScore += 25;
                analysis.pros.push(`📈 Experience exceeds requirements: ${resumeYears}+ years`);
            } else if (resumeYears >= jobYears * 0.7) {
                analysis.matchScore += 18;
                analysis.pros.push(`📈 Close to experience target: ${resumeYears}+ years`);
            } else {
                analysis.matchScore += 10;
                analysis.cons.push(`📉 May need more experience: ${resumeYears}+ years (seeks ${jobYears}+)`);
            }
        } else {
            analysis.matchScore += 20;
            analysis.pros.push(`📈 Solid ${resumeYears}+ years of experience`);
        }
    }

    // Role level matching (15% of total)
    const levels = ['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'director'];
    const getLevel = (text) => {
        for (let i = levels.length - 1; i >= 0; i--) {
            if (text.includes(levels[i])) return i;
        }
        return 2; // Default to mid-level
    };

    const resumeLevel = getLevel(resume);
    const jobLevel = getLevel(jobText);
    
    if (Math.abs(resumeLevel - jobLevel) <= 1) {
        analysis.matchScore += 15;
        analysis.pros.push(`👔 Appropriate role level alignment`);
    } else if (jobLevel > resumeLevel + 1) {
        analysis.matchScore += 8;
        analysis.cons.push(`👔 Position may require higher seniority`);
    } else {
        analysis.cons.push(`👔 Position may be below your experience level`);
    }

    // Preferences matching (10% of total)
    if (preferences) {
        let prefScore = 0;
        
        // Remote work
        if (preferences.includes('remote')) {
            if (jobText.includes('remote') || jobText.includes('work from home')) {
                prefScore += 5;
                analysis.pros.push('🏠 Remote work available (matches preference)');
            } else if (jobText.includes('onsite') || jobText.includes('office')) {
                analysis.cons.push('🏢 On-site required (you prefer remote)');
            }
        }
        
        // Work-life balance
        if (preferences.includes('work-life balance') || preferences.includes('balance')) {
            if (jobText.includes('work-life balance') || jobText.includes('flexible')) {
                prefScore += 3;
                analysis.pros.push('⚖️ Emphasizes work-life balance');
            } else if (jobText.includes('fast-paced') || jobText.includes('high-pressure')) {
                analysis.cons.push('⚡ Fast-paced environment (you value balance)');
            }
        }
        
        // Salary information
        if (jobData.salary) {
            prefScore += 2;
            analysis.pros.push(`💰 Salary disclosed: ${jobData.salary}`);
        } else if (preferences.includes('salary') || preferences.includes('transparent')) {
            analysis.cons.push('💰 Salary not disclosed');
        }
        
        analysis.matchScore += prefScore;
    }

    // Format score to 1 decimal place
    analysis.matchScore = Math.round(Math.max(0, Math.min(100, analysis.matchScore)) * 10) / 10;

    // Generate recommendations
    if (analysis.matchScore >= 75.0) {
        analysis.recommendations.push('🎯 Excellent match! Strongly recommend applying.');
    } else if (analysis.matchScore >= 60.0) {
        analysis.recommendations.push('👍 Good fit overall. Worth pursuing this opportunity.');
    } else if (analysis.matchScore >= 45.0) {
        analysis.recommendations.push('🤔 Moderate match. Research company culture and growth opportunities.');
    } else {
        analysis.recommendations.push('⚠️ Lower compatibility. Consider if you\'re willing to stretch into new areas.');
    }

    // Skill development suggestions
    const missingSkills = uniqueJobSkills.filter(skill => 
        !uniqueMatchingSkills.some(match => match.includes(skill) || skill.includes(match))
    ).slice(0, 3);
    
    if (missingSkills.length > 0 && analysis.matchScore < 70) {
        analysis.recommendations.push(`📚 Consider developing: ${missingSkills.join(', ')}`);
    }

    return analysis;
}

function createAnalysisDisplay(jobData, analysis) {
    // Remove existing analysis if present
    const existing = document.getElementById('job-analyzer-widget');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'job-analyzer-widget';
    widget.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; width: 350px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-height: 80vh; overflow-y: auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 12px 12px 0 0; position: relative;">
                <button id="close-analyzer" style="position: absolute; right: 10px; top: 10px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
                <h3 style="margin: 0; font-size: 18px;">🎯 Job Analysis</h3>
                <div style="margin-top: 8px; font-size: 24px; font-weight: bold;">
                    Match Score: ${analysis.matchScore}%
                    <div style="background: rgba(255,255,255,0.3); border-radius: 10px; height: 6px; margin-top: 5px;">
                        <div style="background: ${analysis.matchScore >= 70 ? '#4CAF50' : analysis.matchScore >= 50 ? '#FF9800' : '#F44336'}; height: 6px; border-radius: 10px; width: ${analysis.matchScore}%;"></div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px;">
                ${analysis.pros.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #4CAF50; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">PROS</h4>
                        ${analysis.pros.map(pro => `<div style="margin-bottom: 8px; padding: 8px; background: #E8F5E8; border-radius: 6px; font-size: 13px; line-height: 1.4;">${pro}</div>`).join('')}
                    </div>
                ` : ''}
                
                ${analysis.cons.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #F44336; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">CONS</h4>
                        ${analysis.cons.map(con => `<div style="margin-bottom: 8px; padding: 8px; background: #FFEBEE; border-radius: 6px; font-size: 13px; line-height: 1.4;">${con}</div>`).join('')}
                    </div>
                ` : ''}
                
                ${analysis.recommendations.length > 0 ? `
                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #2196F3; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">RECOMMENDATIONS</h4>
                        ${analysis.recommendations.map(rec => `<div style="margin-bottom: 8px; padding: 8px; background: #E3F2FD; border-radius: 6px; font-size: 13px; line-height: 1.4;">${rec}</div>`).join('')}
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 8px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <button id="export-json" style="flex: 1; padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">📄 Export JSON</button>
                    <button id="export-csv" style="flex: 1; padding: 8px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">📊 Export CSV</button>
                    <button id="send-webhook" style="flex: 1; padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🔗 Send</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(widget);

    // Add close functionality
    document.getElementById('close-analyzer').addEventListener('click', () => {
        widget.remove();
    });

    // Export functionality
    document.getElementById('export-json').addEventListener('click', () => {
        exportAnalysisAsJSON(jobData, analysis);
    });

    document.getElementById('export-csv').addEventListener('click', () => {
        exportAnalysisAsCSV(jobData, analysis);
    });

    document.getElementById('send-webhook').addEventListener('click', () => {
        sendToWebhookFromWidget(jobData, analysis);
    });

    // Auto-hide after 30 seconds
    setTimeout(() => {
        if (document.getElementById('job-analyzer-widget')) {
            widget.style.opacity = '0.7';
        }
    }, 30000);
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'testScraper') {
        const jobData = scrapeJobData();
        console.log('Scraped job data:', jobData);
        sendResponse({success: true, jobData: jobData});
        return true;
    }
    
    if (request.action === 'analyzeJob') {
        const jobData = scrapeJobData();
        
        if (!jobData || !jobData.title) {
            sendResponse({success: false, error: 'Could not scrape job data from this page'});
            return true;
        }

        // Get user settings
        chrome.storage.sync.get(['resumeText', 'preferencesText'], (data) => {
            if (!data.resumeText) {
                sendResponse({success: false, error: 'Please add your resume information in the extension popup first'});
                return;
            }

            const analysis = analyzeJobFit(jobData, data.resumeText, data.preferencesText);
            createAnalysisDisplay(jobData, analysis);
            
            sendResponse({success: true, analysis: analysis, jobData: jobData});
        });
        
        return true; // Keep message channel open for async response
    }
});