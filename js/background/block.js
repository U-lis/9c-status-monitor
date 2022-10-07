export const getBlockHeight = async () => {
  const resp = await fetch("https://api.9cscan.com/blocks?limit=1");
  if (resp.status === 200) {
    const result = await resp.json();
    await chrome.storage.local.set({block: result.blocks[0]});
    return result.blocks[0];
  }
}