
// Global State
let imageSelector;
let editImageSelector;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing products.js...");
  
  // Check if we're on the products management page
  const productModal = document.getElementById('productUploadModal');
  const editModal = document.getElementById('productUpdateModal');
  
  if (!productModal || !editModal) {
    console.log("Product modals not found, skipping initialization");
    return;
  }
  
  console.log("Product modals found, proceeding with initialization...");
  
  // Initialize image selectors
  console.log("Initializing image selectors...");
  
  try {
    imageSelector = new ImageSelector('imageSelector', {
      maxImages: 4,
      minImages: 1,
      allowCrop: true,
      aspectRatio: 1
    });
    console.log("Main image selector initialized successfully");
  } catch (error) {
    console.error("Error initializing main image selector:", error);
  }

  try {
    editImageSelector = new ImageSelector('editImageSelector', {
      maxImages: 4,
      minImages: 1,
      allowCrop: true,
      aspectRatio: 1
    });
    console.log("Edit image selector initialized successfully");
  } catch (error) {
    console.error("Error initializing edit image selector:", error);
  }
  
  console.log("Image selectors initialized:", {
    imageSelector: !!imageSelector,
    editImageSelector: !!editImageSelector
  });
  
  // Make them globally available for debugging
  window.imageSelector = imageSelector;
  window.editImageSelector = editImageSelector;
  
  console.log("Products.js initialization completed");
});

// Add Product Form Elements
const name = document.getElementById("productName");
const description = document.getElementById("productDescription");
const ogPrice = document.getElementById("productOgPrice");
const tags = document.getElementById("productTags");
const warranty = document.getElementById("productWarranty");
const returnPolicy = document.getElementById("productReturnPolicy");
const cashOnDelivery = document.getElementById("cashOnDelivery");

// ~~~~~~~~~~~~~~~~ Add Product ~~~~~~~~~~~~~~~~

document.querySelector(".btn-CreateProduct").addEventListener("click", (event) => {
  event.preventDefault();

  // Basic Validation
  if (name.value.length < 3) { 
    Toast.error("Validation Error", "Product name must be at least 3 characters long");
    return; 
  }
  if (!document.getElementById('productCategory').value) { 
    Toast.error("Validation Error", "Please select a category");
    return; 
  }
  if (!document.getElementById('productBrand').value) { 
    Toast.error("Validation Error", "Please select a brand");
    return; 
  }
  if (!ogPrice.value) { 
    Toast.error("Validation Error", "Please enter a price");
    return; 
  }

  // Validate images
  if (!imageSelector.validate()) {
    return;
  }

  const formData = new FormData();
  formData.append("name", name.value);
  formData.append("description", description.value);
  formData.append("category", document.getElementById('productCategory').value); 
  formData.append("brand", document.getElementById('productBrand').value);
  formData.append("price", parseFloat(ogPrice.value));
  formData.append("tags", tags.value);
  formData.append("cashOnDelivery", cashOnDelivery.checked);
  
  if(warranty.value) formData.append("warranty", warranty.value);
  if(returnPolicy.value) formData.append("returnPolicy", returnPolicy.value);

  // Add images from image selector
  const imageFormData = imageSelector.getFormData('productImage');
  for (let [key, value] of imageFormData.entries()) {
    formData.append(key, value);
  }

  // Show loading toast
  const loadingToast = Toast.info("Creating Product", "Please wait while we create your product...", { duration: 0 });

  fetch("/admin/products/add", {
      method: "POST",
      body: formData
  })
  .then(res => res.json())
  .then(data => {
      Toast.hide(loadingToast);
      if (data.val) {
          Toast.success("Product Created", data.msg + " You can now manage variants using the 'Variants' button.");
          setTimeout(() => window.location.reload(), 2000);
      } else {
          Toast.error("Creation Failed", data.msg);
      }
  })
  .catch(err => {
      Toast.hide(loadingToast);
      Toast.error("Error", "Failed to create product. Please try again.");
      console.error(err);
  });
});

// ~~~~~~~~~~~~~~~~ Edit Product Modal ~~~~~~~~~~~~~~~~

