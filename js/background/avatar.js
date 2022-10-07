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