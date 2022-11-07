import {serialize} from "../util";

export const initAddressList = async () => {
  const resp = await chrome.storage.sync.get(["addressList"]);
  let addressList = resp.addressList;
  if (!addressList) {
    addressList = new Set();
    chrome.storage.sync.set({addressList: serialize(addressList, true)});
  } else {
    addressList = JSON.parse(addressList);
  }
  return addressList;
};