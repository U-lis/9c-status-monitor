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
  } else {
    const result = await sendMessage({
      cmd: "setAddress",
      data: address
    });
    console.log(result);
    Swal.fire({
      icon: "success",
      title: result.message,
    }).then(() => {
      document.location.href = "status.html";
    });
  }
});
