const init = async () => {
  const resp = await sendMessage({
    cmd: "getAddressList"
  });

  const addressList = new Set(JSON.parse(resp.data));

  setTimeout(() => {}, 1000*10);
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
