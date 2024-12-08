const cropperInstances = [];
const croppedImages = [];
let croppedImage = null;
let currentImageIndex = null;

function previewAndCrop(event, index) {
  const file = event.target.files[0];
  if (!file) return;

  console.log(event);
  console.log(index);
  const cropPreview = document.getElementById(`cropPreviewUpdate${index}`);
  const cropPreviewSection = document.getElementById(
    `cropPreviewUpdateSection${index}`
  );

  cropPreview.src = URL.createObjectURL(file);
  cropPreviewSection.style.display = "block";
  if (cropperInstances[index]) {
    cropperInstances[index].destroy();
  }
  cropperInstances[index] = new Cropper(cropPreview, {
    aspectRatio: 0,
    viewMode: 1,
    autoCropArea: 1,
    scalable: true,
    zoomable: true,
    movable: true,
  });

  currentImageIndex = index;
}

console.log(croppedImages);

function startCroppingUpdate(index) {
  const cropper = cropperInstances[index];
  if (!cropper) return;
  console.log(index);
  cropper.getCroppedCanvas().toBlob((blob) => {
    croppedImages[index] = blob;
    croppedImage = blob;
    const cropPreviewSection = document.getElementById(
      `cropPreviewUpdateSection${index}`
    );
    cropPreviewSection.style.display = "none";
    console.log("Cropped image stored for upload or further use.");
    changeImage(index);
  });
}

const productId = document.querySelector("#productId").value;

console.log(productId);

async function changeImage(index) {
  try {
    const formData = new FormData();
    formData.append("productImage", croppedImage);
    formData.append("productIndex", index);
    const response = await fetch(`/update-product-image/${productId}`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data.val) {
      window.location.href = `/admin/products/update/${productId}`;
    }
  } catch (err) {
    console.log(err);
  }
}

function addColorUpdate() {
  const colorPicker = document.getElementById("colorPickerUpdate");
  const selectedColor = colorPicker.value;
  const colorOptionsDiv = document.getElementById("colorSection");
  const currentColors = Array.from(
    colorOptionsDiv.getElementsByClassName("color")
  );
  const colorIndex = currentColors.length;
  const newColorDiv = document.createElement("div");
  newColorDiv.id = `color-${colorIndex}`;
  newColorDiv.style = `position: relative; width: 20px; border-radius: 50%; height: 20px; margin: 5px; background-color: ${selectedColor};`;
  const removeButton = document.createElement("span");
  removeButton.textContent = "×";
  removeButton.onclick = function () {
    removeColor(colorIndex);
  };
  removeButton.style =
    "position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; cursor: pointer; font-size: 12px; width: 15px; height: 15px; display: flex; align-items: center; justify-content: center;";
  newColorDiv.appendChild(removeButton);

  colorOptionsDiv.appendChild(newColorDiv);
  sendColorToBackend(selectedColor, colorIndex);
}
async function sendColorToBackend(color, index) {
  console.log(color);
  try {
    const response = await fetch(
      `/add-product-color?productId=${productId}&color=${encodeURIComponent(
        color
      )}`,
      {
        method: "POST",
      }
    );
    const data = await response.json();
    console.log(data);
    if (data.val) {
      console.log("Color added successfully");
    } else {
      console.log("Failed to add color");
    }
  } catch (error) {
    console.error("Error while adding color:", error);
  }
}
function removeColor(index) {
  const colorDiv = document.getElementById(`color-${index}`);
  colorDiv.remove();
  sendRemoveColorRequest(index);
}
async function sendRemoveColorRequest(index) {
  const productId = document.querySelector("#productId").value;
  console.log(index);
  try {
    const response = await fetch(
      `/remove-product-color/${productId}/${index}`,
      {
        method: "POST",
      }
    );
    const result = await response.json();
    if (result.val) {
      console.log("Color removed successfully");
    } else {
      console.log("Failed to remove color");
    }
  } catch (error) {
    console.error("Error while removing color:", error);
  }
}

function toggleStockInput(size) {
  const stockInput = document.getElementById(`stockInput${size}`);
  const isChecked = document.getElementById(`size${size}`).checked;
  stockInput.style.display = isChecked ? "flex" : "none";
}

