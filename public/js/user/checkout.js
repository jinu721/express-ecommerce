let selectedAddressId = null;

async function fetchAddress() {
  try {
    const response = await fetch("/account/address");
    const data = await response.json();
    console.log(data);

    const addressContainer = document.querySelector(".address-display");
    addressContainer.innerHTML = "";

    data.user.forEach((val) => {
      const addressDiv = document.createElement("div");
      addressDiv.classList.add("address-item1");
      addressDiv.style.position = "relative";
      addressDiv.innerHTML = `
                <input type="radio" name="addressSelect" value="${val._id}" class="address-radio" style="position: absolute; top: 10px; right: 10px; accent-color: black;">
                <div>
                    <p><strong>House Number:</strong> <span class="houseno-value">${val.houseNumber}</span></p>
                    <p><strong>Street:</strong> <span class="street-value">${val.street}</span></p>
                    <p><strong>Landmark:</strong> <span class="landmark-value">${val.landMark}</span></p>
                    <p><strong>City:</strong> <span class="city-value">${val.city}</span></p>
                    <p><strong>District:</strong> <span class="district-value">${val.district}</span></p>
                    <p><strong>State:</strong> <span class="state-value">${val.state}</span></p>
                    <p><strong>Country:</strong> <span class="country-value">${val.country}</span></p>
                    <p><strong>Pin Code:</strong> <span class="pincode-value">${val.pinCode}</span></p>
                    <div>
                        <a data-id="${val._id}" class="editAddress">Edit</a>
                        <a data-id="${val._id}" class="removeAddress">Remove</a>
                    </div>
                </div>
            `;
      addressContainer.appendChild(addressDiv);
    });
    addClickListeners();
  } catch (err) {
    console.log(err);
  }
}

function addClickListeners() {
  const addressItems = document.querySelectorAll(".address-item1");

  addressItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      const radio = item.querySelector(".address-radio");
      radio.checked = true;
      selectedAddressId = radio.value;
      console.log("Selected Address ID:", selectedAddressId);
    });
  });
}

fetchAddress();

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

createAddressText.addEventListener("click", () => {
  addressShow.style.display = "none";
  addressFormCreate.style.display = "block";
});

createButton.addEventListener("click", (e) => {
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
    buttonText.style.display = "none";
    loader.style.display = "flex";
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
          addressShow.style.display = "block";
          addressFormCreate.style.display = "none";
          fetchAddress();
        }
      } catch (err) {
        console.log("Error in updating profile:", err);
      }
    };
    sendReq();
  }
});

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
    addressShow.style.display = "none";
    addressFormEdit.style.display = "block";
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

const paymentSelection = document.querySelectorAll(".paymentSelection");
let selectedPayment = null;

paymentSelection.forEach((elem) => {
  elem.addEventListener("change", () => {
    if (elem.checked) {
      selectedPayment = elem.value;
      console.log(`Selected Payment Method: ${selectedPayment}`);
    }
  });
});

const preSelected = document.querySelector(".paymentSelection:checked");
if (preSelected) {
  selectedPayment = preSelected.value;
  console.log(`Initially Selected Payment Method: ${selectedPayment}`);
}

console.log(selectedPayment);

let isOfferApplied = false;
let code = null;

