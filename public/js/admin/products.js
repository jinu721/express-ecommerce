const cropperInstances = [];
const croppedImages = [];
let currentImageIndex = null;

const name = document.getElementById("productName");
const description = document.getElementById("productDescription");
const categorySelect = document.getElementById("productCategory");
const brand = document.getElementById("productBrand");
const ogPrice = document.getElementById("productOgPrice");
const offerPrice = document.getElementById("productOfferPrice");
const tags = document.getElementById("productTags");
const warranty = document.getElementById("productWarranty");
const returnPolicy = document.getElementById("productReturnPolicy");
const cashOnDelivery = document.getElementById("cashOnDelivery");

const nameRegex = /^[a-zA-Z0-9 ]{3,}$/;
const priceRegex = /^\d+(\.\d{1,2})?$/;
const tagsRegex = /^#([a-zA-Z0-9]+(?:\s#[a-zA-Z0-9]+)*)$/;


function previewAndCrop(event, index) {
  const file = event.target.files[0];
  const errorMsg = document.querySelector(`.imageError${index}`);
  const cropPreview = document.getElementById(`cropPreview${index}`);
  const cropPreviewSection = document.getElementById(`cropPreviewSection${index}`);
  if (errorMsg) errorMsg.textContent = "";

  if (!file) {
    return;
  }

  if (!["image/png", "image/jpg", "image/jpeg"].includes(file.type)) {
    errorMsg.textContent = "Only jpg, png, and jpeg formats are allowed.";
    errorMsg.style.display = "block";
    event.target.value = ""; 
    return;
  }

  if (errorMsg) {
    errorMsg.style.display = "none";
  }

  cropPreview.src = URL.createObjectURL(file);
  cropPreviewSection.style.display = "block";

  if (cropperInstances[index]) {
    cropperInstances[index].destroy(); 
  }

  cropperInstances[index] = new Cropper(cropPreview, {
    aspectRatio: 1,
    viewMode: 1,
    autoCropArea: 1,
    scalable: true,
    zoomable: true,
    movable: true,
  });

  currentImageIndex = index;
}

function startCropping(index) {
  const cropper = cropperInstances[index];
  const cropPreviewSection = document.getElementById(`cropPreviewSection${index}`);
  const croppedPreview = document.getElementById(`croppedPreview${index}`);

  if (!cropper) return;
  cropper.getCroppedCanvas().toBlob((blob) => {
    croppedImages[index] = blob;
    const croppedURL = URL.createObjectURL(blob);

    croppedPreview.src = croppedURL;
    croppedPreview.style.display = "block";
    cropPreviewSection.style.display = "none";

    console.log(`Cropped image for index ${index} saved.`);
  });
}

function validateImages() {
  let allImagesValid = true;

  document.querySelectorAll(".productImgInput").forEach((input, index) => {
    const errorMsg = document.getElementById(`imageError${index}`);
    const file = input.files[0];
    if (errorMsg) errorMsg.textContent = "";

    if (!file) {
      if (errorMsg) {
        errorMsg.textContent = `Image ${index + 1} is required.`;
        errorMsg.style.display = "block";
      }
      allImagesValid = false;
    } else if (!["image/png", "image/jpg", "image/jpeg"].includes(file.type)) {
      if (errorMsg) {
        errorMsg.textContent = "Only jpg, png, and jpeg formats are allowed.";
        errorMsg.style.display = "block";
      }
      allImagesValid = false;
    } else {
      if (errorMsg) errorMsg.style.display = "none";
    }
  });

  return allImagesValid;
}


const colorsOption = [];

function addColor() {
  const colorPicker = document.getElementById("colorPicker");
  const selectedColor = colorPicker.value;
  if (!colorsOption.includes(selectedColor)) {
    colorsOption.push(selectedColor);
    const colorCircle = document.createElement("div");
    colorCircle.style.width = "20px";
    colorCircle.style.height = "20px";
    colorCircle.style.backgroundColor = selectedColor;
    colorCircle.style.borderRadius = "50%";
    colorCircle.style.display = "inline-block";
    colorCircle.style.margin = "5px";
    document.getElementById("showColors").appendChild(colorCircle);
  }
  colorPicker.value = "#ffffff";
}

const sizeStock = {};

function validateStockAndMaxQuantity(stockId, maxQuantityId, errorMessageId, inputId) {
  const stockInput = document.getElementById(stockId);
  const maxQuantityInput = document.getElementById(maxQuantityId);
  const errorMessage = document.getElementById(errorMessageId);
  if (!stockInput || !maxQuantityInput || !errorMessage) {
    console.error(
      `Missing element: ${
        !stockInput
          ? stockId
          : !maxQuantityInput
          ? maxQuantityId
          : errorMessageId
      }`
    );
    return false;
  }
  errorMessage.textContent = "";
  if (maxQuantityInput.value <= 0 || isNaN(maxQuantityInput.value)) {
    errorMessage.textContent = "Maximum quantity must be a positive number.";
    return false;
  }
  if (parseInt(maxQuantityInput.value) > parseInt(stockInput.value)) {
    errorMessage.textContent =
      "Maximum quantity cannot exceed the available stock.";
    return false;
  }

  return true;
}