// Simple image update function for edit modal
let updatedImages = {};
let currentEditingIndex = -1;
let cropperInstance = null;

function updateProductImage(index, input) {
    const file = input.files[0];
    if (!file) return;
    
    console.log(`Updating image ${index + 1}:`, file.name);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        Toast.error('Invalid File', 'Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        Toast.error('File Too Large', 'Please select an image smaller than 5MB');
        return;
    }
    
    currentEditingIndex = index;
    
    // Show cropper modal
    const reader = new FileReader();
    reader.onload = function(e) {
        showCropperModal(e.target.result, file);
    };
    reader.readAsDataURL(file);
}

function showCropperModal(imageSrc, file) {
    // Create cropper modal if it doesn't exist
    let cropperModal = document.getElementById('editCropperModal');
    if (!cropperModal) {
        const modalHTML = `
            <div class="modal fade" id="editCropperModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Crop Image</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="crop-container" style="max-height: 400px; overflow: hidden;">
                                <img id="editCropImage" style="max-width: 100%;">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveCroppedImage()">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        cropperModal = document.getElementById('editCropperModal');
    }
    
    const cropImage = document.getElementById('editCropImage');
    cropImage.src = imageSrc;
    
    // Show modal
    const modal = new bootstrap.Modal(cropperModal);
    modal.show();
    
    // Initialize cropper after modal is shown
    cropperModal.addEventListener('shown.bs.modal', function() {
        if (cropperInstance) {
            cropperInstance.destroy();
        }
        
        cropperInstance = new Cropper(cropImage, {
            aspectRatio: 1,
            viewMode: 2,
            autoCropArea: 0.8,
            responsive: true,
            background: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false
        });
    }, { once: true });
    
    // Clean up cropper when modal is hidden
    cropperModal.addEventListener('hidden.bs.modal', function() {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
    });
}

function saveCroppedImage() {
    if (!cropperInstance || currentEditingIndex === -1) return;
    
    const canvas = cropperInstance.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    canvas.toBlob((blob) => {
        const croppedFile = new File([blob], `cropped-image-${currentEditingIndex + 1}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        // Store the cropped file
        updatedImages[currentEditingIndex] = croppedFile;
        
        // Show preview in the image slot
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageSlots = document.querySelectorAll('.image-slot');
            const imageSlot = imageSlots[currentEditingIndex];
            if (imageSlot) {
                imageSlot.innerHTML = `
                    <img src="${e.target.result}" alt="Product Image ${currentEditingIndex + 1}" style="max-width: 100%; max-height: 100%; object-fit: cover; border-radius: 6px;">
                    <input type="file" accept="image/*" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" onchange="updateProductImage(${currentEditingIndex}, this)">
                `;
            }
        };
        reader.readAsDataURL(croppedFile);
        
        // Hide cropper modal
        const cropperModal = document.getElementById('editCropperModal');
        const modal = bootstrap.Modal.getInstance(cropperModal);
        modal.hide();
        
        Toast.success('Image Cropped', 'Image has been cropped successfully');
        currentEditingIndex = -1;
    }, 'image/jpeg', 0.8);
}

// Make functions global
window.updateProductImage = updateProductImage;
window.saveCroppedImage = saveCroppedImage;

