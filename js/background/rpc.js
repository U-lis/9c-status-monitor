export const getRpcNodeList = async (rpcList) => {
  const resp = await fetch("https://download.nine-chronicles.com/9c-launcher-config.json");
  if (resp.status === 200) {
    const r = await resp.json();
    rpcList = r.RemoteNodeList ?? [];
    console.log(`${rpcList.length} nodes detected`);
  } else {
    setTimeout(getRpcNodeList, 1000 * 10);
    return "RPC fetch failed. Try again after 10 sec";
  }
  return await connectRpc(rpcList);
};

export const connectRpc = async (rpcList) => {
  if (rpcList.length === 0) {
    await getRpcNodeList(rpcList);
  }
  const connectedRpc = rpcList[Math.floor(Math.random() * rpcList.length)].split(",")[0];
  console.log(`Connect to ${connectedRpc}`);
  chrome.storage.local.set({connectedRpc});
  return connectedRpc;
};
