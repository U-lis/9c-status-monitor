import Swal from "sweetalert2";
import {sendMessage} from "./message";
import "../scss/status.scss";
import {round2} from "./background/util";


const INTERVAL = 5;
const AP_CHARGE_INTERVAL = 1700;
let addressList = new Set();

const updateData = async () => {
  const resp = await sendMessage({
    cmd: "updateGlobalData"
  });
  const data = JSON.parse(resp.data);
  document.getElementById("wncg-price").innerText = round2(data.price);
  document.getElementById("block-tip").innerText = data.block.index.toLocaleString();
  document.getElementById("arena-season").innerText = (
    data.arena.arenaType === "Season" ? `Season ${data.arena.season}` :
      data.arena.arenaType === "Championship" ? `Championship ${data.arena.championshipId}` : "Off-Season"
  );
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
        avatarNode.querySelector(".arena-ticket-refill.header").innerText = arenaRanking.ticketRefill;
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
  await updateData();

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
    updateData();
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
}

window.onload = init;
