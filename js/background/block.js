export const getBlockHeight = async () => {
  const resp = await fetch("https://api.9cscan.com/blocks?limit=1");
  if (resp.status === 200) {
    const r = await resp.json();
    return r.blocks[0];
  }
}