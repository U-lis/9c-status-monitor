import {sendMessage} from "./message";
import "../scss/status.scss";

const FRACTION = 3;

const round2 = (num) => {
  return (+(Math.round(num + `e+${FRACTION}`) + `e-${FRACTION}`)).toFixed(FRACTION);
};

const updateData = async () => {
  const priceResp = await sendMessage({
    cmd: "updatePrice"
  });
  const price = JSON.parse(priceResp.data);
  document.getElementById("wncg-price").innerText = round2(price);

  const blockResp = await sendMessage({
    cmd: "updateBlock"
  });
  const data = JSON.parse(blockResp.data);
  document.getElementById("block-tip").innerText = data.block.index.toLocaleString();
};

const init = async () => {
  await updateData();

  setInterval(() => {
    updateData();
  }, 1000 * 5);

  const resp = await sendMessage({
    cmd: "getAddressList"
  });
  const addressList = new Set(JSON.parse(resp.data));

  if (addressList.size === 0) {
    location.href = "register_address.html";
  } else {
    const addrListDom = document.getElementById("address");
    addressList.forEach((addr) => {
      const el = document.createElement("div");
      el.innerText = addr;
      addrListDom.append(el);
    });
  }
}

window.onload = init;
