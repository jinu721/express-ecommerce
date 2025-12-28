// ~~~~~~~~~~~~~~~~~~ update profile section ~~~~~~~~~~~~~~~~~~

console.log("shui");

const profileInfo = document.querySelector(".profile-info");
const updateForm = document.querySelector(".updateform");
const editButton = document.querySelector(".edit-profile");
const updateButton = updateForm.querySelector(".updatebtn");

const usernameField = updateForm.querySelector(".usernameUpdate");
const emailField = updateForm.querySelector(".emailUpdate");
const phoneField = updateForm.querySelector(".phoneUpdate") || null;

const usernameError = document.querySelector(".error-msg-updateUsername");
const emailError = document.querySelector(".error-msg-updateEmail");
const phoneError = document.querySelector(".error-msg-updatePhone");

const usernamePattern = /^[a-zA-Z0-9_]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+[0-9]+$/;
const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
editButton.addEventListener("click", (e) => {
  e.preventDefault();
  profileInfo.style.display = "none";
  updateForm.style.display = "grid";
});

updateButton.addEventListener("click", (e) => {
  e.preventDefault();
  let isValid = true;
  if (!usernamePattern.test(usernameField.value)) {
    usernameError.style.display = "block";
    usernameError.textContent =
      "Username must contain only letters, numbers, and underscores (_).";
    isValid = false;
  } else {
    usernameError.style.display = "none";
  }
  // if (!emailPattern.test(emailField.value)) {
  //   emailError.style.display = "block";
  //   emailError.textContent = "Please enter a valid email address.";
  //   isValid = false;
  // } else {
  //   emailError.style.display = "none";
  // }
  if (phoneField && phoneField.value.trim() !== "") {
    if (!phonePattern.test(phoneField.value)) {
      phoneError.style.display = "block";
      phoneError.textContent =
        "Phone number must start with '+' followed by numbers.";
      isValid = false;
    } else {
      phoneError.style.display = "none";
    }
  } else {
    phoneError.style.display = "none";
  }

  if (isValid) {
    const userInfo = {
      username: usernameField.value,
      // email: emailField.value,
      phone: phoneField.value,
    };

    let sendReq = async () => {
      try {
        const resData = await fetch("/update-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userInfo),
        });

        const parsedData = await resData.json();

        if (!parsedData.val) {
          if (parsedData.type === "username") {
            usernameError.style.display = "block";
            usernameError.textContent = parsedData.msg;
          } else if (parsedData.type === "email") {
            emailError.style.display = "block";
            emailError.textContent = parsedData.msg;
          } else if (parsedData.type === "phone") {
            phoneError.style.display = "block";
            phoneError.textContent = parsedData.msg;
          }
        } else {
          usernameError.style.display = "none";
          // emailError.style.display = "none";
          phoneError.style.display = "none";
          document.querySelector(".displayUsername").textContent =
            parsedData.user.username;
          // document.querySelector(".displayEmail").textContent =
          //   parsedData.user.email;
          document.querySelector(".displayPhone").textContent =
            parsedData.user.phone;
          profileInfo.style.display = "block";
          updateForm.style.display = "none";
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
});

// ~~~~~~~~~~~~~ My address section ~~~~~~~~~~~~~

// create address section

const countryInput = document.querySelector(".countryInp");
const stateInput = document.querySelector(".stateInp");
const districtInput = document.querySelector(".districtInp");
const cityInput = document.querySelector(".cityInp");
const streetInput = document.querySelector(".streetInp");
const landmarkInput = document.querySelector(".landmarkInp");
const housenoInput = document.querySelector(".housenoInp");
const pincodeInput = document.querySelector(".pincodeInp");

const errCountry = document.querySelector(".errCountryAddress");
const errState = document.querySelector(".errStateAddress");
const errDistrict = document.querySelector(".errDistrictAddress");
const errCity = document.querySelector(".errCityAddress");
const errStreet = document.querySelector(".errStreetAddress");
const errLandmark = document.querySelector(".errLandmarkAddress");
const errHouseno = document.querySelector(".errHousenoAddress");
const errPincode = document.querySelector(".errPincodeAddress");

const createButton = document.querySelector(".btnAddAddress");
const buttonText = document.querySelector(".btnAddAddressText");
const loader = document.querySelector(".btnAddAddressLoader");

const addressFormCreate = document.querySelector(".address-form-create");
const addressFormEdit = document.querySelector(".address-form-edit");
const addressShow = document.querySelector(".address");
const createAddressText = document.querySelector(".createAddress");

const textPattern = /^[a-zA-Z\s]+$/;
const pincodePattern = /^[0-9]{6}$/;

const addressDisplaySection = document.querySelector(".addressDisplaySection");
const addressCreateSection = document.querySelector(".address-form-create");
const addressEditSection = document.querySelector(".address-form-edit");

createAddressText.addEventListener("click", () => {
  addressDisplaySection.style.display = "none";
  addressEditSection.style.display = "none";
  addressCreateSection.style.display = "block";
});

createButton.addEventListener("click", (e) => {
  buttonText.style.display = "none";
  loader.style.display = "flex";
  e.preventDefault();
  if (!countryInput.value.match(textPattern)) {
    errCountry.style.display = "flex";
    errState.style.display = "none";
    errDistrict.style.display = "none";
    errCity.style.display = "none";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "none";
    errCountry.textContent = "Please enter a valid country name.";
  } else if (!stateInput.value.match(textPattern)) {
    errCountry.style.display = "none";
    errState.style.display = "flex";
    errDistrict.style.display = "none";
    errCity.style.display = "none";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "none";
    errState.textContent = "Please enter a valid state name.";
  } else if (!districtInput.value.match(textPattern)) {
    errCountry.style.display = "none";
    errState.style.display = "none";
    errDistrict.style.display = "flex";
    errCity.style.display = "none";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "none";
    errDistrict.textContent = "Please enter a valid district name.";
  } else if (!cityInput.value.match(textPattern)) {
    errCountry.style.display = "none";
    errState.style.display = "none";
    errDistrict.style.display = "none";
    errCity.style.display = "flex";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "none";
    errCity.textContent = "Please enter a valid city name.";
  } else if (!streetInput.value.match(textPattern)) {
    errCountry.style.display = "none";
    errState.style.display = "none";
    errDistrict.style.display = "none";
    errCity.style.display = "none";
    errStreet.style.display = "flex";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "none";
    errStreet.textContent = "Please enter a valid street name.";
  } else if (!housenoInput.value) {
    errCountry.style.display = "none";
    errState.style.display = "none";
    errDistrict.style.display = "none";
    errCity.style.display = "none";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "flex";
    errPincode.style.display = "none";
    errHouseno.textContent = "House number cannot be empty.";
  } else if (!pincodeInput.value.match(pincodePattern)) {
    errCountry.style.display = "none";
    errState.style.display = "none";
    errDistrict.style.display = "none";
    errCity.style.display = "none";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "flex";
    errPincode.textContent = "Please enter a valid 6-digit pincode.";
  } else {
    errCountry.style.display = "none";
    errState.style.display = "none";
    errDistrict.style.display = "none";
    errCity.style.display = "none";
    errStreet.style.display = "none";
    errLandmark.style.display = "none";
    errHouseno.style.display = "none";
    errPincode.style.display = "none";
    const addressInfo = {
      country: countryInput.value,
      state: stateInput.value,
      district: districtInput.value,
      city: cityInput.value,
      street: streetInput.value,
      landmark: landmarkInput.value,
      houseno: housenoInput.value,
      pincode: pincodeInput.value,
    };
    let sendReq = async () => {
      try {
        const resData = await fetch("/create-address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(addressInfo),
        });
        const parsedData = await resData.json();
        if (parsedData.val) {
          buttonText.style.display = "none";
          loader.style.display = "flex";
          fetchAddress();
          addressShow.style.display = "block";
          addressFormCreate.style.display = "none";
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
});

// Edit address section

const countryEditInput = document.querySelector(".countryInpEdit");
const stateEditInput = document.querySelector(".stateInpEdit");
const districtEditInput = document.querySelector(".districtInpEdit");
const cityEditInput = document.querySelector(".cityInpEdit");
const streetEditInput = document.querySelector(".streetInpEdit");
const landmarkEditInput = document.querySelector(".landmarkInpEdit");
const housenoEditInput = document.querySelector(".housenoInpEdit");
const pincodeEditInput = document.querySelector(".pincodeInpEdit");
const addressIdEdit = document.querySelector(".addressIdEdit");

const errCountryEdit = document.querySelector(".errCountryAddressEdit");
const errStateEdit = document.querySelector(".errStateAddressEdit");
const errDistrictEdit = document.querySelector(".errDistrictAddressEdit");
const errCityEdit = document.querySelector(".errCityAddressEdit");
const errStreetEdit = document.querySelector(".errStreetAddressEdit");
const errLandmarkEdit = document.querySelector(".errLandmarkAddressEdit");
const errHousenoEdit = document.querySelector(".errHousenoAddressEdit");
const errPincodeEdit = document.querySelector(".errPincodeAddressEdit");

const editButtonText = document.querySelector(".btnEditAddressText");
const editLoader = document.querySelector(".btnEditAddressLoader");

const editAddressButton = document.querySelector(".btnEditAddress");

editAddressButton.addEventListener("click", (e) => {
  e.preventDefault();
  [
    errCountryEdit,
    errStateEdit,
    errDistrictEdit,
    errCityEdit,
    errStreetEdit,
    errLandmarkEdit,
    errHousenoEdit,
    errPincodeEdit,
  ].forEach((error) => (error.style.display = "none"));

  if (!countryEditInput.value.match(textPattern)) {
    errCountryEdit.style.display = "flex";
    errCountryEdit.textContent = "Please enter a valid country name.";
  } else if (!stateEditInput.value.match(textPattern)) {
    errStateEdit.style.display = "flex";
    errStateEdit.textContent = "Please enter a valid state name.";
  } else if (!districtEditInput.value.match(textPattern)) {
    errDistrictEdit.style.display = "flex";
    errDistrictEdit.textContent = "Please enter a valid district name.";
  } else if (!cityEditInput.value.match(textPattern)) {
    errCityEdit.style.display = "flex";
    errCityEdit.textContent = "Please enter a valid city name.";
  } else if (!streetEditInput.value.match(textPattern)) {
    errStreetEdit.style.display = "flex";
    errStreetEdit.textContent = "Please enter a valid street name.";
  } else if (!housenoEditInput.value) {
    errHousenoEdit.style.display = "flex";
    errHousenoEdit.textContent = "House number cannot be empty.";
  } else if (!pincodeEditInput.value.match(pincodePattern)) {
    errPincodeEdit.style.display = "flex";
    errPincodeEdit.textContent = "Please enter a valid 6-digit pincode.";
  } else {
    editButtonText.style.display = "none";
    editLoader.style.display = "block";
    const editedAddressInfo = {
      id: document.querySelector(".addressIdEdit").value,
      country: countryEditInput.value,
      state: stateEditInput.value,
      district: districtEditInput.value,
      city: cityEditInput.value,
      street: streetEditInput.value,
      landmark: landmarkEditInput.value,
      houseno: housenoEditInput.value,
      pincode: pincodeEditInput.value,
    };

    let updateReq = async () => {
      try {
        const res = await fetch("/update-address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedAddressInfo),
        });
        const result = await res.json();
        if (result.val) {
          fetchAddress();
          addressFormEdit.style.display = "none";
          addressShow.style.display = "block";
          editButtonText.style.display = "block";
          editLoader.style.display = "none";
          console.log("Address updated successfully!");
        }
      } catch (error) {
        console.log("Error in updating address:", error);
      }
    };
    updateReq();
  }
});

const tabs = document.querySelectorAll(".account__tab");
const tabsContents = document.querySelectorAll(".tab__content");

tabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    const targetSelector = tab.dataset.target;
    const targetContent = document.querySelector(targetSelector);
    if (!targetContent) {
      if (targetSelector === "#logout") {
        async function fetchData() {
          try {
            const response = await fetch("/logout", { method: "POST" });
            const data = await response.json();
            if (!data.val) {
              showToast(data.msg || 'Logout failed', 'error');
            } else {
              showToast('Logged out successfully', 'success');
              setTimeout(() => {
                window.location.href = "/";
              }, 1000);
            }
          } catch (err) {
            console.log(err);
            showToast('An error occurred during logout', 'error');
          }
        }
        fetchData();
      }
      return;
    }
    tabsContents.forEach((tabsContent) => {
      tabsContent.classList.remove("active-tab");
    });
    tabs.forEach((tab) => {
      tab.classList.remove("active-tab");
    });
    tab.classList.add("active-tab");
    targetContent.classList.add("active-tab");
    switch (targetSelector) {
      case "#orders":
        await fetchOrders();
        break;
      case "#wallet":
        await fetchWallet();
        break;
      case "#address":
        await fetchAddress();
        break;
      case "#change-password":
        await showChangePassword();
        break;
      default:
        console.log("Switching to tab:", targetSelector);
    }
  });
});

let currentPage = 1;
const limit = 10;

async function fetchWallet(page = 1) {
  const balanceSection = document.querySelector(".balanceSection");
  const transactionHistorySection = document.querySelector(".transactionHistorySection");
  balanceSection.innerHTML = "";
  transactionHistorySection.innerHTML = "";

  try {
    const response = await fetch(`account/wallet?page=${page}&limit=${limit}`);
    const data = await response.json();

    if (data.val) {
      balanceSection.innerHTML = `
        <div class="card">
          <div class="balance-header">
            <span>Balance</span>
            <div class="currency-toggle">R/ &#8377;</div>
          </div>
          <div class="balance-amount">&#8377;${data.wallet.balance}</div>
          <div class="transactions">
            <span>↗ +&#8377; ${data.wallet.balance}</span>
            <span>↙ -&#8377; ${0}</span>
          </div>
          <div class="info-section">
            <div class="info-item">
              <span class="label">Wallet ID:</span>
              <span>${data.wallet._id}</span>
            </div>
          </div>
        </div>
      `;

      data.wallet.transactionHistory.forEach((x) => {
        const div = document.createElement("div");
        div.classList.add("transactionItem");
        div.innerHTML = `
          <div class="transaction-item">
            <div class="transaction-info">
              <div class="transaction-icon ${
                x.transactionType === "refund" ? "icon-receive" : "icon-send"
              }">${x.transactionType === "refund" ? "↓" : "↑"}</div>
              <div class="transaction-details">
                <span class="transaction-title">${x.transactionType}</span>
                <span class="transaction-date">${x.transactionDate}</span>
              </div>
            </div>
            <div class="transaction-details" style="text-align: right">
              <span class="transaction-amount amount-received">${
                x.transactionType === "refund" ? "+" : "-"
              }&#8377;${x.transactionAmount}</span>
              <span class="transaction-status status-completed">Completed</span>
            </div>
          </div>
        `;
        transactionHistorySection.append(div);
      });

      document.getElementById("pageNumber").innerText = `Page ${page}`;
      document.getElementById("prevPage").disabled = page === 1;
      document.getElementById("nextPage").disabled = page === data.totalPages;
    }
  } catch (err) {
    console.error(err);
  }
}


async function fetchAddress() {
  try {
    const response = await fetch("/account/address");
    const data = await response.json();
    const addressContainer = document.querySelector(".address-display");
    addressContainer.innerHTML = "";
    data.user.forEach((val) => {
      const addressDiv = document.createElement("div");
      addressDiv.classList.add("address-item");
      addressDiv.innerHTML = `
        <p><strong>House Number:</strong> <span class="houseno-value">${val.houseNumber}</span></p>
        <p><strong>Street:</strong> <span class="street-value">${val.street}</span></p>
        <p><strong>Landmark:</strong> <span class="landmark-value">${val.landMark}</span></p>
        <p><strong>City:</strong> <span class="city-value">${val.city}</span></p>
        <p><strong>District:</strong> <span class="district-value">${val.district}</span></p>
        <p><strong>State:</strong> <span class="state-value">${val.state}</span></p>
        <p><strong>Country:</strong> <span class="country-value">${val.country}</span></p>
        <p><strong>Pin Code:</strong> <span class="pincode-value">${val.pinCode}</span></p>
           <div>
                    <a data-id="${val._id}"  class="editAddress">Edit</a>
                    <a data-id="${val._id}" class="removeAddress">Remove</a>
                  </div>
        <hr style="margin:10px;">
      `;
      addressContainer.appendChild(addressDiv);
    });
    addressDisplaySection.style.display = "block";
    addressEditSection.style.display = "none";
    addressCreateSection.style.display = "none";
  } catch (err) {
    console.log(err);
  }
}

async function showChangePassword() {
  console.log("Showing change password form...");
}

const addressContainer = document.querySelector(".address-display");

addressContainer.addEventListener("click", (event) => {
  event.preventDefault();

  if (event.target.classList.contains("editAddress")) {
    handleEdit(event);
  }

  if (event.target.classList.contains("removeAddress")) {
    handleRemove(event);
  }
});

async function handleEdit(event) {
  const addressId = event.target.getAttribute("data-id");
  console.log("edit click : - " + addressId);
  const response = await fetch(`/update-address/${addressId}`);
  const addressData = await response.json();
  if (addressData.val) {
    addressData.address.address.forEach((a) => {
      console.log(a);
      if (addressId === a._id) {
        countryEditInput.value = a.country;
        addressIdEdit.value = a._id;
        stateEditInput.value = a.state;
        districtEditInput.value = a.district;
        cityEditInput.value = a.city;
        streetEditInput.value = a.street;
        landmarkEditInput.value = a.landMark;
        housenoEditInput.value = a.houseNumber;
        pincodeEditInput.value = a.pinCode;
      }
    });
    addressDisplaySection.style.display = "none";
    addressEditSection.style.display = "block";
    addressCreateSection.style.display = "none";
  }
}

async function handleRemove(event) {
  const addressId = event.target.getAttribute("data-id");
  console.log("remove click : - " + addressId);
  const response = await fetch(`/delete-address/${addressId}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (data.val) {
    console.log("Address deleted successfully");
    fetchAddress();
  } else {
    console.error("Failed to delete address");
  }
}

// ~~~~~~~~~~~~~~~~  change password section ~~~~~~~~~~~~~~~~~~~~~

document.querySelector(".btn-saveChangePass").addEventListener("click", (e) => {
  e.preventDefault();
  const currentPasswordInput = document.querySelector(".current-pass");
  const newPasswordInput = document.querySelector(".new-pass");
  const confirmPasswordInput = document.querySelector(".confirm-pass");
  const errCurrentPass = document.querySelector(".err-current-pass");
  const errNewPass = document.querySelector(".err-new-pass");
  const errConfirmPass = document.querySelector(".err-confirm-pass");
  const changePassSaveText = document.querySelector(".btn-saveChangePassText");
  const changePassSaveLoader = document.querySelector(
    ".btn-saveChangePassLoader"
  );
  [errCurrentPass, errNewPass, errConfirmPass].forEach((error) => {
    error.style.display = "none";
    error.textContent = "";
  });
  let isValid = true;
  if (!currentPasswordInput.value) {
    errCurrentPass.style.display = "flex";
    errCurrentPass.textContent = "Current Password cannot be empty.";
    isValid = false;
  } else if (!passwordPattern.test(newPasswordInput.value)) {
    errNewPass.style.display = "flex";
    errNewPass.textContent =
      "New Password must be at least 8 characters long, with uppercase, lowercase, a number, and a special character.";
    isValid = false;
  } else if (confirmPasswordInput.value.length === 0) {
    errConfirmPass.style.display = "flex";
    errConfirmPass.textContent = "Confirm Password cannot be empty.";
    isValid = false;
  } else if (confirmPasswordInput.value !== newPasswordInput.value) {
    errConfirmPass.style.display = "flex";
    errConfirmPass.textContent = "Passwords do not match.";
    isValid = false;
  }

  if (isValid) {
    changePassSaveText.style.display = "flex";
    changePassSaveLoader.style.display = "none";
    errCurrentPass.style.display = "none";
    errNewPass.style.display = "none";
    errConfirmPass.style.display = "none";
    let changePassRequest = async () => {
      try {
        const response = await fetch("/change-password", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPass: currentPasswordInput.value,
            newPass: newPasswordInput.value,
          }),
        });
        const data = await response.json();
        if (!data.val) {
          changePassSaveText.style.display = "flex";
          changePassSaveLoader.style.display = "none";
          errCurrentPass.style.display = "flex";
          errCurrentPass.textContent = data.msg;
        } else {
          errCurrentPass.style.display = "none";
          changePassSaveText.style.display = "flex";
          changePassSaveLoader.style.display = "none";
          changePassSaveText.textContent = "Password Changed";
          setTimeout(() => {
            changePassSaveText.textContent = "Save Changes";
          }, 3000);
          currentPasswordInput.value = "";
          newPasswordInput.value = "";
          confirmPasswordInput.value = "";
          console.log("Pass changed");
        }
      } catch (err) {
        console.log("Error fetching:-" + err);
      }
    };
    changePassRequest();
  }
});


async function fetchOrders(page = 1) {
  document.querySelector(".ordersInfo").style.display = "block";
  document.querySelector(".detailsOfOrders").style.display = "none";
  document.querySelector(".orderedAddrressInfo").style.display = "none";
  document.querySelector(".pagination").style.display = "flex";

  try {
    const response = await fetch(`/account/orders?page=${page}&limit=4`);
    const data = await response.json();

    const orderContainer = document.querySelector(".ordersParant");
    orderContainer.innerHTML = "";

    if (!data.orders || data.orders.length === 0) {
      const orderNullTr = document.createElement("tr");
      orderNullTr.classList.add("order-null-item");
      orderNullTr.innerHTML = `<td colspan="7">No orders yet!</td>`;
      orderContainer.appendChild(orderNullTr);
    } else {
      data.orders.forEach((order, index) => {
        const orderDate = new Date(order.orderedAt);
        const formattedDate = orderDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const orderRow = document.createElement("tr");
        orderRow.classList.add("order-item");
        orderRow.innerHTML = `
          <td>#${order.orderId}</td> 
          <td>${formattedDate}</td>
          <td>${order.orderStatus.replace('_', ' ').toUpperCase()}</td>
          <td>
            ${order.paymentStatus}
            ${
              order.paymentStatus === "pending" &&
              order.paymentMethod &&
              order.paymentMethod.trim().toLowerCase() === "razorpay"
                ? `<a class="btnRetryPayment" data-id="${order._id}"><i class="fa fa-sync-alt"></i></a>`
                : ""
            }
          </td>
          <td>&#8377;${order.totalAmount}</td>
          <td>
            <a onclick="viewOrderedProduct(event)" class="view__order btnViewOrder" data-id="${
              order._id
            }">View</a>
          </td>
          <td>
            <a class="view__order btnCancelOrder" data-id="${order._id}">
      ${
        order.orderStatus === "delivered"
          ? "Request Return"
          : order.orderStatus === "returned"
          ? "Order Returned"
          : order.orderStatus === "cancelled"
          ? "Order Canceled"
          : "Cancel Order"
      }
            </a>
          </td>
          <td>
            <a href="/track-order/${order._id}" class="view__order" style="color: #007bff;">
               <i class="fas fa-truck"></i> Track Order
            </a>
            <br>
            <a onclick="downloadInvoice(event)" class="view__order btnDownloadInvoice" data-id="${
              order._id
            }" style="font-size: 0.9rem; color: #6c757d;">
               <i class="fas fa-download"></i> Invoice
            </a>
          </td>
        `;

        orderContainer.append(orderRow);
        orderRow
          .querySelector(".btnCancelOrder")
          .addEventListener("click", (event) => {
            if (order.orderStatus === "delivered") {
              requestReturn(event);
            } else if (order.orderStatus === "returned") {
              showToast('This order has already been returned', 'info');
            } else if (order.orderStatus === "cancelled") {
              showToast('This order has already been cancelled', 'info');
            } else {
              cancelOrders(event);
            }
          });

        if (order.paymentStatus === "pending") {
          const retryBtn = orderRow.querySelector(".btnRetryPayment");
          if (retryBtn) {
            retryBtn.addEventListener("click", (event) => {
              retryPayment(event);
            });
          }
        }
      });

      renderPagination(data.currentPage, data.totalPages);
    }
  } catch (err) {
    console.error("Error fetching orders:", err);
  }
}

function renderPagination(currentPage, totalPages) {
  const paginationContainer = document.querySelector(".pagination");
  paginationContainer.innerHTML = "";

  if (currentPage > 1) {
    const prevButton = document.createElement("button");
    prevButton.classList.add("pagination-btn");
    prevButton.innerText = "<";
    prevButton.addEventListener("click", () => fetchOrders(currentPage - 1));
    paginationContainer.appendChild(prevButton);
  }

  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.classList.add("pagination-btn");
    pageButton.innerText = i;
    if (i === currentPage) pageButton.classList.add("active");
    pageButton.addEventListener("click", () => fetchOrders(i));
    paginationContainer.appendChild(pageButton);
  }
  if (currentPage < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.classList.add("pagination-btn");
    nextButton.innerText = ">";
    nextButton.addEventListener("click", () => fetchOrders(currentPage + 1));
    paginationContainer.appendChild(nextButton);
  }
}

function cancelOrders(e) {
  e.target.addEventListener("click", (e) => {
    // Create Bootstrap modal for confirmation
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal fade';
    confirmModal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cancel Order</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to cancel this order? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No, Keep Order</button>
            <button type="button" class="btn btn-danger" id="confirmCancel">Yes, Cancel Order</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    const modal = new bootstrap.Modal(confirmModal);
    modal.show();
    
    confirmModal.querySelector('#confirmCancel').addEventListener('click', async () => {
      const orderId = e.target.getAttribute("data-id");
      try {
        const response = await fetch(`/cancel-order/${orderId}`, {
          method: "DELETE",
        });
        const data = await response.json();
        if (data.val) {
          showToast('Order cancelled successfully', 'success');
          fetchOrders();
        } else {
          showToast(data.msg || 'Failed to cancel order', 'error');
        }
      } catch (err) {
        console.log(err);
        showToast('An error occurred while cancelling the order', 'error');
      }
      modal.hide();
      document.body.removeChild(confirmModal);
    });
    
    // Clean up modal when hidden
    confirmModal.addEventListener('hidden.bs.modal', () => {
      if (document.body.contains(confirmModal)) {
        document.body.removeChild(confirmModal);
      }
    });
  });
}
function requestReturn(event) {
  const orderId = event.target.getAttribute("data-id");
  
  // Create Bootstrap modal for return request
  const returnModal = document.createElement('div');
  returnModal.className = 'modal fade';
  returnModal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Request Return</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="returnReason" class="form-label">Reason for Return</label>
            <textarea id="returnReason" class="form-control" rows="3" placeholder="Please explain why you want to return this order..."></textarea>
            <div class="invalid-feedback" id="reasonError" style="display: none;">
              Please enter a reason for the return
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="submitReturn">Submit Request</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(returnModal);
  const modal = new bootstrap.Modal(returnModal);
  modal.show();
  
  returnModal.querySelector('#submitReturn').addEventListener('click', async () => {
    const reason = returnModal.querySelector('#returnReason').value.trim();
    const reasonError = returnModal.querySelector('#reasonError');
    const reasonInput = returnModal.querySelector('#returnReason');
    
    if (!reason) {
      reasonInput.classList.add('is-invalid');
      reasonError.style.display = 'block';
      return;
    }
    
    reasonInput.classList.remove('is-invalid');
    reasonError.style.display = 'none';
    
    try {
      const response = await fetch(`/orders/request-return/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reasonMsg: reason,
        }),
      });
      const data = await response.json();
      if (data.val) {
        showToast('Return request submitted successfully', 'success');
        fetchOrders();
      } else {
        showToast(data.msg || 'Failed to submit return request', 'error');
      }
    } catch (err) {
      console.log(err);
      showToast('An error occurred while submitting the request', 'error');
    }
    
    modal.hide();
    document.body.removeChild(returnModal);
  });
  
  // Clean up modal when hidden
  returnModal.addEventListener('hidden.bs.modal', () => {
    if (document.body.contains(returnModal)) {
      document.body.removeChild(returnModal);
    }
  });
}