async function openEditModal(productId) {
    try {
        console.log('Opening edit modal for product:', productId);
        const loadingToast = Toast.info("Loading", "Fetching product details...", { duration: 0 });
        
        const response = await fetch(`/admin/products/${productId}/details`);
        const result = await response.json();
        
        Toast.hide(loadingToast);
        
        if (!result.success) {
            Toast.error("Error", "Failed to fetch product details");
            return;
        }

        const { product } = result;
        const p = product;
        
        console.log('Product data loaded:', p);

        // Populate Form
        document.getElementById('updateProductId').value = p._id;
        document.getElementById('updateProductName').value = p.name;
        document.getElementById('updateProductDescription').value = p.description;
        document.getElementById('updateProductPrice').value = p.basePrice || p.price;
        
        // Populate Tags
        if (p.tags && p.tags.length > 0) {
            document.getElementById('updateProductTags').value = '#' + p.tags.join('#');
        } else {
            document.getElementById('updateProductTags').value = '';
        }
        
        // Populate Cash on Delivery
        document.getElementById('updateCashOnDelivery').checked = p.cashOnDelivery || false;
        
        // Populate Warranty
        const warrantyCheckbox = document.getElementById('updateShowWarranty');
        const warrantyInput = document.getElementById('updateProductWarranty');
        const warrantyDiv = document.getElementById('updateWarrantyDiv');
        
        if (p.warranty) {
            warrantyCheckbox.checked = true;
            warrantyInput.value = p.warranty;
            warrantyDiv.style.display = 'block';
        } else {
            warrantyCheckbox.checked = false;
            warrantyInput.value = '';
            warrantyDiv.style.display = 'none';
        }
        
        // Populate Return Policy
        const returnPolicyCheckbox = document.getElementById('updateShowReturnPolicy');
        const returnPolicyInput = document.getElementById('updateProductReturnPolicy');
        const returnPolicyDiv = document.getElementById('updateReturnPolicyDiv');
        
        if (p.returnPolicy) {
            returnPolicyCheckbox.checked = true;
            returnPolicyInput.value = p.returnPolicy;
            returnPolicyDiv.style.display = 'block';
        } else {
            returnPolicyCheckbox.checked = false;
            returnPolicyInput.value = '';
            returnPolicyDiv.style.display = 'none';
        }
        
        // Populate Shipping Configuration
        const shippingCheckbox = document.getElementById('updateHasCustomShipping');
        const shippingInput = document.getElementById('updateShippingPrice');
        const shippingDiv = document.getElementById('updateShippingDiv');
        
        if (p.hasCustomShipping && p.shippingPrice !== undefined) {
            shippingCheckbox.checked = true;
            shippingInput.value = p.shippingPrice;
            shippingDiv.style.display = 'block';
        } else {
            shippingCheckbox.checked = false;
            shippingInput.value = '';
            shippingDiv.style.display = 'none';
        }
        
        // Populate Category
        const catSelect = document.getElementById('updateProductCategory');
        if (typeof p.category === 'object') {
            catSelect.value = p.category._id;
        } else {
            catSelect.value = p.category;
        }

        // Populate Brand
        const brandSelect = document.getElementById('updateProductBrand');
        if (typeof p.brand === 'object') {
            brandSelect.value = p.brand._id;
        } else {
            brandSelect.value = p.brand;
        }

        // Show Modal
        console.log('Showing modal...');
        const modal = new bootstrap.Modal(document.getElementById('productUpdateModal'));
        modal.show();

        // Simple image display after modal is shown
        document.getElementById('productUpdateModal').addEventListener('shown.bs.modal', function() {
            console.log("Edit modal shown, setting up simple image display...");
            
            const imageContainer = document.getElementById('editImageSelector');
            if (!imageContainer) {
                console.error("Image container not found!");
                return;
            }
            
            // Create simple 4-slot image display
            let imageHTML = `
                <div class="simple-image-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 15px 0;">
            `;
            
            for (let i = 0; i < 4; i++) {
                const image = p.images && p.images[i] ? p.images[i] : null;
                const imageUrl = image ? (image.startsWith('/') ? image : `/${image}`) : null;
                
                imageHTML += `
                    <div class="image-slot" style="border: 2px dashed #ddd; border-radius: 8px; height: 150px; display: flex; align-items: center; justify-content: center; position: relative; background: #f9f9f9;">
                        ${imageUrl ? 
                            `<img src="${imageUrl}" alt="Product Image ${i+1}" style="max-width: 100%; max-height: 100%; object-fit: cover; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                             <div style="display: none; color: #999; text-align: center;">
                                <i class="fas fa-image" style="font-size: 24px; margin-bottom: 5px;"></i><br>
                                Image ${i+1}<br>Failed to load
                             </div>` 
                            : 
                            `<div style="color: #999; text-align: center;">
                                <i class="fas fa-image" style="font-size: 24px; margin-bottom: 5px;"></i><br>
                                Image ${i+1}<br>No image
                             </div>`
                        }
                        <input type="file" accept="image/*" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" onchange="updateProductImage(${i}, this)">
                    </div>
                `;
            }
            
            imageHTML += `</div>`;
            imageContainer.innerHTML = imageHTML;
            
            console.log("Simple image display created");
        }, { once: true });

    } catch (error) {
        Toast.error("Error", "Failed to load product details");
        console.error("Error fetching product details:", error);
    }
}

