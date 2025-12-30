
// Image Handling with proper swapping mechanism
function changeMainImage(clickedImage) {
  const mainImage = document.querySelector("#mainImage");
  const allSmallImages = document.querySelectorAll(".details__small-img");
  
  // Store current sources
  const currentMainSrc = mainImage.src;
  const currentMainAlt = mainImage.alt;
  const clickedSrc = clickedImage.src;
  const clickedAlt = clickedImage.alt;
  
  // If clicking the same image that's already main, do nothing
  if (currentMainSrc === clickedSrc) return;
  
  // Remove active class from all small images
  allSmallImages.forEach(img => img.classList.remove('active'));
  
  // Swap the images with smooth transition
  mainImage.style.opacity = '0.5';
  clickedImage.style.opacity = '0.5';
  
  setTimeout(() => {
    // Swap the sources
    mainImage.src = clickedSrc;
    mainImage.alt = clickedAlt;
    clickedImage.src = currentMainSrc;
    clickedImage.alt = currentMainAlt;
    
    // Restore opacity
    mainImage.style.opacity = '1';
    clickedImage.style.opacity = '1';
    
    // Mark the clicked position as active (now contains the old main image)
    clickedImage.classList.add('active');
  }, 150);
  
  // Ensure all images remain clickable
  allSmallImages.forEach(img => {
    img.style.pointerEvents = 'auto';
    img.style.cursor = 'pointer';
  });
}

function enableZoom(event) {
  const container = event.target.closest('.image-zoom-container');
  const mainImage = document.getElementById("mainImage");
  
  if (!container || !mainImage) return;
  
  container.classList.add('zooming');
  
  const handleMouseMove = (e) => {
    const rect = mainImage.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    mainImage.style.transformOrigin = `${x}% ${y}%`;
  };
  
  container.addEventListener('mousemove', handleMouseMove);
  container._handleMouseMove = handleMouseMove; // Store reference for cleanup
}

function disableZoom() {
  const container = document.querySelector('.image-zoom-container');
  const mainImage = document.getElementById("mainImage");
  
  if (!container || !mainImage) return;
  
  container.classList.remove('zooming');
  mainImage.style.transformOrigin = 'center center';
  
  if (container._handleMouseMove) {
    container.removeEventListener('mousemove', container._handleMouseMove);
    delete container._handleMouseMove;
  }
}

// Initialize image loading and error handling
document.addEventListener('DOMContentLoaded', function() {
  const images = document.querySelectorAll('.details__img, .details__small-img');
  
  images.forEach(img => {
    img.addEventListener('load', function() {
      this.classList.add('loaded');
    });
    
    img.addEventListener('error', function() {
      this.classList.add('error');
      this.alt = 'Image not available';
    });
    
    // If image is already loaded (cached)
    if (img.complete) {
      img.classList.add('loaded');
    }
  });
  
  // Set first small image as active
  const firstSmallImage = document.querySelector('.details__small-img');
  if (firstSmallImage) {
    firstSmallImage.classList.add('active');
  }
});

// ~~~~~~~~~~~~~~~~~~~ Dynamic Variant System ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const productId = document.querySelector("#productIdStore").value;
let variantSelector = null;
let addToCartHandler = null;

// Initialize the dynamic variant selector
document.addEventListener('DOMContentLoaded', function() {
  if (productId) {
    // Initialize variant selector
    variantSelector = new VariantSelector(productId, 'variant-selector');
    addToCartHandler = new AddToCartHandler(variantSelector, productId);
    
    // Listen for variant changes to update UI
    document.addEventListener('variantChanged', (e) => {
      const { variant, attributes } = e.detail;
      updateProductInfo(variant, attributes);
    });
    
    // Check if product has variants, if not enable buttons immediately
    setTimeout(() => {
      const variantContainer = document.getElementById('variant-selector');
      if (!variantContainer || variantContainer.children.length === 0) {
        // No variants - enable buttons for simple products
        const addToCartBtn = document.querySelector(".add-to-cart-btn");
        const buyNowBtn = document.querySelector(".buy-now-btn");
        const stockText = document.querySelector(".stockText");
        
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (buyNowBtn) buyNowBtn.disabled = false;
        if (stockText) {
          stockText.textContent = "In Stock";
          stockText.style.color = 'green';
        }
      }
    }, 1000); // Wait for variant selector to load
  }
});

