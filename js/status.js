import Swal from "sweetalert2";
import {sendMessage} from "./message";
import "../scss/status.scss";


const INTERVAL = 5;
const FRACTION = 3;
let addressList = new Set();

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
  document.getElementById("block-tip").innerText = data.block.index.toLocaleString();
};

const addAddress = async (address) => {
  const template = document.getElementById("address-template");
  let item = template.content.querySelector("div.accordion");
  const addrText = document.createTextNode(address);
  const node = document.importNode(item, true);
  node.id = address;
  node.querySelector(".remove-address").dataset.address = address;
  node.querySelector(".title").appendChild(addrText);
  document.getElementById("address-list").appendChild(node);
};

const updateAddress = async (address) => {
  const addressResp = await sendMessage({
    cmd: "updateAddress",
    data: address
  });
  console.log(addressResp);
  if (addressResp.ok) {
    const data = JSON.parse(addressResp.data);
    console.log(data);
    const node = document.getElementById(data.agent.address);
    console.log(data.gold, data.crystal);
    node.querySelector(".ncg>.content>.header").innerHTML = data.agent.gold;
    node.querySelector(".crystal>.content>.header").innerHTML = data.agent.crystal.split(".")[0];
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
    $("#address-list .ui.accordion").accordion();
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
            document.getElementById(address).remove();
            addressList.delete(address);
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