async function retryPayment(event) {
  const orderId = event.target.getAttribute("data-id");
  
  // Create Bootstrap modal for retry payment confirmation
  const retryModal = document.createElement('div');
  retryModal.className = 'modal fade';
  retryModal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Retry Payment</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>Do you want to retry the payment for this order?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmRetry">Retry Payment</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(retryModal);
  const modal = new bootstrap.Modal(retryModal);
  modal.show();
  
  retryModal.querySelector('#confirmRetry').addEventListener('click', async () => {
    try {
      const response = await fetch(`/retry-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (data.val) {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: "INR",
          order_id: data.orderId,
          handler: async function (paymentResponse) {
            try {
              const verifyResponse = await fetch(`/verify-payment`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  paymentId: paymentResponse.razorpay_payment_id,
                  orderId: paymentResponse.razorpay_order_id,
                  signature: paymentResponse.razorpay_signature,
                  retryOrderId: orderId,
                }),
              });

              const verifyData = await verifyResponse.json();
              if (verifyData.val) {
                showToast('Payment successful and verified', 'success');
                fetchOrders();
              } else {
                showToast(verifyData.msg || 'Payment could not be verified', 'error');
              }
            } catch (err) {
              console.error("Error verifying payment:", err);
              showToast('An error occurred during verification', 'error');
            }
          },
          prefill: {
            name: "User Name",
            email: "user@example.com",
            contact: "1234567890",
          },
          theme: {
            color: "#3399cc",
          },
        };

        const rzp = new Razorpay(options);
        rzp.open();
      } else {
        showToast(data.msg || 'Payment retry failed', 'error');
      }
    } catch (err) {
      console.error("Error retrying payment:", err);
      showToast('Error retrying the payment', 'error');
    }
    
    modal.hide();
    document.body.removeChild(retryModal);
  });
  
  // Clean up modal when hidden
  retryModal.addEventListener('hidden.bs.modal', () => {
    if (document.body.contains(retryModal)) {
      document.body.removeChild(retryModal);
    }
  });
}

async function downloadInvoice(e) {
  const orderId = e.target.getAttribute("data-id");
  
  // Create Bootstrap modal for download confirmation
  const downloadModal = document.createElement('div');
  downloadModal.className = 'modal fade';
  downloadModal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Download Invoice</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p>Do you want to download the invoice for this order?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmDownload">Yes, Download</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(downloadModal);
  const modal = new bootstrap.Modal(downloadModal);
  modal.show();
  
  downloadModal.querySelector('#confirmDownload').addEventListener('click', async () => {
    try {
      window.location.href = `/orders/download/invoice/${orderId}`;
      showToast('Invoice download started', 'success');
    } catch (err) {
      console.log(err);
      showToast('Failed to download invoice', 'error');
    }
    
    modal.hide();
    document.body.removeChild(downloadModal);
  });
  
  // Clean up modal when hidden
  downloadModal.addEventListener('hidden.bs.modal', () => {
    if (document.body.contains(downloadModal)) {
      document.body.removeChild(downloadModal);
    }
  });
}

const btnViewOrder = document.querySelectorAll(".btnViewOrder");

async function viewOrderedProduct(e) {
  document.querySelector(".ordersInfo").style.display = "none";
  document.querySelector(".pagination").style.display = "none";
  document.querySelector(".detailsOfOrders").style.display = "block";
  document.querySelector(".orderedAddrressInfo").style.display = "block";

  const orderId = e.target.getAttribute("data-id");
  try {
    const response = await fetch(`/view-order-details/${orderId}`);
    const data = await response.json();
    if (data.val) {
      const addressContainer = document.querySelector(
        ".orderedAddress-display"
      );
      const productDetailsTbody = document.querySelector(".orderedProductInfo");
      addressContainer.innerHTML = "";

      const addressDiv = document.createElement("div");
      addressDiv.classList.add("address-item");
      addressDiv.innerHTML = `
        <p><strong>House Number:</strong> <span class="houseno-value">${data.shippingAddress.houseNumber}</span></p>
        <p><strong>Street:</strong> <span class="street-value">${data.shippingAddress.street}</span></p>
        <p><strong>Landmark:</strong> <span class="landmark-value">${data.shippingAddress.landMark}</span></p>
        <p><strong>City:</strong> <span class="city-value">${data.shippingAddress.city}</span></p>
        <p><strong>District:</strong> <span class="district-value">${data.shippingAddress.district}</span></p>
        <p><strong>State:</strong> <span class="state-value">${data.shippingAddress.state}</span></p>
        <p><strong>Country:</strong> <span class="country-value">${data.shippingAddress.country}</span></p>
        <p><strong>Pin Code:</strong> <span class="pincode-value">${data.shippingAddress.pinCode}</span></p>
      `;
      addressContainer.appendChild(addressDiv);

      data.items.forEach((x, index) => {
        const orderDetailTr = document.createElement("tr");
        orderDetailTr.classList.add("order-item");
        orderDetailTr.innerHTML = `
          <td>${index + 1}</td>
          <td>${x.product.name}</td>
          <td>${x.product.price}</td>
          <td>${x.quantity}</td>
          <td>&#8377;${x.offerPrice * x.quantity}</td>
          <td><a href="/details/${
            x.product._id
          }" class="view__order">View</a></td>
          <td>
            <a class="view__order btnAction" data-orderId="${orderId}" data-itemId="${
          x._id
        }">
                ${
                  x.itemStatus === "delivered"
                    ? "Request Return"
                    : x.itemStatus === "returned"
                    ? "Order Returned"
                    : x.itemStatus === "cancelled"
                    ? "Order Canceled"
                    : "Cancel Order"
                }
            </a>
          </td>
        `;
        productDetailsTbody.appendChild(orderDetailTr);

        orderDetailTr.querySelector(".btnAction").addEventListener("click", (event) => {
            if (x.itemStatus === "delivered") {
              requestIndividualReturn(event);
            } else if (x.itemStatus === "returned") {
              showToast('This item has already been returned', 'info');
            } else if (x.itemStatus === "cancelled") {
              showToast('This item has already been cancelled', 'info');
            } else {
              cancelIndividualOrders(event);
            }
          });
      });
    }
  } catch (err) {
    console.log(err);
  }
}

async function cancelIndividualOrders(e) {
  e.target.addEventListener("click", (e) => {
    // Create Bootstrap modal for confirmation
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal fade';
    confirmModal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cancel Item</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to cancel this item? This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No, Keep Item</button>
            <button type="button" class="btn btn-danger" id="confirmCancel">Yes, Cancel Item</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    const modal = new bootstrap.Modal(confirmModal);
    modal.show();
    
    confirmModal.querySelector('#confirmCancel').addEventListener('click', async () => {
      const orderId = e.target.getAttribute("data-orderId");
      const itemId = e.target.getAttribute("data-itemId");
      try {
        const response = await fetch(`/item/cancel-order/${orderId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ itemId }),
        });
        const data = await response.json();
        if (data.val) {
          showToast('Item cancelled successfully', 'success');
          fetchOrders();
        } else {
          showToast(data.msg || 'Failed to cancel item', 'error');
        }
      } catch (err) {
        console.log(err);
        showToast('An error occurred while cancelling the item', 'error');
      }
      modal.hide();
      document.body.removeChild(confirmModal);
    });
    
    // Clean up modal when hidden
    confirmModal.addEventListener('hidden.bs.modal', () => {
      if (document.body.contains(confirmModal)) {
        document.body.removeChild(confirmModal);
      }
    });
  });
}
async function requestIndividualReturn(e) {
  // Create Bootstrap modal for individual return request
  const returnModal = document.createElement('div');
  returnModal.className = 'modal fade';
  returnModal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Request Item Return</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="returnReason" class="form-label">Reason for Return</label>
            <textarea id="returnReason" class="form-control" rows="3" placeholder="Please explain why you want to return this item..."></textarea>
            <div class="invalid-feedback" id="reasonError" style="display: none;">
              Please enter a reason for the return
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="submitReturn">Submit Request</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(returnModal);
  const modal = new bootstrap.Modal(returnModal);
  modal.show();
  
  returnModal.querySelector('#submitReturn').addEventListener('click', async () => {
    const reason = returnModal.querySelector('#returnReason').value.trim();
    const reasonError = returnModal.querySelector('#reasonError');
    const reasonInput = returnModal.querySelector('#returnReason');
    
    if (!reason) {
      reasonInput.classList.add('is-invalid');
      reasonError.style.display = 'block';
      return;
    }
    
    reasonInput.classList.remove('is-invalid');
    reasonError.style.display = 'none';
    
    try {
      const orderId = e.target.getAttribute("data-orderId");
      const itemId = e.target.getAttribute("data-itemId");
      const response = await fetch(`/item/return-order/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId, reason }),
      });
      const data = await response.json();
      if (data.val) {
        showToast('Return request submitted successfully', 'success');
        fetchOrders();
      } else {
        showToast(data.msg || 'Failed to submit return request', 'error');
      }
    } catch (err) {
      console.log(err);
      showToast('An error occurred while submitting the request', 'error');
    }
    
    modal.hide();
    document.body.removeChild(returnModal);
  });
  
  // Clean up modal when hidden
  returnModal.addEventListener('hidden.bs.modal', () => {
    if (document.body.contains(returnModal)) {
      document.body.removeChild(returnModal);
    }
  });
}

function toggleEye(inputId, iconElement) {
  const passwordInput = document.getElementById(inputId);
  const isPassword = passwordInput.getAttribute("type") === "password";
  passwordInput.setAttribute("type", isPassword ? "text" : "password");
  iconElement.classList.toggle("fa-eye");
  iconElement.classList.toggle("fa-eye-slash");
}

// Toast function for user notifications
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
