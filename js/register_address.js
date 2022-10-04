import Swal from "sweetalert2";

import {sendMessage} from "./message";

document.getElementById("cancel").addEventListener("click", () => {
  window.close();
});

document.getElementById("register-address").addEventListener("click", async () => {
  const address = document.getElementById("address").value.trim();
  console.log(address);
  if (!address) {
    alert("Not valid address");
  } else if (address.slice(0, 2) !== "0x") {
    alert("Please input address starts with 0x");
  } else if (address.length !== 42) {
    alert("The address length must be 42");
  } else {
    const result = await sendMessage({
      cmd: "setAddress",
      data: address
    });
    Swal.fire({
      icon: "success",
      title: result.message,
      toast: true,
    }).then(() => {
      document.location.href = "status.html";
    });
  }
});
