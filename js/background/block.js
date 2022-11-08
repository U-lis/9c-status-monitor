import {DateTime} from "luxon";
import {getLocalStorageData} from "../util";

const INITIAL_BLK_COUNT = 100;

export const getBlockHeight = async () => {
  const resp = await fetch("https://api.9cscan.com/blocks?limit=1");
  if (resp.status === 200) {
    const result = await resp.json();
    let avgBlockTime = await getLocalStorageData("avgBlockTime");
    if (!avgBlockTime) {
      console.log("No AvgBlockTime");
      return;
    }

    if (avgBlockTime && avgBlockTime.blockIndex !== result.blocks[0].index) {
      const blkCount = result.blocks[0].index - avgBlockTime.blockIndex;
      const blkTime = DateTime.fromISO(result.blocks[0].timestamp) - DateTime.fromISO(avgBlockTime.timestamp);
      const newBlkTime = (
        (avgBlockTime.avg * avgBlockTime.blockCount + blkTime)
        / (blkCount + avgBlockTime.blockCount)
      );
      chrome.storage.local.set({
        avgBlockTime: {
          blockIndex: result.blocks[0].index,
          timestamp: result.blocks[0].timestamp,
          blockCount: blkCount + avgBlockTime.blockCount,
          avg: newBlkTime
        }
      });
    }
    chrome.storage.local.set({block: result.blocks[0]});
  } else {
    const err = await resp.text();
    console.log(`Block fetch failed: ${resp.status} : ${err}`);
  }
}

export const setAvgBlockTime = async () => {
  const resp = await fetch(`https://api.9cscan.com/blocks?limit=${INITIAL_BLK_COUNT}`);
  if (resp.status === 200) {
    const result = await resp.json();
    const latestBlockIndex = result.blocks[0].index;
    const totalBlockTime = DateTime.fromISO(result.blocks[0].timestamp) - DateTime.fromISO(result.blocks[99].timestamp);
    chrome.storage.local.set({
      avgBlockTime: {
        blockIndex: latestBlockIndex,
        timestamp: result.blocks[0].timestamp,
        blockCount: INITIAL_BLK_COUNT,
        avg: totalBlockTime / INITIAL_BLK_COUNT
      }
    });
  } else {
    const err = await resp.text();
    console.log(`setAvgBlockTime failed: ${resp.status} : ${err}`);
  }
};