document.querySelector(".btn-UpdateProduct").addEventListener("click", (event) => {
    event.preventDefault();
    
    console.log("Update product button clicked");
    
    const id = document.getElementById('updateProductId').value;
    const nameVal = document.getElementById('updateProductName').value;
    const descVal = document.getElementById('updateProductDescription').value;
    const catVal = document.getElementById('updateProductCategory').value;
    const brandVal = document.getElementById('updateProductBrand').value;
    const priceVal = document.getElementById('updateProductPrice').value;
    const tagsVal = document.getElementById('updateProductTags').value;
    const cashOnDeliveryVal = document.getElementById('updateCashOnDelivery').checked;
    const warrantyVal = document.getElementById('updateShowWarranty').checked ? 
                       document.getElementById('updateProductWarranty').value : '';
    const returnPolicyVal = document.getElementById('updateShowReturnPolicy').checked ? 
                           document.getElementById('updateProductReturnPolicy').value : '';
    
    // Get shipping values
    const hasCustomShipping = document.getElementById('updateHasCustomShipping').checked;
    const shippingPrice = hasCustomShipping ? document.getElementById('updateShippingPrice').value : '';

    console.log("Form values:", {
        id, nameVal, descVal, catVal, brandVal, priceVal, tagsVal, cashOnDeliveryVal, warrantyVal, returnPolicyVal, hasCustomShipping, shippingPrice
    });

    // Basic validation
    if (nameVal.length < 3) {
        Toast.error("Validation Error", "Product name must be at least 3 characters long");
        return;
    }

    // Create FormData to handle both text and file data
    const formData = new FormData();
    formData.append('name', nameVal);
    formData.append('description', descVal);
    formData.append('category', catVal);
    formData.append('brand', brandVal);
    formData.append('price', priceVal);
    formData.append('tags', tagsVal);
    formData.append('cashOnDelivery', cashOnDeliveryVal);
    formData.append('warranty', warrantyVal);
    formData.append('returnPolicy', returnPolicyVal);
    formData.append('hasCustomShipping', hasCustomShipping);
    if (hasCustomShipping && shippingPrice) {
        formData.append('shippingPrice', shippingPrice);
    }

    // Add updated images (only the ones that were changed)
    console.log("Updated images:", updatedImages);
    Object.keys(updatedImages).forEach(index => {
        const imageIndex = parseInt(index) + 1;
        formData.append(`productImage${imageIndex}`, updatedImages[index]);
        console.log(`Added new image ${imageIndex}:`, updatedImages[index].name);
    });

    const loadingToast = Toast.info("Updating", "Saving product changes...", { duration: 0 });
    
    fetch(`/admin/products/update/${id}`, {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        Toast.hide(loadingToast);
        console.log("Update response:", data);
        if (data.val) {
             Toast.success("Updated", data.msg);
             // Clear updated images
             updatedImages = {};
             setTimeout(() => window.location.reload(), 2000);
        } else {
             Toast.error("Update Failed", data.msg);
        }
    })
    .catch(err => {
        Toast.hide(loadingToast);
        Toast.error("Error", "Failed to update product");
        console.error("Update error:", err);
    });
});

// ~~~~~~~~~~~~~~~~ UI Helpers ~~~~~~~~~~~~~~~~

function toggleWarrantyInput() {
  const div = document.getElementById("warrantyDiv");
  div.style.display = div.style.display === "none" ? "block" : "none";
}

function toggleReturnPolicyInput() {
  const div = document.getElementById("returnPolicyDiv");
  div.style.display = div.style.display === "none" ? "block" : "none";
}

function toggleUpdateWarrantyInput() {
  const div = document.getElementById("updateWarrantyDiv");
  div.style.display = div.style.display === "none" ? "block" : "none";
}

