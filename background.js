// Background script for the Job Analyzer extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Analyzer extension installed');
    
    // Set up default settings
    chrome.storage.sync.get(['resumeText', 'preferencesText'], (data) => {
        if (!data.resumeText) {
            chrome.storage.sync.set({
                resumeText: '',
                preferencesText: 'Remote work preferred\nWork-life balance important\nCompetitive salary expected\nGrowth opportunities valued'
            });
        }
    });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // The popup will handle this, but we can add additional logic here if needed
    console.log('Extension icon clicked on tab:', tab.url);
});

// Listen for tab updates to potentially auto-detect job pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        const jobSites = ['linkedin.com/jobs', 'indeed.com/viewjob', 'glassdoor.com/job', 'monster.com/job', 'ziprecruiter.com/jobs'];
        const isJobSite = jobSites.some(site => tab.url.includes(site));
        
        if (isJobSite) {
            // Optionally show a notification or badge
            chrome.action.setBadgeText({
                tabId: tabId,
                text: '!'
            });
            chrome.action.setBadgeBackgroundColor({
                tabId: tabId,
                color: '#4CAF50'
            });
        } else {
            chrome.action.setBadgeText({
                tabId: tabId,
                text: ''
            });
        }
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'logAnalysis') {
        console.log('Job analysis completed:', request.data);
        // Could save to storage for history tracking
    }
    
    // Keep the message channel open
    return true;
});