document.querySelector(".btnPlaceOrder").addEventListener("click", async (e) => {
  console.log(selectedPayment);
  console.log(selectedAddressId);
  const item = e.target.getAttribute("data-item");
  const delivaryChargeELem = document.querySelector('.delivaryCharge');
  let delivaryChargePrice = "0";
  if (delivaryChargeELem) {
    if (delivaryChargeELem.value && delivaryChargeELem.value !== "Free Shipping") {
      delivaryChargePrice = delivaryChargeELem.value;
    } else if (delivaryChargeELem.textContent && delivaryChargeELem.textContent !== "Free Shipping") {
      delivaryChargePrice = delivaryChargeELem.textContent.trim();
    }
  }

  console.log(delivaryChargePrice);
  const parsedItem = JSON.parse(item);
  console.log(parsedItem);
  console.log(isOfferApplied, code);


  if (!selectedAddressId) {
    showToast("Please select an address", 'error');
  } else if (!selectedPayment) {
    showToast("Please select a payment option", 'error');
  } else {
    try {
      const response = await fetch("/place-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item,
          selectedAddressId,
          selectedPayment,
          isOfferApplied,
          code,
        }),
      });
      const data = await response.json();
      console.log(data);

      if (!data.val) {
        console.log("Error in response:", data);
        showToast(data.msg || "Something went wrong", 'error');
      } else {
        if (selectedPayment === "razorpay") {
          let paymentSuccess = false;
          let paymentInProgress = false;
          let isPaymentHandled = false;

          const options = {
            key: data.key,
            amount: data.order.amount,
            currency: "INR",
            name: "Male Fashion",
            description: "Order Payment",
            order_id: data.order.id,
            handler: async function (paymentResponse) {
              if (isPaymentHandled) return;
              isPaymentHandled = true;

              try {
                const verifyResponse = await fetch("/verify-payment", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    paymentId: paymentResponse.razorpay_payment_id,
                    orderId: paymentResponse.razorpay_order_id,
                    signature: paymentResponse.razorpay_signature,
                  }),
                });
                const verifyData = await verifyResponse.json();

                if (verifyData.val) {
                  paymentSuccess = true;
                  showToast("Order placed successfully!", 'success');
                  setTimeout(() => {
                    window.location.href = "/success";
                  }, 2000);
                } else {
                  showToast(verifyData.msg || "Payment verification failed", 'error');
                }
              } catch (error) {
                console.error("Verification error:", error);
                showToast("Payment verification failed", 'error');
              }
            },
            prefill: {
              name: data.userName,
              email: data.userEmail,
              contact: data.userContact,
            },
            theme: {
              color: "#3399cc",
            },
          };

          let isPopupOpen = false;

          window.addEventListener("blur", () => {
            if (!paymentSuccess && !isPaymentHandled) {
              isPopupOpen = true;
              paymentInProgress = true;
            }
          });

          window.addEventListener("focus", () => {
            if (isPopupOpen && !paymentSuccess && paymentInProgress && !isPaymentHandled) {
              isPopupOpen = false;
              paymentInProgress = false;
              console.warn("Razorpay popup closed by user");
              showToast("Payment cancelled. You can complete payment from your account section.", 'warning');
              setTimeout(() => {
                window.location.href = '/account';
              }, 3000);
            } else if (paymentSuccess) {
              console.log("Payment was successful!");
            }
          });

          const rzp = new Razorpay(options);

          rzp.on("payment.failed", function (response) {
            if (isPaymentHandled) return;
            isPaymentHandled = true;
            paymentInProgress = false;
            console.error("Payment failed:", response);
            rzp.close();
            showToast("Payment failed. You can retry from your account section.", 'error');
            setTimeout(() => {
              window.location.href = "/account";
            }, 3000);
          });

          rzp.open();
        } else {
          showToast("Order placed successfully!", 'success');
          setTimeout(() => {
            window.location.href = "/success";
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("Something went wrong while placing your order", 'error');
    }
  }
});



