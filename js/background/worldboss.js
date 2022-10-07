import {GQL_API_URL} from "./util";

export const getRaidState = async (avatarAddressList) => {
  // Get raidId by current block
  chrome.storage.local.get(["block"], async (data) => {
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