
const updateStatusBtn = document.querySelector(".update-status-btn");
const orderStatusDropdown = document.getElementById("order-status");
const statusLocationInput = document.getElementById("status-location");
const statusMessageInput = document.getElementById("status-message");
const orderId = document.querySelector("#orderId").value;
const userId = document.querySelector("#userId").value;
const currentOrderStatus = document.querySelector("#currentOrderStatus").value;

// Set current status as selected
orderStatusDropdown.value = currentOrderStatus;

updateStatusBtn.addEventListener("click", async () => {
  const newStatus = orderStatusDropdown.value;
  const location = statusLocationInput.value.trim();
  const message = statusMessageInput.value.trim();
  
  if (!newStatus) {
    showToast('Please select a status', 'error');
    return;
  }

  try {
    const response = await fetch(`/admin/order/status/${orderId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        newStatus, 
        location: location || '',
        message: message || `Order status updated to ${newStatus.replace('_', ' ')}`
      }),
    });

    const data = await response.json();

    if (data.val) {
      showToast('Order status updated successfully', 'success');
      // Clear inputs
      statusLocationInput.value = '';
      statusMessageInput.value = '';
      // Reload page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast(data.msg || 'Failed to update status', 'error');
    }
  } catch (error) {
    console.error("Error updating status:", error);
    showToast('An unexpected error occurred', 'error');
  }
});

// Handle order return request approval/rejection
const btnRequestApproved = document.querySelector(".btn-requestApproved");
const btnRequestCancel = document.querySelector(".btn-requestCancel");

if (btnRequestApproved) {
  btnRequestApproved.addEventListener("click", async () => {
    try {
      const response = await fetch(`/orders/admin/return-request/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      });

      const data = await response.json();
      if (data.val) {
        showToast('Return request approved successfully', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast(data.msg || 'Failed to approve request', 'error');
      }
    } catch (error) {
      console.error("Error approving request:", error);
      showToast('An unexpected error occurred', 'error');
    }
  });
}

if (btnRequestCancel) {
  btnRequestCancel.addEventListener("click", async () => {
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
        showToast('Return request rejected successfully', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showToast(data.msg || 'Failed to reject request', 'error');
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      showToast('An unexpected error occurred', 'error');
    }
  });
}

// Global variables for modal handling
let currentItemId = null;

// Function to view return request modal
function viewReturnRequest(itemId, returnReason) {
  currentItemId = itemId;
  document.getElementById('return-reason').textContent = returnReason;
  const modal = new bootstrap.Modal(document.getElementById('returnModal'));
  modal.show();
}

// Function to handle item return approval/rejection
async function handleItemReturn(action) {
  if (!currentItemId) {
    showToast('No item selected', 'error');
    return;
  }

  const status = action === 'approve' ? 'approved' : 'cancelled';
  
  try {
    const response = await fetch(`/order/${orderId}/return/${currentItemId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (data.val) {
      const message = action === 'approve' ? 'Return request approved successfully' : 'Return request rejected successfully';
      showToast(message, 'success');
      
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('returnModal'));
      modal.hide();
      
      // Reload page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast(data.msg || `Failed to ${action} request`, 'error');
    }
  } catch (error) {
    console.error(`Error ${action}ing request:`, error);
    showToast('An unexpected error occurred', 'error');
  }
}


// Toast function for admin
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    max-width: 300px;
  `;
  
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
    warning: '#ffc107'
  };
  
  toast.style.backgroundColor = colors[type] || colors.info;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 100);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}