function toggleUpdateReturnPolicyInput() {
  const div = document.getElementById("updateReturnPolicyDiv");
  div.style.display = div.style.display === "none" ? "block" : "none";
}

// ~~~~~~~~~~~~~~~~ Search & Utils ~~~~~~~~~~~~~~~~

let debounceTimer;
function searchDebouncing() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchData();
  }, 300);
}

async function searchData() {
  const query = document.querySelector('.searchProducts').value.trim();
  const resultsContainer = document.querySelector('.resultContainer');
  resultsContainer.innerHTML = '';
  try {
    const response = await fetch(`/product/search?key=${query}`);
    const data = await response.json();
    if (data.val) {
      data.results.forEach((item,index) => {
        const productHTML = `
                <tr>
                  <td>${index+1}</td>
                  ${[0,1,2,3].map(i => `
                    <td>
                      ${item.images && item.images[i] ? 
                        `<img src="/${item.images[i]}" class="product-image-thumb"/>` : 
                        `<div class="no-image-thumb"><i class="fas fa-image"></i></div>`
                      }
                    </td>
                  `).join('')}
                  <td>${ item.name }</td>
                  <td>${ item.category || 'N/A' }</td>
                  <td>${ typeof item.brand === 'object' && item.brand ? item.brand.name : (item.brand || 'N/A') }</td>
                  <td>₹${ item.price }</td>
                  <td>
                    <span data-id="${item._id}" class="badge btnListAndUnlist ${ item.isDeleted?'badge-outline-success':'badge-outline-danger' }" style="cursor: pointer;">
                        ${ item.isDeleted?'List':'Unlist' }
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn btn-sm btn-outline-warning" onclick="openEditModal('${item._id}')" title="Edit Product">
                        <i class="fas fa-edit"></i> Edit
                      </button>
                      <a href="/admin/products/${item._id}/variants/manage" class="btn btn-sm btn-outline-info" title="Manage Variants">
                        <i class="fas fa-layer-group"></i> Variants
                      </a>
                      <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${item._id}')" title="Delete Permanently">
                        <i class="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </td>
                </tr>
        `;
        resultsContainer.innerHTML += productHTML;
      });
    } else {
       resultsContainer.innerHTML = `<tr><td colspan="11" class="text-center">No products found</td></tr>`;
    }
  } catch (err) {
    console.log(err);
  }
}

// ~~~~~~~~~~~~~~~~ List/Unlist Products ~~~~~~~~~~~~~~~~

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('btnListAndUnlist')) {
    const productId = e.target.getAttribute('data-id');
    const action = e.target.textContent.trim();
    
    fetch(`/admin/products/unlist?id=${productId}&val=${action}`)
      .then(res => res.json())
      .then(data => {
        if (data.val) {
          // Toggle the button appearance and text
          if (action === 'Unlist') {
            e.target.textContent = 'List';
            e.target.classList.remove('badge-outline-danger');
            e.target.classList.add('badge-outline-success');
            Toast.success("Product Listed", "Product is now visible to customers");
          } else {
            e.target.textContent = 'Unlist';
            e.target.classList.remove('badge-outline-success');
            e.target.classList.add('badge-outline-danger');
            Toast.success("Product Unlisted", "Product is now hidden from customers");
          }
        } else {
          Toast.error("Update Failed", "Failed to update product status");
        }
      })
      .catch(err => {
        console.error(err);
        Toast.error("Error", "Error updating product status");
      });
  }
});

// ~~~~~~~~~~~~~~~~ Permanent Delete Product ~~~~~~~~~~~~~~~~

async function deleteProduct(productId) {
  const confirmed = await Toast.confirm({
    title: 'Permanently Delete Product?',
    message: 'This action cannot be undone. The product will be completely removed from the database.',
    confirmText: 'Yes, Delete',
    cancelText: 'Cancel',
    type: 'error'
  });

  if (confirmed) {
    try {
      const response = await fetch(`/admin/products/delete/${productId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.val) {
        Toast.success('Product Deleted', data.msg);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        Toast.error('Delete Failed', data.msg);
      }
    } catch (error) {
      console.error('Delete error:', error);
      Toast.error('Error', 'Failed to delete product');
    }
  }
}