function handleSizeCheckboxChange(size, stockId, maxQuantityId, errorMessageId) {
  const checkbox = document.getElementById(size);
  const stockInputDiv = document.getElementById(stockId);

  if (!checkbox || !stockInputDiv) {
    console.error(`Missing element for size: ${size}`);
    return;
  }

  if (checkbox.checked) {
    stockInputDiv.style.display = "block";
  } else {
    stockInputDiv.style.display = "none"; 
    delete sizeStock[size];
  }
}

function collectStockData() {
  const sizeMap = {
    sizeS: "S",
    sizeM: "M",
    sizeL: "L",
    sizeXL: "XL",
    sizeXXL: "XXL",
    sizeXXXL: "XXXL",
  };

  const allSizes = Object.keys(sizeMap);

  allSizes.forEach((size) => {
    const stockId = "stockInput" + size.slice(4); 
    const maxQuantityId = "maxQuantity" + size.slice(4);
    const errorMessageId = "stock" + size.slice(4) + "Error";
    const inputId = "productStock" + size.slice(4);

    const checkbox = document.getElementById(size);
    if (checkbox && checkbox.checked) {
      const isValid = validateStockAndMaxQuantity(
        stockId,
        maxQuantityId,
        errorMessageId,
        inputId
      );
      if (isValid) {
        const stockValue = document.getElementById(inputId).value;
        const maxQuantityValue = document.getElementById(maxQuantityId).value;
        const sizeAbbreviation = sizeMap[size];
        sizeStock[sizeAbbreviation] = {
          stock: stockValue,
          maxQuantity: maxQuantityValue,
        };
      }
    }
  });
  console.log(sizeStock);
  return sizeStock; 
}

document.querySelectorAll(".checkBoxFOrSizes").forEach((checkbox) => {
  checkbox.addEventListener("change", function () {
    const size = checkbox.id;
    const stockId = "stockInput" + size.slice(4);
    const maxQuantityId = "maxQuantity" + size.slice(4);
    const errorMessageId = "stock" + size.slice(4) + "Error";

    handleSizeCheckboxChange(size, stockId, maxQuantityId, errorMessageId);
  });
});

