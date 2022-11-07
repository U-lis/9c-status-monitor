export const getAgentState = async (address) => {
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
  const response = await chrome.storage.local.get("connectedRpc");
  let avatarState = await chrome.storage.local.get("avatarState");
  avatarState = avatarState.avatarState ?? {};

  // Get agentState.avatarStates.address from local storage and use

  const resp = await fetch(
    `http://${response.connectedRpc}/graphql`,
    {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({query: query})
    });
  if (resp.status === 200) {
    const result = await resp.json();
    let agentState = await chrome.storage.local.get("agentState");
    agentState = agentState.agentState.agentState ?? {};
    agentState[address] = result.data.stateQuery.agent;
    for (const avatar of result.data.stateQuery.agent.avatarStates) {
      avatarState[avatar.address] = avatar;
    }
    chrome.storage.local.set({agentState});
    chrome.storage.local.set({avatarState});
  } else {
    const err = await resp.text()
    console.log(`AgentState fetch failed: ${resp.status} : ${err}`);
  }
};