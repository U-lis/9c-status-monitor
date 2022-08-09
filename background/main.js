chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    console.log("req.action");
  } catch (e) {
    sendResponse(e)
  }

  return true
});
