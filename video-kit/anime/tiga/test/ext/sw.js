self.uiBack = async () => { const [t] = await chrome.tabs.query({}); await chrome.tabs.goBack(t.id); return t.url; };
self.uiFwd = async () => { const [t] = await chrome.tabs.query({}); await chrome.tabs.goForward(t.id); return t.url; };
