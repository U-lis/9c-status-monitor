import Swal from "sweetalert2";
import {sendMessage} from "./message";
import "../scss/status.scss";


const INTERVAL = 5;
const FRACTION = 3;
let addressList = new Set();
let currentBlock = 0;

const round2 = (num) => {
  return (+(Math.round(num + `e+${FRACTION}`) + `e-${FRACTION}`)).toFixed(FRACTION);
};

const updateData = async () => {
  const priceResp = await sendMessage({
    cmd: "updatePrice"
  });
  const price = JSON.parse(priceResp.data);
  document.getElementById("wncg-price").innerText = round2(price);

  const blockResp = await sendMessage({
    cmd: "updateBlock"
  });
  const data = JSON.parse(blockResp.data);
  currentBlock = data.block.index;
  document.getElementById("block-tip").innerText = data.block.index.toLocaleString();
};

const addAddress = async (address) => {
  const template = document.getElementById("address-template");
  let title = template.content.querySelector("div.title");
  const titleNode = document.importNode(title, true);
  const addrText = document.createTextNode(address);
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

    data.agentState.agent.avatarStates.forEach(avatar => {
      let avatarNode = document.importNode(item, true);
      const name = document.createTextNode(avatar.name);
      avatarNode.querySelector(".header.name").insertBefore(name, avatarNode.querySelector(".level"));
      avatarNode.querySelector(".level").innerText = `Lv. ${avatar.level}`;
      avatarNode.querySelector(".address").innerText = `#${avatar.address.slice(2, 6)}`
      avatarNode.querySelector(".ap .header").innerText = avatar.actionPoint;
      const apBlock = currentBlock - avatar.dailyRewardReceivedIndex;
      avatarNode.querySelector(".ap-remain .header").innerText = `${apBlock > 1700 ? "1700+" : apBlock} / 1700`;
      avatarList.appendChild(avatarNode);
    });
  } else {
    const node = document.getElementById(address);
    node.innerText = addressResp.message;
  }
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
      updateAddress(address)
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
