import Swal from "sweetalert2";
import {sendMessage} from "./message";
import "../scss/status.scss";
import {getLocalStorageData, round2} from "./util";
import {Duration} from "luxon";
import {INTERVAL} from "./const";

const AP_CHARGE_INTERVAL = 1700;
let addressList = new Set();

const updatePrice = async () => {
  const priceData = await getLocalStorageData("wncg");
  if (priceData) {
    document.getElementById("wncg-price").innerText = round2(priceData.price);
  }
};

const updateBlock = async () => {
  const blockData = await getLocalStorageData("block");
  if (blockData) {
    document.getElementById("block-tip").innerText = blockData.index.toLocaleString();
  }
};

const updateArena = async () => {
  const arenaData = await getLocalStorageData("arena");

  if (arenaData) {
    document.getElementById("arena-season").innerText = (
      arenaData.arenaType === "Season" ? `Season ${arenaData.season}` :
        arenaData.arenaType === "Championship" ? `Championship ${arenaData.championshipId}` : "Off-Season"
    );
    if (arenaData.arenaType === "OffSeason") {
      document.getElementById("ticket-refill")?.remove();
    } else {
      let avgBlockTime = await getLocalStorageData("avgBlockTime");
      if (!avgBlockTime) {
        console.log("No Average block time data found in local storage");
      }
      const remainBlock = arenaData.ticketRefill - avgBlockTime.blockIndex;
      const remainTime = parseFloat(round2(avgBlockTime.avg * remainBlock / 1000, 2));
      const duration = Duration.fromObject({seconds: remainTime});
      document.getElementById("arena-ticket-refill-count").innerText = `Block ${arenaData.ticketRefill.toLocaleString()} (~ ${duration.toFormat("hh 'hr.' mm 'min.'")})`;
    }
  }
};

const addAddress = async (address) => {
  const addressData = await getLocalStorageData("agentState");
  const agentData = addressData ? addressData[address] : null;
  if (!agentData) {
    console.log(`No ${address} data found in local storage`);
    return;
  }

  const template = document.getElementById("address-template");
  let title = template.content.querySelector("div.title");
  const titleNode = document.importNode(title, true);
  const addrText = document.createTextNode(`${address.slice(0, 6)}...${address.slice(-4)}`);
  titleNode.appendChild(addrText);

  let content = template.content.querySelector("div.content");
  const contentNode = document.importNode(content, true);
  contentNode.id = address;
  contentNode.querySelector(".remove-address").dataset.address = address;
  document.getElementById("address-list").appendChild(titleNode);
  document.getElementById("address-list").appendChild(contentNode);

  for (const avatarData of agentData.avatarStates) {
    addAvatar(address, avatarData);
  }
};

const updateAddress = async (address) => {
  const addressData = await getLocalStorageData("agentState");
  const agentData = addressData ? addressData[address] : null;
  if (!agentData) {
    console.log(`No ${address} data found in local storage`);
    return;
  }

  const targetNode = document.getElementById(address);
  if (!targetNode) {
    console.log(`No target node for address ${address} found`);
    return;
  }

  targetNode.querySelector("div.item.ncg .content .header").innerText = parseFloat(round2(agentData.gold, 2)).toLocaleString();
  targetNode.querySelector("div.item.crystal .content .header").innerText = parseInt(round2(agentData.crystal, 0)).toLocaleString();

  for (const avatarData of agentData.avatarStates) {
    updateAvatar(avatarData);
  }
};

const addAvatar = async (address, avatar) => {
  const targetNode = document.getElementById(address).querySelector(".avatar-list");
  targetNode.innerHTML = "";

  const template = document.getElementById("avatar-template");
  let item = template.content.querySelector("div.card");
  let avatarNode = document.importNode(item, true);
  avatarNode.id = avatar.address;

  const name = document.createTextNode(avatar.name);
  avatarNode.querySelector(".header.name").insertBefore(name, avatarNode.querySelector(".level"));
  avatarNode.querySelector(".level").innerText = `Lv. ${avatar.level}`;
  avatarNode.querySelector(".address").innerText = `#${avatar.address.slice(2, 6)}`

  targetNode.appendChild(avatarNode);
};

const updateAvatar = async (avatar) => {
  const blockData = await getLocalStorageData("block");
  const targetNode = document.getElementById(avatar.address);

  targetNode.querySelector(".ap .header").innerText = avatar.actionPoint;
  const apBlock = blockData.index - avatar.dailyRewardReceivedIndex;
  targetNode.querySelector(".ap-remain .header").innerText = `${apBlock > AP_CHARGE_INTERVAL ? `${AP_CHARGE_INTERVAL}+` : apBlock} / ${AP_CHARGE_INTERVAL}`;

  const arenaRanking = await getLocalStorageData("arenaRanking");
  const arenaData = arenaRanking ? arenaRanking[avatar.address] : null;
  if (arenaData) {
    targetNode.querySelector(".arena-ticket-count.header").innerText = arenaData.ticket;
    targetNode.querySelector(".arena-ranking.header").innerText = `${arenaData.ranking} (${arenaData.score} Pt.)`;
    targetNode.querySelector(".arena-medal.header").innerText = `${arenaData.medalCount} (${arenaData.winCount} / ${arenaData.lossCount})`;
    // avatarNode.querySelector(".arena-cp.header").innerText = arenaRanking.cp;
  } else {
    console.log(`No arena ranking data for avatar ${avatar.address} found in local storage`);
    targetNode.querySelector(".arena-ticket-count.header").innerText = "No Arena Info.";
  }
};

const init = async () => {
  updatePrice();
  updateBlock();
  updateArena();

  const resp = await sendMessage({
    cmd: "getAddressList"
  });
  addressList = new Set(JSON.parse(resp.data));

  if (addressList.size === 0) {
    location.href = "register_address.html";
  } else {
    document.getElementById("address-list").innerHTML = "";
    addressList.forEach((address) => {
      addAddress(address);
      updateAddress(address);
    });
    $("#address-list").accordion({exclusive: false});
  }

  document.querySelectorAll(".remove-address").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const address = e.target.dataset.address;
      Swal.fire({
        icon: "warning",
        title: `Delete address ${address.slice(0, 10)}?`,
        text: "This can be undone and you have to re-register address",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel"
      }).then(async (result) => {
        if (result.isConfirmed) {
          const removeResp = await sendMessage({
            cmd: "removeAddress",
            data: address
          });
          if (removeResp.ok) {
            Swal.fire({
              icon: "success",
              toast: true,
              timer: 1500,
              title: removeResp.message,
              showConfirmButton: false,
            });
            const targetNode = document.getElementById(address);
            targetNode.previousSibling.remove();
            targetNode.remove();
            addressList.delete(address);
            $("#address-list").accordion("refresh");
          }
        }
      });
    });
  });

  document.getElementById("add-address").addEventListener("click", () => {
    location.href = "register_address.html";
  });

  setInterval(async () => {
    updatePrice();
    updateBlock();
    updateArena();
    addressList.forEach((address) => {
      updateAddress(address);
    });
  }, INTERVAL * 1000);
}

window.onload = init;
