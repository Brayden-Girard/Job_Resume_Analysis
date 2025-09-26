console.log('Popup script loaded successfully');

// Load saved settings
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
});

function loadSettings() {
    chrome.storage.sync.get(['resumeText', 'fullResume', 'webhookUrl', 'exportFormat'], function(data) {
        document.getElementById('resumeText').value = data.resumeText || '';
        document.getElementById('preferencesText').value = data.fullResume || '';
    });
}

function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${isError ? 'error' : 'success'}`;
    setTimeout(() => status.textContent = '', 3000);
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', function() {
    const resumeText = document.getElementById('resumeText').value;
    const fullResume = document.getElementById('preferencesText').value;
    
    chrome.storage.sync.set({
        resumeText: resumeText,
        fullResume: fullResume
    }, function() {
        showStatus('Settings saved successfully!');
    });
});

// Analyze current job
document.getElementById('analyzeJob').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'analyzeJob'}, function(response) {
            if (chrome.runtime.lastError) {
                showStatus('Error: Make sure you\'re on a supported job site', true);
                return;
            }
            
            if (response && response.success) {
                showStatus('Analysis complete! Check the job page.');
            } else {
                showStatus('Failed to analyze job listing', true);
            }
        });
    });
});

// Test scraper
document.getElementById('testScraper').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'testScraper'}, function(response) {
            if (chrome.runtime.lastError) {
                showStatus('Error: Make sure you\'re on a supported job site', true);
                return;
            }
            
            if (response && response.jobData) {
                console.log('Scraped job data:', response.jobData);
                showStatus('Scraper test successful! Check console for details.');
            } else {
                showStatus('Scraper test failed', true);
            }
        });
    });
});

// View analysis history
document.getElementById('viewHistory').addEventListener('click', function() {
    console.log('View History button clicked');
    
    // First, always check if we have history data
    chrome.storage.local.get(['analysisHistory'], function(data) {
        const history = data.analysisHistory || [];
        console.log('History data found:', history.length, 'items');
        
        if (history.length === 0) {
            showStatus('No analysis history found');
            return;
        }
        
        // Try to show on current page first
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            console.log('Current tab URL:', currentTab.url);
            
            // Check if we're on a supported job site
            const jobSites = ['linkedin.com/jobs', 'indeed.com/viewjob', 'glassdoor.com/job', 'monster.com/job', 'ziprecruiter.com/jobs'];
            const isJobSite = jobSites.some(site => currentTab.url && currentTab.url.includes(site));
            
            console.log('Is job site:', isJobSite);
            
            if (isJobSite) {
                // Try to send message to content script
                chrome.tabs.sendMessage(currentTab.id, {action: 'showHistory'}, function(response) {
                    console.log('Content script response:', response, 'Error:', chrome.runtime.lastError);
                    
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log('Content script not available, showing popup modal');
                        showHistoryModal(history);
                    } else {
                        console.log('History shown in content script, closing popup');
                        window.close();
                    }
                });
            } else {
                console.log('Not on job site, showing popup modal');
                showHistoryModal(history);
            }
        });
    });
});

// Export analysis data
document.getElementById('exportData').addEventListener('click', function() {
    chrome.storage.local.get(['analysisHistory'], function(data) {
        const history = data.analysisHistory || [];
        if (history.length === 0) {
            showStatus('No data to export');
            return;
        }
        
        exportAnalysisData(history);
    });
});

// Webhook settings
document.getElementById('webhookSettings').addEventListener('click', function() {
    showWebhookModal();
});

function exportAnalysisData(history) {
    const exportData = {
        exportedAt: new Date().toISOString(),
        totalAnalyses: history.length,
        analyses: history.map(item => ({
            jobTitle: item.jobData.title,
            company: item.jobData.company,
            location: item.jobData.location,
            url: item.jobData.url,
            matchScore: item.analysis.matchScore,
            pros: item.analysis.pros,
            cons: item.analysis.cons,
            recommendations: item.analysis.recommendations,
            analyzedAt: item.analyzedAt,
            salary: item.jobData.salary,
            description: item.jobData.description.substring(0, 500) + '...' // Truncate for size
        }))
    };

    // Create downloadable JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    // Create download link
    const url = URL.createObjectURL(dataBlob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    chrome.downloads.download({
        url: url,
        filename: `job-analysis-export-${timestamp}.json`,
        saveAs: true
    }, function(downloadId) {
        if (downloadId) {
            showStatus('Export completed successfully!');
        } else {
            showStatus('Export failed', true);
        }
        URL.revokeObjectURL(url);
    });
}

function showWebhookModal() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 8px; width: 400px; max-width: 90vw;">
            <h3 style="margin-top: 0; color: #34495e;">🔗 Webhook Settings</h3>
            <p style="color: #666; font-size: 13px; margin: 10px 0;">Send analysis results automatically to your application</p>
            
            <label style="display: block; margin: 15px 0 5px 0; font-weight: 600; color: #34495e;">Webhook URL:</label>
            <input type="url" id="webhookUrlInput" placeholder="https://your-app.com/api/job-analysis" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            
            <label style="display: block; margin: 15px 0 5px 0; font-weight: 600; color: #34495e;">Authentication (Optional):</label>
            <input type="text" id="webhookAuthInput" placeholder="Bearer token or API key" 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            
            <div style="margin: 15px 0;">
                <label style="display: flex; align-items: center; font-size: 13px; color: #666;">
                    <input type="checkbox" id="autoSendCheckbox" style="margin-right: 8px;">
                    Automatically send analysis results
                </label>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="testWebhook" style="flex: 1; padding: 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Webhook</button>
                <button id="saveWebhook" style="flex: 1; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                <button id="closeModal" style="flex: 1; padding: 10px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load existing settings
    chrome.storage.sync.get(['webhookUrl', 'webhookAuth', 'autoSendWebhook'], function(data) {
        document.getElementById('webhookUrlInput').value = data.webhookUrl || '';
        document.getElementById('webhookAuthInput').value = data.webhookAuth || '';
        document.getElementById('autoSendCheckbox').checked = data.autoSendWebhook || false;
    });
    
    // Event listeners
    document.getElementById('closeModal').onclick = () => modal.remove();
    
    document.getElementById('saveWebhook').onclick = () => {
        const webhookUrl = document.getElementById('webhookUrlInput').value;
        const webhookAuth = document.getElementById('webhookAuthInput').value;
        const autoSend = document.getElementById('autoSendCheckbox').checked;
        
        chrome.storage.sync.set({
            webhookUrl: webhookUrl,
            webhookAuth: webhookAuth,
            autoSendWebhook: autoSend
        }, function() {
            showStatus('Webhook settings saved!');
            modal.remove();
        });
    };
    
    document.getElementById('testWebhook').onclick = () => {
        const webhookUrl = document.getElementById('webhookUrlInput').value;
        const webhookAuth = document.getElementById('webhookAuthInput').value;
        
        if (!webhookUrl) {
            alert('Please enter a webhook URL');
            return;
        }
        
        testWebhook(webhookUrl, webhookAuth);
    };
}

function testWebhook(url, auth) {
    const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook from Job Analyzer extension'
    };
    
    sendToWebhook(url, auth, testData)
        .then(response => {
            if (response.ok) {
                showStatus('Webhook test successful!');
            } else {
                showStatus(`Webhook test failed: ${response.status}`, true);
            }
        })
        .catch(error => {
            showStatus(`Webhook test error: ${error.message}`, true);
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

function showHistoryModal(history) {
    console.log('Showing history modal with', history.length, 'items');
    
    // Remove existing modal if present
    const existingModal = document.getElementById('history-modal');
    if (existingModal) existingModal.remove();

    // Calculate stats
    const total = history.length;
    const avgScore = total > 0 ? Math.round(history.reduce((sum, item) => sum + item.analysis.matchScore, 0) / total) : 0;
    const highMatches = history.filter(item => item.analysis.matchScore >= 70).length;

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'history-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 90vw; max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; position: sticky; top: 0; z-index: 1;">
                <button id="close-history-modal" style="position: absolute; right: 15px; top: 15px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px; line-height: 1;">×</button>
                <h2 style="margin: 0 0 15px 0; font-size: 24px;">📊 Analysis History</h2>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="background: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 8px; text-align: center; min-width: 80px;">
                        <div style="font-size: 24px; font-weight: bold;">${total}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Total</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 8px; text-align: center; min-width: 80px;">
                        <div style="font-size: 24px; font-weight: bold;">${avgScore}%</div>
                        <div style="font-size: 12px; opacity: 0.9;">Avg Score</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 8px; text-align: center; min-width: 80px;">
                        <div style="font-size: 24px; font-weight: bold;">${highMatches}</div>
                        <div style="font-size: 12px; opacity: 0.9;">High Match</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;">
                    <button id="export-all-history" style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">📁 Export All</button>
                    <select id="history-score-filter" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
                        <option value="all">All Scores</option>
                        <option value="high">High (70%+)</option>
                        <option value="medium">Medium (40-69%)</option>
                        <option value="low">Low (<40%)</option>
                    </select>
                    <input type="text" id="history-search" placeholder="Search..." style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; flex: 1; min-width: 150px;">
                    <button id="clear-all-history" style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">🗑️ Clear All</button>
                </div>
                
                <div id="history-list" style="max-height: 50vh; overflow-y: auto;">
                    ${renderHistoryItems(history)}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    console.log('Modal added to DOM');
    
    // Add event listeners
    document.getElementById('close-history-modal').onclick = () => {
        console.log('Closing modal');
        modal.remove();
    };
    
    modal.onclick = (e) => { 
        if (e.target === modal) {
            console.log('Closing modal via backdrop click');
            modal.remove();
        }
    };
    
    document.getElementById('export-all-history').onclick = () => {
        console.log('Exporting all history');
        exportAllHistory(history);
    };
    
    document.getElementById('clear-all-history').onclick = () => {
        if (confirm('Are you sure you want to clear all analysis history? This cannot be undone.')) {
            chrome.storage.local.remove(['analysisHistory'], () => {
                showStatus('History cleared successfully');
                modal.remove();
            });
        }
    };
    
    // Filter functionality
    const scoreFilter = document.getElementById('history-score-filter');
    const searchInput = document.getElementById('history-search');
    
    function filterHistory() {
        const scoreValue = scoreFilter.value;
        const searchValue = searchInput.value.toLowerCase();
        
        let filtered = history.filter(item => {
            const score = item.analysis.matchScore;
            let scoreMatch = true;
            if (scoreValue === 'high') scoreMatch = score >= 70;
            else if (scoreValue === 'medium') scoreMatch = score >= 40 && score < 70;
            else if (scoreValue === 'low') scoreMatch = score < 40;
            
            const searchMatch = !searchValue || 
                item.jobData.title.toLowerCase().includes(searchValue) ||
                item.jobData.company.toLowerCase().includes(searchValue) ||
                item.jobData.location.toLowerCase().includes(searchValue);
            
            return scoreMatch && searchMatch;
        });
        
        document.getElementById('history-list').innerHTML = renderHistoryItems(filtered);
    }
    
    scoreFilter.onchange = filterHistory;
    searchInput.oninput = filterHistory;
}

function renderHistoryItems(history) {
    if (history.length === 0) {
        return `
            <div style="text-align: center; padding: 40px 20px; color: #7f8c8d;">
                <h3 style="margin: 0 0 10px 0;">No Results Found</h3>
                <p style="margin: 0;">Try adjusting your filters.</p>
            </div>
        `;
    }
    
    return history.map((item, index) => {
        const { jobData, analysis, analyzedAt } = item;
        const scoreColor = analysis.matchScore >= 70 ? '#27ae60' : 
                          analysis.matchScore >= 40 ? '#f39c12' : '#e74c3c';
        
        return `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${scoreColor};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 15px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px;">${jobData.title || 'Unknown Position'}</h4>
                        <p style="margin: 0 0 3px 0; color: #7f8c8d; font-size: 14px;">${jobData.company || 'Unknown Company'}</p>
                        <p style="margin: 0; color: #95a5a6; font-size: 12px;">
                            📍 ${jobData.location || 'Remote'} | 📅 ${new Date(analyzedAt).toLocaleDateString()}
                            ${jobData.salary ? ` | 💰 ${jobData.salary}` : ''}
                        </p>
                    </div>
                    <div style="text-align: center; min-width: 60px;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: ${scoreColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin: 0 auto 5px;">
                            ${analysis.matchScore}%
                        </div>
                    </div>
                </div>
                
                ${analysis.pros.length > 0 ? `
                    <div style="margin: 10px 0;">
                        <strong style="color: #27ae60; font-size: 12px;">PROS:</strong>
                        <div style="font-size: 12px; color: #555; margin-top: 3px;">
                            ${analysis.pros.slice(0, 2).map(pro => `• ${pro}`).join('<br>')}
                            ${analysis.pros.length > 2 ? `<br>• ... and ${analysis.pros.length - 2} more` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${analysis.cons.length > 0 ? `
                    <div style="margin: 10px 0;">
                        <strong style="color: #e74c3c; font-size: 12px;">CONS:</strong>
                        <div style="font-size: 12px; color: #555; margin-top: 3px;">
                            ${analysis.cons.slice(0, 2).map(con => `• ${con}`).join('<br>')}
                            ${analysis.cons.length > 2 ? `<br>• ... and ${analysis.cons.length - 2} more` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
                    ${jobData.url ? `<a href="${jobData.url}" target="_blank" style="padding: 4px 8px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; font-size: 11px;">🔗 View Job</a>` : ''}
                    <button onclick="exportSingleFromModal(${index})" style="padding: 4px 8px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📄 Export</button>
                    <button onclick="copySingleFromModal(${index})" style="padding: 4px 8px; background: #34495e; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋 Copy</button>
                </div>
            </div>
        `;
    }).join('');
}

function exportAllHistory(history) {
    const exportData = {
        exportedAt: new Date().toISOString(),
        totalAnalyses: history.length,
        analyses: history
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-analysis-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showStatus('History export completed!');
}

// Global functions for modal buttons (needed because they're called from HTML)
window.exportSingleFromModal = function(index) {
    chrome.storage.local.get(['analysisHistory'], function(data) {
        const history = data.analysisHistory || [];
        const item = history[index];
        if (!item) return;
        
        const exportData = {
            ...item,
            exportedAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `job-analysis-${item.jobData.company}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
};

window.copySingleFromModal = function(index) {
    chrome.storage.local.get(['analysisHistory'], function(data) {
        const history = data.analysisHistory || [];
        const item = history[index];
        if (!item) return;
        
        const text = `
Job Analysis Report
==================
Position: ${item.jobData.title}
Company: ${item.jobData.company}
Location: ${item.jobData.location}
Match Score: ${item.analysis.matchScore}%
URL: ${item.jobData.url}

Pros:
${item.analysis.pros.map(pro => `• ${pro}`).join('\n')}

Cons:
${item.analysis.cons.map(con => `• ${con}`).join('\n')}

Recommendations:
${item.analysis.recommendations.map(rec => `• ${rec}`).join('\n')}

Analyzed: ${new Date(item.analyzedAt).toLocaleString()}
        `.trim();
        
        navigator.clipboard.writeText(text).then(() => {
            showStatus('Analysis copied to clipboard!');
        });
    });
};