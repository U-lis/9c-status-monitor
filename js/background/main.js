import {connectRpc, getRpcNodeList} from "./rpc";
import {initAddressList} from "./address";
import {deserialize, serialize} from "./util";
import {getBlockHeight} from "./block";
import {getCurrentPrice} from "./wncg";
import {getAgentState} from "./avatar";
import {getArenaState} from "./arena";
import {getRaidState} from "./worldboss";

// DISCUSS: Get this from github?
let rpcList = [];

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
          connectRpc(rpcList).then(sendResponse);
        }
        break;

      case "getAddressList":
        chrome.storage.sync.get(["addressList"], (resp) => {
          sendResponse({data: resp.addressList});
        });
        break;

      case "setAddress":
        chrome.storage.sync.get(["addressList"], (resp) => {
          let addressList = resp.addressList ? deserialize(resp.addressList, true) : new Set();
          addressList.add(req.data);
          chrome.storage.sync.set({"addressList": serialize(addressList, true)}, () => {
            sendResponse({message: `${req.data.slice(0, 6)}... Added`});
          });
        });
        break;

      case "updateAddress":
        const resultData = {};
        getAgentState(req.data).then((result) => {
          resultData.agentState = result;
          getArenaState(req.data).then((result) => {
            resultData.arenaState = result;
            getRaidState(req.data).then((result) => {
              resultData.raidState = result;
              sendResponse({ok: true, data: JSON.stringify(resultData)});
            });
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
          chrome.storage.sync.set({blockIndex: block}, () => {
            sendResponse({
              data: JSON.stringify({
                block: block
              })
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
  await getRpcNodeList(rpcList);
  initAddressList();
};

init();
