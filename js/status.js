import Swal from "sweetalert2";
import {sendMessage} from "./message";
import "../scss/status.scss";
import {round2} from "./util";
import {Duration} from "luxon";
import {INTERVAL} from "./const";

const AP_CHARGE_INTERVAL = 1700;
let addressList = new Set();

const updatePrice = async () => {
  let priceData = await chrome.storage.local.get("wncg");
  priceData = priceData.wncg;
  if (!priceData) {
    console.log("No WNCG data found in local storage.");
    return;
  }

  document.getElementById("wncg-price").innerText = round2(priceData.price);
};

const updateBlock = async () => {
  let blockData = await chrome.storage.local.get("block");
  blockData = blockData.block;
  if (!blockData) {
    console.log("No Block data found in local storage");
    return;
  }

  document.getElementById("block-tip").innerText = blockData.index.toLocaleString();
};

const updateArena = async () => {
  let arenaData = await chrome.storage.local.get("arena");
  arenaData = arenaData.arena;
  if (!arenaData) {
    console.log("No Arena data found in local storage");
    return;
  }

  document.getElementById("arena-season").innerText = (
    arenaData.arenaType === "Season" ? `Season ${arenaData.season}` :
      arenaData.arenaType === "Championship" ? `Championship ${arenaData.championshipId}` : "Off-Season"
  );
  if (arenaData.arenaType === "OffSeason") {
    document.getElementById("ticket-refill")?.remove();
  } else {
    let avgBlockTime = await chrome.storage.local.get("avgBlockTime");
    avgBlockTime = avgBlockTime.avgBlockTime;
    if (!avgBlockTime) {
      console.log("No Average block time data found in local storage");
    }
    const remainBlock = arenaData.ticketRefill - avgBlockTime.blockIndex;
    const remainTime = parseFloat(round2(avgBlockTime.avg * remainBlock / 1000, 2));
    const duration = Duration.fromObject({seconds: remainTime});
    document.getElementById("arena-ticket-refill-count").innerText = `Block ${arenaData.ticketRefill.toLocaleString()} (~ ${duration.toFormat("hh 'hr.' mm 'min.'")})`;
  }
};

const addAddress = async (address) => {
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
};

const updateAddress = async (address) => {
  const addressResp = await sendMessage({
    cmd: "updateAddress",
    data: address
  });
  if (addressResp.ok) {
    const data = JSON.parse(addressResp.data);
    const topNode = document.getElementById(data.agentState.agent.address);
    topNode.querySelector(".ncg>.content>.header").innerHTML = data.agentState.agent.gold;
    topNode.querySelector(".crystal>.content>.header").innerHTML = parseInt(data.agentState.agent.crystal.split(".")[0]).toLocaleString();

    const avatarList = topNode.querySelector(".avatar-list");
    avatarList.innerHTML = "";

    const template = document.getElementById("avatar-template");
    let item = template.content.querySelector("div.card");

    for (const avatar of data.agentState.agent.avatarStates) {
      const resp = await chrome.storage.local.get(["block"]);
      let avatarNode = document.importNode(item, true);
      avatarNode.id = avatar.address;
      avatarList.appendChild(avatarNode);

      const name = document.createTextNode(avatar.name);
      avatarNode.querySelector(".header.name").insertBefore(name, avatarNode.querySelector(".level"));
      avatarNode.querySelector(".level").innerText = `Lv. ${avatar.level}`;
      avatarNode.querySelector(".address").innerText = `#${avatar.address.slice(2, 6)}`

      avatarNode.querySelector(".ap .header").innerText = avatar.actionPoint;
      const apBlock = resp.block.index - avatar.dailyRewardReceivedIndex;
      avatarNode.querySelector(".ap-remain .header").innerText = `${apBlock > AP_CHARGE_INTERVAL ? `${AP_CHARGE_INTERVAL}+` : apBlock} / ${AP_CHARGE_INTERVAL}`;

      const arenaRanking = await getArenaRanking(avatar.address);
      if (arenaRanking) {
        avatarNode.querySelector(".arena-ticket-count.header").innerText = arenaRanking.ticket;
        avatarNode.querySelector(".arena-ranking.header").innerText = `${arenaRanking.ranking} (${arenaRanking.score} Pt.)`;
        avatarNode.querySelector(".arena-medal.header").innerText = `${arenaRanking.medalCount} (${arenaRanking.winCount} / ${arenaRanking.lossCount})`;
        // avatarNode.querySelector(".arena-cp.header").innerText = arenaRanking.cp;
      } else {
        avatarNode.querySelector(".arena-ticket-count.header").innerText = "No Arena Info.";
        avatarNode.querySelector(".item.arena-ticket-refill").remove();
      }
    }
  } else {
    const node = document.getElementById(address);
    node.innerText = addressResp.message;
  }
};

const getArenaRanking = async (avatarAddress) => {
  const resp = await sendMessage({
    cmd: "updateArenaRanking",
    data: avatarAddress
  });
  return JSON.parse(resp.data);
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

  setInterval(() => {
    // updateData();
    addressList.forEach((address) => {
      updateAddress(address);
    });
  }, 1000 * INTERVAL);

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

  setInterval(async() => {
    updatePrice();
    updateBlock();
    updateArena();
  }, INTERVAL*1000);
}

window.onload = init;
