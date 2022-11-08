import {ARENA_TICKET_INTERVAL, getLocalStorageData, GQL_API_URL, GQL_HEADER} from "../util";

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

    let block = await getLocalStorageData("block");
    if (!block) {
      console.log("Arena cannot calculate from block info");
      return;
    }

    let blk = result.startBlockIndex;
    while (blk < block.index) {
      blk += ARENA_TICKET_INTERVAL;
    }
    if (blk >= result.endBlockIndex) {
      result.ticketRefill = null;
    } else {
      result.ticketRefill = blk;
    }

    chrome.storage.local.set({arena: result});
  } else {
    const err = await resp.text();
    console.log(`Arena info fetch failed: ${resp.status} : ${err}`);
  }
};

export const getArenaRanking = async (address) => {
  const arenaState = await getLocalStorageData("arena");

  if (arenaState) {
    const agentData = await getLocalStorageData("agentState");
    const agentState = agentData ? agentData[address] : null;
    if (!agentState) {
      console.log(`No information for ${address} found. Skip this address...`);
      return;
    }

    let arenaRanking = await getLocalStorageData("arenaRanking");
    arenaRanking = arenaRanking ?? {};

    for (const avatar of agentState.avatarStates) {
      const query = `
{
  battleArenaRanking(
    championshipId: ${arenaState.championshipId},
    round: ${arenaState.round},
    avatarAddress: "${avatar.address}"
  ) {
    avatarAddress
    cp
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
        arenaRanking[avatar.address] = result.length === 0 ? null : result[0];
      } else {
        const err = await resp.text();
        console.log(`Arena Ranking info fetch failed: ${resp.status} : ${err}`);
      }
    }

    chrome.storage.local.set({arenaRanking});
  }
};
