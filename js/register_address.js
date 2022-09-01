import {sendMessage} from "./message";

document.getElementById("register-address").addEventListener("click", async () => {
  const address = document.getElementById("address").value.trim();
  console.log(address)
  if (!address) {
    alert("not valid address");
  } else {
    const result = await sendMessage({
      cmd: "setAddress",
      data: address
    });
    console.log(result);
    alert(result.message);
    document.location.href = "status.html";
  }
});