function updateProductInfo(variant, attributes) {
  const stockText = document.querySelector(".stockText");
  const addToCartBtn = document.querySelector(".add-to-cart-btn");
  const buyNowBtn = document.querySelector(".buy-now-btn");
  const quantityInput = document.querySelector("#quantity");

  if (variant) {
    // Update stock display
    if (variant.isInStock) {
      stockText.textContent = `${variant.availableStock} Items in Stock`;
      stockText.style.color = 'green';
      addToCartBtn.disabled = false;
      buyNowBtn.disabled = false;
      quantityInput.setAttribute('max', variant.availableStock);
      
      if (variant.isLowStock) {
        stockText.textContent += ' (Low Stock!)';
        stockText.style.color = 'orange';
      }
    } else {
      stockText.textContent = "Out of Stock";
      stockText.style.color = 'red';
      addToCartBtn.disabled = true;
      buyNowBtn.disabled = true;
    }

    // Update quantity input max value
    const currentQty = parseInt(quantityInput.value);
    if (currentQty > variant.availableStock) {
      quantityInput.value = Math.max(1, variant.availableStock);
    }
  } else if (Object.keys(attributes).length > 0) {
    // Selection made but no matching variant
    stockText.textContent = "This combination is not available";
    stockText.style.color = 'red';
    addToCartBtn.disabled = true;
    buyNowBtn.disabled = true;
  } else {
    // No selection made
    stockText.textContent = "Select options to see availability";
    stockText.style.color = 'gray';
    addToCartBtn.disabled = true;
    buyNowBtn.disabled = true;
  }
}

// Quantity validation
function validateQuantity(input, maxStock) {
  let value = parseInt(input.value, 10);
  const variant = variantSelector?.getSelectedVariant();
  const currentStock = variant ? variant.availableStock : maxStock;
  
  if (value < 1) {
    input.value = 1;
  } else if (value > currentStock) {
    input.value = currentStock;
    Toast.info("Quantity Limit", `Only ${currentStock} items available in stock`);
  } else if (isNaN(value)) {
    input.value = 1;
  }
}

// Update quantity input listener
document.addEventListener('DOMContentLoaded', function() {
  const quantityInput = document.querySelector("#quantity");
  if (quantityInput) {
    quantityInput.addEventListener('input', function() {
      validateQuantity(this, 999);
    });
  }
});

// ~~~~~~~~~~~~~~~~~~~ Wishlist Toggle ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const wishlistButton = document.getElementById("wishlistButton");
if (wishlistButton) {
  const wishlistIcon = wishlistButton.querySelector(".wishlistIcon");
  
  // Set initial state based on server data
  const isInitiallyInWishlist = wishlistButton.classList.contains('wishlist-active');
  if (isInitiallyInWishlist) {
    wishlistIcon.classList.add('filled');
  }
  
  wishlistButton.addEventListener("click", async (e) => {
    e.preventDefault();
    
    // Prevent multiple clicks
    if (wishlistButton.classList.contains('loading')) return;
    
    const isCurrentlyActive = wishlistButton.classList.contains('wishlist-active');
    
    // Add loading state
    wishlistButton.classList.add('loading');
    
    if (isCurrentlyActive) {
      // Remove from wishlist
      const wishlistItemId = wishlistButton.getAttribute("data-wishlist-item-id");
      await removeFromWishlist(wishlistItemId);
    } else {
      // Add to wishlist - no variant selection required
      await addToWishlist(productId, null, {});
    }
    
    // Remove loading state
    wishlistButton.classList.remove('loading');
  });
}

