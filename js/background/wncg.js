export const getCurrentPrice = async () => {
  const resp = await fetch("https://api.9cscan.com/price");
  if (resp.status === 200) {
    const r = await resp.json();
    chrome.storage.local.set({
      wncg: {
        price: r.quote.USD.price
      }
    });
  } else {
    console.log(`WNCG fetch failed: ${resp.status}`);
  }
}