export const getCurrentPrice = async () => {
  const resp = await fetch("https://api.9cscan.com/price");
  if (resp.status === 200) {
    const r = await resp.json();
    return r.quote.USD.price;
  } else {
    return -1;
  }
}