async function addToWishlist(productId, variant, attributes) {
  try {
    const response = await fetch(`/add-to-wislist/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        variantId: variant ? variant._id : null,
        attributes: attributes,
        // Legacy fields for backward compatibility - use empty values if no variant
        size: attributes.SIZE || 'N/A',
        color: attributes.COLOR || 'N/A'
      }),
    });
    const data = await response.json();
    if (data.val) {
      // Animate heart filling
      const wishlistIcon = wishlistButton.querySelector(".wishlistIcon");
      wishlistIcon.classList.add('filled');
      wishlistButton.classList.add('wishlist-active', 'pulse');
      
      if (typeof Toast !== 'undefined') {
        Toast.success('Added to Wishlist', 'Item added to wishlist successfully');
      }
      
      if (wishlistButton) {
        wishlistButton.setAttribute("data-wishlist-item-id", data.wishlistItemId);
      }
      
      // Remove pulse effect after animation
      setTimeout(() => wishlistButton.classList.remove('pulse'), 600);
    } else {
      // Check if it's a login error
      if (response.status === 401 || data.msg.includes('login')) {
        if (typeof Toast !== 'undefined') {
          Toast.error('Login Required', 'Please login to add items to wishlist');
        } else {
          alert('Please login to add items to wishlist');
        }
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        if (typeof Toast !== 'undefined') {
          Toast.error('Failed to Add', data.msg);
        } else {
          alert('Failed to add: ' + data.msg);
        }
      }
    }
  } catch (err) {
    console.log(err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Network Error', 'Please check your connection and try again');
    } else {
      alert('Network Error: Please check your connection and try again');
    }
  }
}

async function removeFromWishlist(wishlistItemId) {
  if (!wishlistItemId) {
    if (typeof Toast !== 'undefined') {
      Toast.error('Error', 'Unable to remove item from wishlist');
    } else {
      alert('Unable to remove item from wishlist');
    }
    return;
  }

  try {
    const response = await fetch(`/remove-from-wishlist/${wishlistItemId}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (data.val) {
      // Animate heart emptying
      const wishlistIcon = wishlistButton.querySelector(".wishlistIcon");
      wishlistIcon.classList.add('emptying');
      wishlistIcon.classList.remove('filled');
      wishlistButton.classList.remove('wishlist-active');
      
      if (typeof Toast !== 'undefined') {
        Toast.success('Removed from Wishlist', 'Item removed from wishlist successfully');
      }
      
      // Remove wishlist item ID
      wishlistButton.removeAttribute("data-wishlist-item-id");
      
      // Remove emptying animation after completion
      setTimeout(() => {
        wishlistIcon.classList.remove('emptying');
      }, 400);
    } else {
      if (typeof Toast !== 'undefined') {
        Toast.error('Failed to Remove', data.msg);
      } else {
        alert('Failed to remove: ' + data.msg);
      }
      // Revert UI changes on failure
      const wishlistIcon = wishlistButton.querySelector(".wishlistIcon");
      wishlistIcon.classList.add('filled');
      wishlistButton.classList.add('wishlist-active');
    }
  } catch (err) {
    console.log(err);
    if (typeof Toast !== 'undefined') {
      Toast.error('Network Error', 'Please check your connection and try again');
    } else {
      alert('Network Error: Please check your connection and try again');
    }
    // Revert UI changes on error
    const wishlistIcon = wishlistButton.querySelector(".wishlistIcon");
    wishlistIcon.classList.add('filled');
    wishlistButton.classList.add('wishlist-active');
  }
}

// ~~~~~~~~~~~~~~~~~~~ Reviews ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

async function fetchReviews() {
  try {
    const response = await fetch(`/product/reviews/${productId}`);
    const data = await response.json();
    const reviewShowSection = document.querySelector(".reviewShowSection");

    if (!data.val) {
      console.log(data.msg);
    } else {
      reviewShowSection.innerHTML = ''; 
      data.reviews.forEach(review => {
        const reviewDate = new Date(review.reviewDate);
        const formattedDate = reviewDate.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        let stars = '';
        for (let i = 1; i <= 5; i++) {
          stars += i <= review.rating ? 
            '<i class="fi fi-rs-star reviewItemActive"></i>' : 
            '<i class="fi fi-rs-star"></i>';
        }

        const deleteIcon = review.user === data.currentUserId
          ? `<i class="fas fa-trash reviewDeleteIcon" data-review-id="${review._id}" title="Delete Review"></i>`
          : '';

        const reviewItem = document.createElement('div');
        reviewItem.innerHTML = `
          <div class="review__single">
            <div class="reviewProfile">
               <img src="/img/icons/image.png" alt="Profile" class="review__img" />
               <h4 class="review__title">${review.username || 'Anonymous'}</h4>
            </div>
            <div class="review__data">
               <div class="review__rating">${stars}</div>
               <p class="review__description">${review.comment || ''}</p>
               <span class="review__date">${formattedDate}</span>
               ${deleteIcon}
            </div>
          </div>
        `;
        reviewShowSection.appendChild(reviewItem);
      });
      
      document.querySelectorAll('.reviewDeleteIcon').forEach(icon => {
        icon.addEventListener('click', async (event) => {
          const reviewId = event.target.getAttribute('data-review-id');
          await deleteReview(reviewId);
        });
      });
    }
  } catch (err) {
    console.log(err);
  }
}

async function deleteReview(reviewId) {
  const confirmed = await Toast.confirm({
    title: 'Delete Review',
    message: 'Are you sure you want to delete this review? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    type: 'error'
  });

  if (confirmed) {
    try {
      const response = await fetch(`/product/review/delete/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.val) {
        Toast.error('Delete Failed', data.msg);
      } else {
        Toast.success('Deleted', 'Your review has been deleted successfully');
        fetchReviews();
      }
    } catch (err) {
      console.log(err);
      Toast.error('Error', 'An error occurred while deleting the review');
    }
  }
}

// Load reviews on page load
fetchReviews();

// Review Form Logic
const form = document.querySelector(".review__form form");
if (form) {
  const submitButtonReview = document.querySelector(".btnSubmitReview");
  const commentInput = document.querySelector(".reviewTextarea");
  const stars = document.querySelectorAll(".rate__product i");
  let selectedRating = 0;

  stars.forEach((star, index) => {
    star.addEventListener("click", () => {
      selectedRating = index + 1;
      stars.forEach((s, i) => {
        s.classList.toggle("active", i < selectedRating);
      });
    });
  });

  submitButtonReview.addEventListener("click", (event) => {
    event.preventDefault();
    const comment = commentInput.value.trim();
    if (!selectedRating || !comment) {
      Toast.warning("Missing Information", "Please provide both a rating and comment");
      return;
    }
    
    // Add review
    (async () => {
      try {
        const response = await fetch(`/product/review/add/${productId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment, rating: selectedRating }),
        });
        const data = await response.json();
        if (data.val) {
          Toast.success("Review Submitted", "Your review has been added successfully");
          fetchReviews();
          form.reset();
          stars.forEach(s => s.classList.remove('active'));
          selectedRating = 0;
        } else {
          Toast.error("Submission Failed", data.msg);
        }
      } catch (err) {
        console.log(err);
        Toast.error("Network Error", "Please check your connection and try again");
      }
    })();
  });
}

// ~~~~~~~~~~~~~~~~~~~ Stock Update Listener ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

window.addEventListener('productStockUpdate', (e) => {
  const data = e.detail;
  const currentVariant = variantSelector?.getSelectedVariant();
  
  // Check if update is for the currently selected variant
  if (currentVariant && data.variantId === currentVariant._id) {
    // Update local stock
    currentVariant.availableStock = data.newStock;
    updateProductInfo(currentVariant, variantSelector.getSelectedAttributes());
    
    Toast.info('Stock Updated', `Stock for this item changed to ${data.newStock} items`);
  }
});