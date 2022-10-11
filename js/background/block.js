import {DateTime} from "luxon";

const INITIAL_BLK_COUNT = 100;

export const getBlockHeight = async () => {
  const resp = await fetch("https://api.9cscan.com/blocks?limit=1");
  if (resp.status === 200) {
    const result = await resp.json();
    let avgBlockTime = await chrome.storage.local.get(["avgBlockTime"]);
    if (avgBlockTime.avgBlockTime && avgBlockTime.avgBlockTime.blockIndex !== result.blocks[0].index) {
      avgBlockTime = avgBlockTime.avgBlockTime;
      const blkCount = result.blocks[0].index - avgBlockTime.blockIndex;
      const blkTime = DateTime.fromISO(result.blocks[0].timestamp) - DateTime.fromISO(avgBlockTime.timestamp);
      const newBlkTime = (
        (avgBlockTime.avg * avgBlockTime.blockCount + blkTime)
        / (blkCount + avgBlockTime.blockCount)
      );
      await chrome.storage.local.set({
        avgBlockTime: {
          blockIndex: result.blocks[0].index,
          timestamp: result.blocks[0].timestamp,
          blockCount: blkCount + avgBlockTime.blockCount,
          avg: newBlkTime
        }
      });
    }
    await chrome.storage.local.set({block: result.blocks[0]});
    return result.blocks[0];
  }
}

export const getAvgBlock = async () => {
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
  }
};