document
  .getElementById("updateProductBtn")
  .addEventListener("click", (event) => {
    event.preventDefault();
    const errorMessages = document.querySelectorAll(".error-message");
    errorMessages.forEach((msg) => (msg.style.display = "none"));

    const name = document.getElementById("productUpdateName").value;
    const description = document
      .getElementById("productUpdateDescription")
      .value.trim();
    const tags = document.getElementById("productUpdateTags").value.trim();
    const brand = document.getElementById("productUpdateBrand").value;
    const price = document.getElementById("productUpdateOgPrice").value;
    const isOfferChecked = document.getElementById(
      "toggleOfferPriceUpdate"
    ).checked;
    const offerPrice = document.getElementById("productUpdateOfferPrice").value;
    const isWarrantyChecked = document.getElementById(
      "toggleWarrantyUpdate"
    ).checked;
    const warranty = document.getElementById("productUpdateWarranty").value;
    const returnPolicy = document.getElementById(
      "productUpdateReturnPolicy"
    ).value;
    const isCODChecked = document.getElementById(
      "cashOnDeliveryUpdate"
    ).checked;
    const isReturnPolicyChecked = document.getElementById(
      "toggleReturnpolicyUpdate"
    ).checked;
    const category = document.getElementById("productUpdateCategory").value;

    const nameRegex = /^[A-Za-z0-9\s\-'&]+$/;
    const wordCount = description.split(/\s+/).length;
    const tagsRegex = /^(#\w+)(\s#\w+)*$/;
    const brandRegex = /^[A-Za-z0-9\s]+$/;
    const priceRegex = /^[1-9][0-9]*$/;

    let isValid = true;
    let productUpdateInfo = {
      name: null,
      description: null,
      category: null,
      tags: null,
      brand: null,
      price: null,
      cod: null,
      offPrice: null,
      warranty: null,
      returnPolicy: null,
    };
    if (!name || !nameRegex.test(name)) {
      showError(
        "productUpdateName",
        "Invalid name. Only letters, numbers, and special characters like - and & are allowed."
      );
      isValid = false;
    } else if (wordCount < 10) {
      isValid = false;
      showError("descUpdate", "Description must have at least 10 words.");
    } else if (!tags || !tagsRegex.test(tags)) {
      isValid = false;
      showError(
        "tagsUpdate",
        'Tags must start with "#" and be separated by spaces.'
      );
    } else if (category === "Select a category") {
      showError("categoryUpdate", "Please select a category.");
    } else if (!brand || !brandRegex.test(brand)) {
      isValid = false;
      showError(
        "brandUpdate",
        "Brand name can only contain letters, numbers, and spaces."
      );
    } else if (!price || !priceRegex.test(price)) {
      isValid = false;
      showError("ogPriceUpdate", "Price must be a positive number.");
    } else if (
      isOfferChecked &&
      (!offerPrice || !/^[1-9][0-9]*$/.test(offerPrice))
    ) {
      isValid = false;
      showError("offerPriceUpdate", "Offer price must be a positive number.");
    } else if (isWarrantyChecked && !warranty) {
      isValid = false;
      showError("warrantyUpdate", "Warranty information is required.");
    } else if (isReturnPolicyChecked && !returnPolicy) {
      isValid = false;
      showError("returnPolicyUpdate", "Return Policy information is required.");
    } else {
      hideError("productUpdateName");
      hideError("descUpdate");
      hideError("tagsUpdate");
      hideError("brandUpdate");
      hideError("ogPriceUpdate");
      hideError("offerPriceUpdate");
      hideError("warrantyUpdate");
      hideError("categoryUpdate");
    }

    if (isValid) {
      productUpdateInfo.name = name;
      productUpdateInfo.description = description;
      productUpdateInfo.category = category;
      productUpdateInfo.tags = tags;
      productUpdateInfo.brand = brand;
      productUpdateInfo.price = price;
      if (isOfferChecked) {
        productUpdateInfo.offPrice = offerPrice;
      }
      if (isCODChecked) {
        productUpdateInfo.cod = true;
      }
      if (isWarrantyChecked) {
        productUpdateInfo.warranty = warranty;
      }
      if (isReturnPolicyChecked) {
        productUpdateInfo.returnPolicy = returnPolicy;
      }
      console.log(category)
      console.log(productUpdateInfo.category)
      async function updateProductData() {
        try {
          const response = await fetch(`/admin/products/update/${productId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(productUpdateInfo),
          });
          const data = await response.json();
          if (data.val) {
            console.log(data.msg);
            window.location.href = `/admin/products/update/${productId}`;
          } else {
            console.log(data.msg);
          }
        } catch (err) {
          console.log(err);
        }
      }
      updateProductData();
    }
  });

function showError(element, message) {
  const errorElement = document.querySelector(`#${element}Error`);
  errorElement.textContent = message;
  errorElement.style.display = "block";
}

function hideError(element) {
  const errorElement = document.querySelector(`#${element}Error`);
  errorElement.style.display = "none";
}

function toggleOfferPriceInputUpdate() {
  const offerPriceDiv = document.getElementById("offerPriceUpdateDiv");
  const checkbox = document.getElementById("toggleOfferPriceUpdate");
  offerPriceDiv.style.display = checkbox.checked ? "block" : "none";
}

function toggleWarrantyInputUpdate() {
  const warrantyDiv = document.getElementById("warrantyUpdateDiv");
  warrantyDiv.style.display =
    warrantyDiv.style.display === "none" ? "block" : "none";
}

function toggleReturnPolicyInputUpdate() {
  const returnPolicyDiv = document.getElementById("returnPolicyUpdateDiv");
  returnPolicyDiv.style.display =
    returnPolicyDiv.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const sizes = ["S", "M", "L", "XL", "XXL", "XXXL"];
  
  sizes.forEach((size) => {
    const addButton = document.querySelector(`#stockInput${size} button`);
    const stockInput = document.querySelector(`#productStock${size}`);
    const errorMessage = document.querySelector(`#stock${size}Error`);
    
    if (addButton && stockInput) {
      addButton.addEventListener("click", async () => {
        const stockValue = stockInput.value.trim();
        
        if (stockValue.length === 0 || isNaN(stockValue) || Number(stockValue) <= 0) {
          errorMessage.textContent = "Please enter a valid, positive stock number.";
          return;
        } else {
          errorMessage.textContent = "";
        }

        const data = {
          size: size,
          stock: parseInt(stockValue),
        };

        try {
          const response = await fetch(`/admin/products/update-stock/${productId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          const responseData = await response.json();
          if (!responseData.val) {
            Swal.fire({
              icon: "error",
              title: "Oops...",
              text: responseData.msg || "Something went wrong.",
            });
          } else {
            Swal.fire({
              icon: "success",
              title: "Success",
              text: responseData.msg || "Stock updated successfully!",
            }).then(() => {
              window.location.href = `/admin/products/update/${productId}`;
            });
          }
        } catch (error) {
          errorMessage.textContent =
            "Failed to update stock. Please check your connection or try again later.";
          console.error("Fetch error:", error);
        }
      });
    }
  });
});

