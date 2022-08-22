let rpcList = [];

const getRpcNodeList = async () => {
  const resp = await fetch("https://download.nine-chronicles.com/9c-launcher-config.json");
  if (resp.status === 200) {
    const r = await resp.json();
    rpcList = r.RemoteNodeList ?? [];
    console.log(`${rpcList.length} nodes detected`);
  } else {
    setTimeout(getRpcNodeList, 1000 * 10);
    return "RPC fetch failed. Try again after 10 sec";
  }
  return await connectRpc();
};

const connectRpc = async () => {
  if (rpcList.length === 0) {
    await getRpcNodeList();
  }
  const connectedRpc = rpcList[Math.floor(Math.random() * rpcList.length)].split(",")[0];
  console.log(`Connect to ${connectedRpc}`);
  chrome.storage.sync.set({connectedRpc});
  return connectedRpc;
};

const getCurrentPrice = async () => {
  const resp = fetch("https://api.9cscan.com/price");
  if (resp.status === 200) {
    const r = await resp.json();
    return r.quote.USD.price;
  } else {
    return -1;
  }
}


const serialize = (orig) => {
  return JSON.stringify([...orig])
};
const deserialize = (orig) => {
  return new Set(JSON.parse(orig));
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    console.log(`msg: ${req.cmd}`);
    switch (req.cmd) {
      case "getConnectedRpc":
        const connectedRpc = chrome.storage.sync.get("connectedRpc");
        if (connectedRpc) {
          return sendResponse({connectedRpc: connectedRpc})
        } else {
          connectRpc().then(sendResponse);
        }
        break;

      case "getAddressList":
        chrome.storage.sync.get(["addressList"], (resp) => {
          console.log(resp.addressList);
          sendResponse({data: resp.addressList});
        });
        break;

      case "setAddress":
        chrome.storage.sync.get(["addressList"], (resp) => {
          let addressList = resp.addressList ? deserialize(resp.addressList) : new Set();
          addressList.add(req.data);
          const ser = serialize(addressList)
          chrome.storage.sync.set({"addressList": ser}, () => {
            sendResponse({message: `${req.data.slice(0, 6)}... Added`});
          });
        });
        break;

      case "removeAddress":
        chrome.storage.sync.get(["addressList"], (resp) => {
          let addressList = resp.addressList ? deserialize(resp.addressList) : new Set();
          addressList.delete(req.data);
          chrome.storage.sync.set({"addressList": serialize(addressList)}, () => {
            sendResponse({message: `${req.data.slice(0, 6)}... Removed`});
          });
        });
        break;

      case "updatePrice":
        getCurrentPrice().then(sendResponse);
        break;

      default:
        console.log("Unknown action");
        return sendResponse({error: `Unknown action: ${req.action}`});
    }
  } catch (e) {
    sendResponse(e)
  }
  return true;
});

getRpcNodeList();