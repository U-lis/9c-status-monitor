import {DateTime} from "luxon";

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

const initAddressList = () => {
  chrome.storage.sync.get(["addressList"], (resp) => {
    if (!resp.addressList) {
      chrome.storage.sync.set({addressList: serialize(new Set())});
    }
  });
};

const getBlockHeight = async () => {
  const resp = await fetch("https://api.9cscan.com/blocks?limit=1");
  if (resp.status === 200) {
    const r = await resp.json();
    return r.blocks[0];
  }
}

const getCurrentPrice = async () => {
  const resp = await fetch("https://api.9cscan.com/price");
  if (resp.status === 200) {
    const r = await resp.json();
    return r.quote.USD.price;
  } else {
    return -1;
  }
}


const serialize = (orig, isSet = false) => {
  if (isSet) {
    return JSON.stringify([...orig]);
  } else {
    return JSON.stringify(orig);
  }
};
const deserialize = (orig, isSet = false) => {
  let data = JSON.parse(orig);
  if (isSet) {
    return new Set(data);
  } else {
    return data;
  }
};

chrome.runtime.onInstalled.addListener(() => {
  init();
});

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
          let addressList = resp.addressList ? deserialize(resp.addressList, true) : new Set();
          addressList.add(req.data);
          const ser = serialize(addressList, true)
          chrome.storage.sync.set({"addressList": ser}, () => {
            sendResponse({message: `${req.data.slice(0, 6)}... Added`});
          });
        });
        break;

      case "removeAddress":
        chrome.storage.sync.get(["addressList"], (resp) => {
          let addressList = resp.addressList ? deserialize(resp.addressList, true) : new Set();
          const success = addressList.delete(req.data);
          chrome.storage.sync.set({"addressList": serialize(addressList, true)}, () => {
            sendResponse({ok: success, message: `${req.data.slice(0, 6)}... Removed`});
          });
        });
        break;

      case "updatePrice":
        getCurrentPrice().then((price) => {
          sendResponse({data: JSON.stringify(price)});
        });
        break;

      case "updateBlock":
        getBlockHeight().then((block) => {
          chrome.storage.sync.get(["averageBlockTime"], (resp) => {
            let avgBlockTime = resp.averageBlockTime ? deserialize(resp.averageBlockTime) : null;
            let average = -1;
            if (avgBlockTime === null) {
              avgBlockTime = {tip: block.index, ts: block.timestamp, time: 0, count: 0}
            } else if (block.index !== avgBlockTime.tip) {
              const blockTime = DateTime.fromISO(block.timestamp).diff(DateTime.fromISO(avgBlockTime.ts)).toObject();
              average = (avgBlockTime.time * avgBlockTime.count + blockTime.milliseconds) / (avgBlockTime.count + 1);
              avgBlockTime.count += 1;
              avgBlockTime.time = average;
              avgBlockTime.ts = block.timestamp;
              avgBlockTime.tip = block.index;
            }
            chrome.storage.sync.set({averageBlockTime: serialize(avgBlockTime)}, () => {
              sendResponse({
                data: JSON.stringify({
                  block: block,
                  avgBlockTime: average
                })
              });
            });
          });
        });
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

const init = async () => {
  await getRpcNodeList();
  initAddressList();
};

init();