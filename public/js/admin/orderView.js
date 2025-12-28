
const updateStatusBtn = document.querySelector(".update-status-btn");
const orderStatusDropdown = document.getElementById("order-status");
const statusLog = document.querySelector(".status-log ul");
const orderId = document.querySelector("#orderId").value;
const userId = document.querySelector("#userId").value;
const currentOrderStatus = document.querySelector("#currentOrderStatus").value;
const orderStatusSection = document.querySelector(".status-container");
const processingSt = document.querySelector(".processingSt");
const shippedSt = document.querySelector(".shippedSt");
const deliveredSt = document.querySelector(".deliveredSt");
const cancelledSt = document.querySelector(".cancelledSt");

// console.log(shippedSt);
// console.log(processingSt);
// console.log(deliveredSt);
// console.log(cancelledSt);

// if (currentOrderStatus === "processing") {
//   processingSt.style.display = "none";
//   shippedSt.style.display = "block";
//   deliveredSt.style.display = "block";
//   cancelledSt.style.display = "block";
// } else if (currentOrderStatus === "shipped") {
//   processingSt.style.display = "none";
//   shippedSt.style.display = "none";
//   deliveredSt.style.display = "block";
//   cancelledSt.style.display = "block";
// } else if (currentOrderStatus === "delivered") {
//   orderStatusSection.style.display = "none";
// } else if (currentOrderStatus === "cancelled") {
//   orderStatusSection.style.display = "none";
// }

// console.log(orderStatusSection);
// console.log(currentOrderStatus);

updateStatusBtn.addEventListener("click", async () => {
  const newStatus = orderStatusDropdown.value;
  console.log(orderId);

  try {
    const response = await fetch(`/admin/order/status/${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newStatus }),
    });

    const data = await response.json();
    console.log(data);

    if (data.val) {
      const date = new Date(data.updatedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const statusEntry = document.createElement("li");
      statusEntry.innerHTML = `<strong>${data.status}</strong> - ${date}`;
      statusLog.prepend(statusEntry);
      if (data.status === "shipped") {
        await sendNotification(
            "You order shiped",
            "Your order #123 has been shipped successfully! Thank you for shopping with us. You can track your order in the My Orders section. We hope you enjoy your purchase!",
            "order",
            "success"
          );
        }else if(data.status==='delivered'){
            await sendNotification(
                "You order delivered",
                "Your order #123 has been delivered successfully! Thank you for shopping with us. We hope you enjoy your purchase!",
                "order",
                "success"
            );
        }else if(data.status==='cancelled'){
          await sendNotification(
              "You order canceled",
              "Your order #123 has been canceled by the admin. Thank you for shopping with us. You can contact the admin team for more information.",
              "order",
              "failed"
            );
      }
    } else {
      console.log(data.msg);
    }
  } catch (error) {
    console.error("Error updating status:", error);
    Swal.fire("Error", "An unexpected error occurred", "error");
  }
});




document.querySelector(".btn-requestApproved").addEventListener("click", async () => {
  try {
    const response = await fetch(`/orders/admin/return-request/${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "approved" }),
    });

    const data = await response.json();
    console.log(data)
    if (data.val) {
      Swal.fire({
        title: "Approved",
        text: "The request has been approved successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });
      await sendNotification(
        "Request Approved",
        "Your return request of the order #262 has been approved by the admin.",
        "order",
        "success"
      );
      window.location.href = `/admin/orders/view/${orderId}`;
    } else {
      Swal.fire("Error", data.message || "Something went wrong!", "error");
    }
  } catch (error) {
    console.error("Error approving request:", error);
    Swal.fire("Error", "An unexpected error occurred.", "error");
  }
});

document.querySelector(".btn-requestCancel").addEventListener("click", async () => {
  try {
    const response = await fetch(`/orders/admin/return-request/${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const data = await response.json();
    if (data.val) {
      Swal.fire({
        title: "Cancelled",
        text: "The request has been cancelled.",
        icon: "info",
        confirmButtonText: "OK",
      });
      await sendNotification(
        "Request Cancelled",
        "Your return request has been cancelled by the admin.",
        "order",
        "failed"
      );
      window.location.href = `/admin/orders/view/${orderId}`;
    } else {
      Swal.fire(
        "Error",
        data.msg || "Failed to cancel the request.",
        "error"
      );
    }
  } catch (error) {
    console.error("Error cancelling request:", error);
    Swal.fire("Error", "An unexpected error occurred.", "error");
  }
});

// Consolidated notification function
async function sendNotification(title, message, type, status) {
  try {
    const response = await fetch("/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        message,
        type,
        status,
        userId: document.querySelector("#userId").value,
      }),
    });
    const data = await response.json();
    if (data.val) {
      console.log("Notification sent successfully");
    } else {
      console.log(data.msg);
    }
  } catch (err) {
    console.log(`Sending notification error :- ${err}`);
  }
}




function viewModal(event){
  const returnReason = event.target.getAttribute('data-return-reason');
  const itemId = event.target.getAttribute('data-item-id');
  
  console.log(returnReason)
  console.log(itemId)
  console.log(document.querySelector('.btn-approve-return'))
  console.log(document.querySelector('.btn-cancel-return'))
  
  document.getElementById('return-reason').innerText = `Reason: ${returnReason}`;
  document.querySelector('.btn-cancel-return').setAttribute('data-item-id', itemId);
  document.querySelector('.btn-approve-return').setAttribute('data-item-id', itemId);
  const modal = new bootstrap.Modal(document.getElementById('returnModal'));
  modal.show();
}





// document.querySelectorAll('.btn-notify').forEach((button) => {
//   button.addEventListener('click', () => {
//     const returnReason = button.getAttribute('data-return-reason');
//     const itemId = button.getAttribute('data-item-id');

//     document.getElementById('return-reason').innerText = `Reason: ${returnReason}`;
//     document.querySelector('.btn-cancel-return').setAttribute('data-item-id', itemId);
//     document.querySelector('.btn-approve-return').setAttribute('data-item-id', itemId);
//   });
// });


async function btnIndividualApprove(){
  const itemId = event.target.getAttribute('data-item-id');
  try {
    const response = await fetch(`/order/${orderId}/return/${itemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'approved' }),
    });

    const data = await response.json();
    if (data.val) {
      Swal.fire('Approved', 'The return request has been approved.', 'success');
      await sendNotification(
        'Return Request Approved',
        `Your return request for item #${itemId} in order #${orderId} has been approved.`,
        'order',
        'success'
      );
      // location.reload();
    } else {
      Swal.fire('Error', data.msg || 'Failed to approve request.', 'error');
    }
  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'An unexpected error occurred.', 'error');
  }
}



async function btnIndividualCancel(){
  const itemId = event.target.getAttribute('data-item-id');
  try {
    const response = await fetch(`/order/${orderId}/return/${itemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });
  
    const data = await response.json();
    if (data.val) {
      Swal.fire('Cancelled', 'The return request has been cancelled.', 'info');
      await sendNotification(
        'Return Request Cancelled',
        `Your return request for item #${itemId} in order #${orderId} has been cancelled.`,
        'order',
        'failed'
      );
      // location.reload();
    } else {
      Swal.fire('Error', data.msg || 'Failed to cancel request.', 'error');
    }
  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'An unexpected error occurred.', 'error');
  }
}

