
// Global State
let imageSelector;
let editImageSelector;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initializing image selectors...");
  
  // Initialize image selectors
  imageSelector = new ImageSelector('imageSelector', {
    maxImages: 4,
    minImages: 1,
    allowCrop: true,
    aspectRatio: 1
  });

  editImageSelector = new ImageSelector('editImageSelector', {
    maxImages: 4,
    minImages: 1,
    allowCrop: true,
    aspectRatio: 1
  });
  
  console.log("Image selectors initialized:", {
    imageSelector: !!imageSelector,
    editImageSelector: !!editImageSelector
  });
  
  // Make them globally available for debugging
  window.imageSelector = imageSelector;
  window.editImageSelector = editImageSelector;
});

// Add Product Form Elements
const name = document.getElementById("productName");
const description = document.getElementById("productDescription");
const categorySelect = document.getElementById("productCategory");
const brand = document.getElementById("productBrand");
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
  if (!categorySelect.value) { 
    Toast.error("Validation Error", "Please select a category");
    return; 
  }
  if (!brand.value) { 
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
  formData.append("category", categorySelect.value); 
  formData.append("brand", brand.value);
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

async function openEditModal(productId) {
    try {
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

        // Show Modal first
        const modal = new bootstrap.Modal(document.getElementById('productUpdateModal'));
        modal.show();

        // Wait for modal to be fully shown, then load images with simple approach
        document.getElementById('productUpdateModal').addEventListener('shown.bs.modal', function() {
            console.log("Modal shown, loading images with enhanced selector...");
            
            // Simple approach - just show the images directly
            const imageContainer = document.getElementById('editImageSelector');
            if (!imageContainer) {
                console.error("editImageSelector container not found!");
                return;
            }
            
            // Create 4-slot image selector
            let currentImages = ['', '', '', '']; // Initialize 4 empty slots
            
            // Fill existing images
            if (p.images && p.images.length > 0) {
                p.images.forEach((img, index) => {
                    if (index < 4) {
                        const cleanImg = img.replace(/\\/g, '/');
                        currentImages[index] = cleanImg.startsWith('/') ? cleanImg : `/${cleanImg}`;
                    }
                });
            }
            
            function renderImageSelector() {
                const slotsHTML = currentImages.map((imageUrl, index) => {
                    const isEmpty = !imageUrl;
                    const isPrimary = index === 0;
                    
                    return `
                        <div class="image-slot" data-index="${index}" 
                             style="position: relative; aspect-ratio: 1; border: 2px dashed ${isEmpty ? '#d1d5db' : '#10b981'}; 
                                    border-radius: 12px; overflow: hidden; cursor: pointer; background: ${isEmpty ? '#f9fafb' : 'white'};"
                             onclick="selectImageForSlot(${index})">
                            ${isEmpty ? `
                                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280;">
                                    <svg style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                    </svg>
                                    <div style="font-size: 14px; font-weight: 500;">${isPrimary ? 'Primary Image' : `Image ${index + 1}`}</div>
                                    <div style="font-size: 12px; opacity: 0.7;">Click to upload${isPrimary ? ' (Required)' : ''}</div>
                                </div>
                            ` : `
                                <img src="${imageUrl}" alt="Product Image ${index + 1}" 
                                     style="width: 100%; height: 100%; object-fit: cover;"
                                     onload="console.log('Image loaded: ${imageUrl}')"
                                     onerror="console.error('Image failed: ${imageUrl}')">
                                <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">
                                    <button type="button" onclick="event.stopPropagation(); removeImageFromSlot(${index})" 
                                            style="width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(239, 68, 68, 0.9); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-trash" style="font-size: 12px;"></i>
                                    </button>
                                </div>
                                <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                                    ${index + 1}
                                </div>
                                ${isPrimary ? '<div style="position: absolute; top: 8px; left: 8px; background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;">PRIMARY</div>' : ''}
                            `}
                        </div>
                    `;
                }).join('');
                
                imageContainer.innerHTML = `
                    <div class="enhanced-image-selector">
                        <label class="form-label">Product Images (Up to 4 images)</label>
                        <div class="image-slots-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 16px 0;">
                            ${slotsHTML}
                        </div>
                        <input type="file" id="hiddenImageInput" accept="image/*" style="display: none;" onchange="handleImageSelection(event)">
                        <div style="margin-top: 16px;">
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> 
                                Click on any slot to add/replace an image. The first slot is the primary image.
                            </small>
                        </div>
                    </div>
                `;
            }
            
            // Global functions for image handling
            window.selectImageForSlot = function(index) {
                window.currentSlotIndex = index;
                document.getElementById('hiddenImageInput').click();
            };
            
            window.removeImageFromSlot = function(index) {
                currentImages[index] = '';
                renderImageSelector();
                console.log(`Removed image from slot ${index + 1}`);
            };
            
            window.handleImageSelection = function(event) {
                const file = event.target.files[0];
                if (!file) return;
                
                // Validate file
                if (!file.type.startsWith('image/')) {
                    Toast.error('Invalid File', 'Please select an image file');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    Toast.error('File Too Large', 'Please select an image smaller than 5MB');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentImages[window.currentSlotIndex] = e.target.result;
                    renderImageSelector();
                    console.log(`Added image to slot ${window.currentSlotIndex + 1}`);
                    
                    // Store the file for form submission
                    if (!window.selectedFiles) window.selectedFiles = {};
                    window.selectedFiles[window.currentSlotIndex] = file;
                };
                reader.readAsDataURL(file);
                
                // Clear the input
                event.target.value = '';
            };
            
            // Get images for form submission
            window.getSelectedImages = function() {
                const formData = new FormData();
                let hasNewImages = false;
                
                // Add new files
                if (window.selectedFiles) {
                    Object.keys(window.selectedFiles).forEach(index => {
                        formData.append(`productImage${parseInt(index) + 1}`, window.selectedFiles[index]);
                        hasNewImages = true;
                    });
                }
                
                // Add existing images that weren't replaced
                currentImages.forEach((imageUrl, index) => {
                    if (imageUrl && !imageUrl.startsWith('data:') && !(window.selectedFiles && window.selectedFiles[index])) {
                        // This is an existing image that wasn't replaced
                        formData.append(`existingproductImage${index + 1}`, imageUrl);
                    }
                });
                
                return { formData, hasChanges: hasNewImages || currentImages.some((img, i) => !img && p.images && p.images[i]) };
            };
            
            // Initial render
            renderImageSelector();
            console.log("Enhanced image selector created");
        }, { once: true });

    } catch (error) {
        Toast.error("Error", "Failed to load product details");
        console.error("Error fetching product details:", error);
    }
}

document.querySelector(".btn-UpdateProduct").addEventListener("click", (event) => {
    event.preventDefault();
    
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

    // Add images using the enhanced selector
    if (window.getSelectedImages) {
        const imageData = window.getSelectedImages();
        console.log("Image data:", imageData);
        
        // Add all image data to form
        for (let [key, value] of imageData.formData.entries()) {
            formData.append(key, value);
        }
    } else {
        console.log("No image selector found, keeping existing images");
    }

    const loadingToast = Toast.info("Updating", "Saving product changes...", { duration: 0 });
    
    fetch(`/admin/products/update/${id}`, {
        method: "POST",
        body: formData // Send as FormData instead of JSON
    })
    .then(res => res.json())
    .then(data => {
        Toast.hide(loadingToast);
        if (data.val) {
             Toast.success("Updated", data.msg);
             setTimeout(() => window.location.reload(), 2000);
        } else {
             Toast.error("Update Failed", data.msg);
        }
    })
    .catch(err => {
        Toast.hide(loadingToast);
        Toast.error("Error", "Failed to update product");
        console.error(err);
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