function validateAndSubmit() {
  const errorMsgs = document.querySelectorAll(".error-message");
  errorMsgs.forEach((error) => (error.textContent = ""));

  if (!nameRegex.test(name.value)) {
    showError(name, "Product name must be at least 3 characters long and alphanumeric.");
    return;
  }

  
  
  if (description.value.length < 5) {
    showError(description, "Description must be at least 5 characters long.");
  } else if (categorySelect.value === "") {
    showError(categorySelect, "Please select a category.");
  } else if (!tagsRegex.test(tags.value)) {
    showError(
      tags,
      "Tags should start with #, have letters or numbers, and be separated by spaces."
    );
  } else if (!priceRegex.test(ogPrice.value)) {
    showError(
      ogPrice,
      "Original Price must be a valid number with up to 2 decimal places."
    );
  } else {
    const stockData = collectStockData();
    const formData = new FormData();
    formData.append("name", name.value);
    formData.append("description", description.value);
    formData.append("category", categorySelect.value);
    formData.append("brand", brand.value);
    formData.append("price", parseFloat(ogPrice.value));
    formData.append("tags", tags.value);
    formData.append("sizes", JSON.stringify(sizeStock));
    formData.append("colors", colorsOption);
    formData.append("cashOnDelivery", cashOnDelivery.checked);
    formData.append(
      "offerPrice",
      offerPrice.value !== "" ? offerPrice.value : null
    );
    formData.append(
      "warranty",
      warranty.value !== "" ? warranty.value : null
    );
    formData.append(
      "returnPolicy",
      returnPolicy.value !== "" ? returnPolicy.value : null
    );


    croppedImages.forEach((croppedImage, index) => {
      if (croppedImage) {
        formData.append(`productImage${index + 1}`, croppedImage);
      }
    });


    (async function addData() {
      try {
        const response = await fetch("/admin/products/add", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        console.log(data.msg);
      } catch (err) {
        console.error("Error ::-", err);
      }
    })();
  }
}

function showError(input, message) {
  const error = document.createElement("p");
  error.className = "error-message";
  error.style.color = "red";
  error.textContent = message;
  input.parentElement.appendChild(error);
}


document.querySelector(".btn-CreateProduct").addEventListener("click", (event) => {
  event.preventDefault(); 
  validateAndSubmit();
});

function toggleOfferPriceInput() {
  const offerPriceDiv = document.getElementById("offerPriceDiv");
  const checkbox = document.getElementById("toggleOfferPrice");
  offerPriceDiv.style.display = checkbox.checked ? "block" : "none";
}

function toggleWarrantyInput() {
  const warrantyDiv = document.getElementById("warrantyDiv");
  warrantyDiv.style.display = warrantyDiv.style.display === "none" ? "block" : "none";
}

function toggleReturnPolicyInput() {
  const returnPolicyDiv = document.getElementById("returnPolicyDiv");
  returnPolicyDiv.style.display = returnPolicyDiv.style.display === "none" ? "block" : "none";
}

function toggleStockInput(size) {
  const stockInputDiv = document.getElementById(`stockInput${size}`);
  const checkbox = document.getElementById(`size${size}`);
  stockInputDiv.style.display = checkbox.checked ? 'block' : 'none';
  if (!checkbox.checked) {
    document.getElementById(`productStock${size}`).value = '';
  }
}



const productNameUpdate = document.querySelector('#productUpdateName');
const image1 = document.querySelector('.image1');
const image2 = document.querySelector('.image2');
const image3 = document.querySelector('.image3');
const image4 = document.querySelector('.image4');
const productDescriptionUpdate = document.querySelector('#productUpdateDescription');
const productCategoryUpdate = document.querySelector('#productUpdateCategory');
const productTagsUpdate = document.querySelector('#productUpdateTags');
const productBrandUpdate = document.querySelector('#productUpdateBrand');
const colorPickerUpdate = document.querySelector('#colorPickerUpdate');
const productOgPriceUpdate = document.querySelector('#productUpdateOgPrice');
const productStockUpdate = document.querySelector('#productUpdateStock');
const cashOnDeliveryUpdate = document.querySelector('#cashOnDeliveryUpdate');
const toggleOfferPriceUpdate = document.querySelector('#toggleOfferPriceUpdate');
const toggleWarrantyUpdate = document.querySelector('#toggleWarrantyUpdate');
const returnPolicyUpdate = document.querySelector('#productUpdateReturnPolicy');

const productImagesUpdate = document.querySelectorAll('.product-update-image');
const sizeOptionsUpdate = document.querySelectorAll('.form-check-input'); 


const btnUnlist = document.querySelectorAll(".btnListAndUnlist");

btnUnlist.forEach((elem) => {
  elem.addEventListener("click", async () => {
    try {
      const productId = elem.getAttribute("data-id");
      const res = await fetch(
        `/admin/products/unlist?id=${productId}&val=${elem.textContent}`
      );
      const data = await res.json();
      console.log(data);
      if (data.val) {
        if (elem.textContent === "Unlist") {
          elem.classList.replace(
            "badge-outline-primary",
            "badge-outline-success"
          );
          elem.textContent = "List";
        } else {
          console.log(elem.textContent);
          elem.classList.replace(
            "badge-outline-success",
            "badge-outline-primary"
          );
          elem.textContent = "Unlist";
        }
      }
    } catch (err) {
      console.log(err);
    }
  });
});




document.querySelector('.resultContainer').addEventListener('click', async (event) => {
  if (event.target.classList.contains('btn-ban')) {
    const elem = event.target; 
    try {
      const userId = elem.getAttribute('data-id');
      const res = await fetch(`/admin/users/ban/?id=${userId}&val=${elem.textContent}`);
      const data = await res.json();
      console.log(data);
      if (data.val) {
        if (elem.textContent === "Ban") {
          elem.classList.replace("badge-outline-danger", "badge-outline-primary");
          elem.textContent = "Unban";
        } else {
          elem.classList.replace("badge-outline-primary", "badge-outline-danger");
          elem.textContent = "Ban";
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
});

let debounceTimer;

function searchDebouncing() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchData();
  }, 300);
}

async function searchData() {
  const query = document.querySelector('.searchProducts').value.trim();
  console.log(query);
  const resultsContainer = document.querySelector('.resultContainer');
  resultsContainer.innerHTML = '';
  try {
    const response = await fetch(`/admin/products/search?key=${query}`);
    const data = await response.json();
    if (data.val) {
      console.log(data);
      data.products.forEach((item,index) => {
        const productHTML = `
                <tr>
                  <td>${index+1}</td>
                  <td>
                    <img src="/${ item.images[0] }" alt="image" />
                  </td>
                  <td>
                    <img src="/${ item.images[1] }" alt="image" />
                  </td>
                  <td>
                    <img src="/${ item.images[2] }" alt="image" />
                  </td>
                  <td>
                    <img src="/${ item.images[3] }" alt="image" />
                  </td>
                  <td> ${ item.name }</td>
                  <td>
                     ${item.category.name}
                  </td>
                  <td>${ item.brand }</td>
                  <td>${ item.price }</td>
                  <td></td>
                  <td>
                    <div
                      data-id="<%= data._id  %>"
                      class="badge btnListAndUnlist ${ item.isDeleted?'badge-outline-success':'badge-outline-primary' }"
                    >
                      ${ item.isDeleted?'List':'Unlist' }
                    </div>
                  </td>
                  <td>
                    <a href="/admin/products/update/${item._id}">
                      <div
                        class="badge btnUpdateProduct badge-outline-warning"
                      >
                        Update
                      </div>
                    </a>
                  </td>
                </tr>
        `;
        resultsContainer.innerHTML += productHTML;
      });
    } else {
      console.log(data.msg);
    }
  } catch (err) {
    console.log(err);
  }
}