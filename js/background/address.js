import {serialize} from "./util";

export const initAddressList = () => {
  chrome.storage.sync.get(["addressList"], (resp) => {
    if (!resp.addressList) {
      chrome.storage.sync.set({addressList: serialize(new Set(), true)});
    }
  });
};