document.querySelector(".btncouponAplly").addEventListener("click", async (e) => {
  e.preventDefault();
  const couponInput = document.querySelector(".couponInput");
  const applyCouponBtn = document.querySelector(".btncouponAplly");
  const deleteCouponBtn = document.querySelector(".btncouponDelete");

  if (!couponInput.value.trim()) {
    showToast("Please enter a coupon code.", 'error');
    return;
  }

  // Get current total from the page
  const totalElement = document.querySelector(".order__grand-total");
  const currentTotalText = totalElement.textContent.replace(/[^\d.]/g, '');
  const currentTotal = parseFloat(currentTotalText);

  // Disable input and button during processing
  couponInput.setAttribute("readonly", "true");
  applyCouponBtn.disabled = true;
  applyCouponBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';

  try {
    const response = await fetch("/coupon/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        couponCode: couponInput.value.trim(),
        totalPrice: currentTotal,
      }),
    });

    const data = await response.json();
    console.log("Coupon response:", data);

    if (!data.val) {
      showToast(data.msg, 'error');
      // Re-enable input and button
      couponInput.removeAttribute("readonly");
      applyCouponBtn.disabled = false;
      applyCouponBtn.innerHTML = '<i class="fas fa-tag"></i> Apply';
    } else {
      showToast(data.msg, 'success');

      // Update the order table with discount
      updateOrderTableWithDiscount(data.originalPrice, data.discountedPrice, data.discount);

      // Show delete button
      deleteCouponBtn.style.display = "block";
      applyCouponBtn.style.display = "none";

      // Set global variables
      isOfferApplied = true;
      code = couponInput.value.trim();
    }
  } catch (err) {
    console.error("Coupon application error:", err);
    showToast("Something went wrong. Please try again.", 'error');
    // Re-enable input and button
    couponInput.removeAttribute("readonly");
    applyCouponBtn.disabled = false;
    applyCouponBtn.innerHTML = '<i class="fas fa-tag"></i> Apply';
  }
});

function updateOrderTableWithDiscount(originalPrice, discountedPrice, discount) {
  const orderTable = document.querySelector(".order__table tbody");
  const totalRow = orderTable.querySelector("tr:last-child");

  // Check if discount row already exists
  let discountRow = orderTable.querySelector(".discount-row");
  if (!discountRow) {
    // Create discount row
    discountRow = document.createElement("tr");
    discountRow.className = "discount-row";
    discountRow.innerHTML = `
      <td><span class="order__subtitle" style="color: #28a745;">Coupon Discount</span></td>
      <td colspan="2"><span class="table__price" style="color: #28a745;">-&#8377;<span class="discount-amount">${Number(discount).toFixed(2)}</span></span></td>
    `;

    // Insert before the total row
    orderTable.insertBefore(discountRow, totalRow);
  } else {
    // Update existing discount row
    discountRow.querySelector(".discount-amount").textContent = Number(discount).toFixed(2);
  }

  // Update total
  const totalElement = totalRow.querySelector(".order__grand-total");
  totalElement.innerHTML = `&#8377;${Number(discountedPrice).toFixed(2)}`;
}

document.querySelector(".btncouponDelete").addEventListener("click", async (e) => {
  e.preventDefault();
  const couponInput = document.querySelector(".couponInput");
  const deleteCouponBtn = document.querySelector(".btncouponDelete");
  const applyCouponBtn = document.querySelector(".btncouponAplly");

  try {
    const response = await fetch("/coupon/remove", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        couponCode: couponInput.value,
      }),
    });

    const data = await response.json();
    console.log("Remove coupon response:", data);

    if (data.val) {
      // Remove discount row from table
      const discountRow = document.querySelector(".discount-row");
      if (discountRow) {
        discountRow.remove();
      }

      // Recalculate and update total (you might need to reload or recalculate)
      location.reload(); // Simple solution - reload the page

      showToast("Coupon removed successfully", 'success');

      // Reset form
      couponInput.value = "";
      couponInput.removeAttribute("readonly");
      applyCouponBtn.disabled = false;
      applyCouponBtn.style.display = "block";
      deleteCouponBtn.style.display = "none";

      // Reset global variables
      isOfferApplied = false;
      code = null;
    } else {
      showToast(data.msg, 'error');
    }
  } catch (err) {
    console.error("Remove coupon error:", err);
    showToast("Something went wrong. Please try again.", 'error');
  }
});

// Toast function
function showToast(message, type = 'info') {
  // Create toast element
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
  `;

  // Set background color based on type
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
    warning: '#ffc107'
  };

  toast.style.backgroundColor = colors[type] || colors.info;
  toast.textContent = message;

  // Add to page
  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 100);

  // Hide and remove toast
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
