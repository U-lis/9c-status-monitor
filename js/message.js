export const sendMessage = (message) => {
  return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (resp) => {
          resolve(resp);
        });
      } catch (e) {
        reject(e)
      }
    }
  );
};
