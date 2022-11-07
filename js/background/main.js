import {connectRpc, getRpcNodeList} from "./rpc";
import {initAddressList} from "./address";
import {deserialize, serialize} from "../util";
import {getBlockHeight, setAvgBlockTime} from "./block";
import {getCurrentPrice} from "./wncg";
import {getAgentState} from "./avatar";
import {getArenaRanking, getArenaState} from "./arena";
import {INTERVAL} from "../const";

// DISCUSS: Get this from github?
let rpcList = [];
let addressList = [];

const updateGlobalData = async () => {
  getCurrentPrice();
  getArenaState();
  getBlockHeight();
};

const updateAddress = async (address) => {
  getAgentState(address);
  getArenaRanking(address);
  // getRaidState(address);
};

const updateData = () => {
  updateGlobalData();
  console.log(`${addressList.length} addresses to fetch data`);
  for (const address of addressList) {
    updateAddress(address);
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  try {
    console.log(`msg: ${req.cmd}`);
    switch (req.cmd) {
      case "getConnectedRpc":
        const connectedRpc = chrome.storage.local.get("connectedRpc");
        if (connectedRpc) {
          return sendResponse({connectedRpc: connectedRpc})
        } else {
          connectRpc(rpcList).then(sendResponse);
        }
        break;

      case "getAddressList":
        chrome.storage.sync.get(["addressList"], (resp) => {
          addressList = deserialize(resp.addressList, true);
          sendResponse({data: resp.addressList});
        });
        break;

      case "setAddress":
        chrome.storage.sync.get(["addressList"], (resp) => {
          let addressSet = resp.addressList ? deserialize(resp.addressList, true) : new Set();
          addressSet.add(req.data);
          addressList = [...addressSet];
          chrome.storage.local.set({"addressList": serialize(addressSet, true)}, () => {
            sendResponse({message: `${req.data.slice(0, 6)}... Added`});
          });
        });
        break;

      case "removeAddress":
        chrome.storage.sync.get(["addressList"], (resp) => {
          let addressSet = resp.addressList ? deserialize(resp.addressList, true) : new Set();
          const success = addressSet.delete(req.data);
          if (success) {
            addressList = [...addressSet];
          }
          chrome.storage.sync.set({"addressList": serialize(addressSet, true)}, () => {
            sendResponse({ok: success, message: `${req.data.slice(0, 6)}... Removed`});
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
  // chrome.storage.local.clear();  // Use this function to debug
  await getRpcNodeList(rpcList);
  addressList = await initAddressList();
  const blockInfo = await chrome.storage.local.get("avgBlockTime");
  // if (!blockInfo.avgBlockTime) {
    await setAvgBlockTime();
  // }

  updateData();
  setInterval(() => {
    updateData();
  }, INTERVAL * 1000);
};

init();
