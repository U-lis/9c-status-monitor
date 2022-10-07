import {ARENA_TICKET_INTERVAL, GQL_API_URL, GQL_HEADER, serialize} from "./util";

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
      headers: GQL_HEADER,
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

export const getArenaRanking = async (championship, round, avatarAddress) => {
  const query = `
{
  battleArenaRanking(
    championshipId: ${championship},
    round: ${round},
    avatarAddress: "${avatarAddress}"
  ) {
    avatarAddress
    name
    score
    ranking 
    winCount
    lossCount
    medalCount
    ticket
    ticketResetCount
    startBlockIndex
    endBlockIndex
  }
}
  `;
  const resp = await fetch(
    GQL_API_URL,
    {
      method: "POST",
      headers: GQL_HEADER,
      body: JSON.stringify({query: query})
    }
  );
  if (resp.status === 200) {
    let result = await resp.json();
    result = result.data.battleArenaRanking;
    if (result.length === 0) {
      return {};
    }

    result = result[0];
    const blockResp = await chrome.storage.local.get(["block"]);
    let blk = result.startBlockIndex;
    while (blk < blockResp.block.index) {
      blk += ARENA_TICKET_INTERVAL;
    }
    if (blk >= result.endBlockIndex) {
      result.ticketRefill = null;
    } else {
      result.ticketRefill = blk;
    }
    return result;
  } else {
    return await resp.json();
  }
};
