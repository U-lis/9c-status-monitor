const GQL_API_URL = "https://api.9c.gg/graphql";
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
      chrome.storage.sync.set({addressList: serialize(new Set(), true)});
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

const getAgentState = async (address) => {
  const query = `
{
  stateQuery {
    agent(address:"${address.slice(2)}") {
      address
      avatarStates {
        address
        characterId
        dailyRewardReceivedIndex
        updatedAt
        name
        exp
        level
        actionPoint
      }
      gold
      crystal
    }
  } 
}
`;
  const response = await chrome.storage.sync.get(["connectedRpc"]);

  const resp = await fetch(
    `http://${response.connectedRpc}/graphql`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({query: query})
    });
  if (resp.status === 200) {
    const result = await resp.json();
    return result.data.stateQuery;
  } else {
    return await resp.json();
  }
};

const getArenaState = async (address) => {
  // Get arena schedule
  const query = `
{
  battleArenaInfo {
    championshipId
    round
    arenaType
    startBlockIndex
    endBlockIndex
    requiredMedalCount
    ticketPrice
    additionalTicketPrice
    queryBlockIndex
    storeTipBlockIndex
  }
}
  `;
  const resp = await fetch(
    GQL_API_URL,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({query: query})
    });

  if (resp.status === 200) {
    let result = await resp.json();
    result = result.data.battleArenaInfo;
    if (result.arenaType === "Season") {
      result.season = result.championshipId * 3 + result.round / 2;
    } else {
      result.season = null;
    }
    return result;
  } else {
    return await resp.json();
  }
};

const getRaidState = async (address) => {
  // Get raidId by current block
  chrome.storage.sync.get(["blockIndex"], async (data) => {
    const resp = await fetch(
      GQL_API_URL,
      {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({query: `{stateQuery { raidId(blockIndex: ${data.blockIndex}) }}`})
      }
    );
    if (resp.status === 200) {
      const result = await resp.json();
      if (result.errors) {
        return result.errors[0];
      } else {
        const raidId = result.data.stateQuery.raidId;
        // get raidAddress
        // get raiderState
        // return
      }
    } else {
      return await resp.json();
    }
  });

  // If error, practicing
  // if data, get raiderAddress using addressQuery
  // Get raiderState using raiderAddress
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
  await getRpcNodeList();
  initAddressList();
};

init();