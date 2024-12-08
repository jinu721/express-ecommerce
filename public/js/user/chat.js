
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const chatHistory = document.getElementById("chatHistory");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

openModalBtn.onclick = function () {
  document.getElementById("myModal").style.display = "flex";
};

closeModalBtn.onclick = function () {
  document.getElementById("myModal").style.display = "none";
};
