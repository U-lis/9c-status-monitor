import {GQL_API_URL} from "./util";

export const getArenaState = async () => {
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
    await chrome.storage.local.set({arena: serialize(result)});
    return result;
  } else {
    return await resp.json();
  }
};