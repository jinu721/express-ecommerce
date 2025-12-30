const filterLinks = document.querySelectorAll(".filter-link");
const sortSelect = document.querySelector(".sort-select");

let selectedFilters = {
  sortBy: "Default",
  price: [],
  category: [],
  brand: "", // Add brand filter
  name: "All",
};

// Load brands on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Shop page loaded');
  console.log('Toast available:', typeof Toast !== 'undefined');
  console.log('variantPopup available:', typeof window.variantPopup !== 'undefined');
  
  loadBrands();
  // Initial bind for existing filter links
  bindFilterEvents();
  // Check wishlist status for existing products
  checkWishlistStatus();
  // Bind events for server-rendered products
  bindProductActions();
});

async function checkWishlistStatus() {
  try {
    const response = await fetch('/api/wishlist');
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const wishlistProductIds = data.items
        .filter(item => item.productId && item.productId._id) // Filter out null/undefined
        .map(item => item.productId._id);
      
      // Mark wishlist buttons as active for products in wishlist
      document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const productId = btn.dataset.productId;
        if (wishlistProductIds.includes(productId)) {
          btn.classList.add('wishlist-active');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.add('filled');
          }
        }
      });
    }
  } catch (error) {
    console.log('Could not check wishlist status:', error);
  }
}

async function loadBrands() {
  try {
    console.log('Loading brands...');
    const response = await fetch('/api/brands');
    const data = await response.json();
    
    console.log('Brands response:', data);
    
    const brandFilterList = document.getElementById('brandFilterList');
    if (brandFilterList && data.items && data.items.length > 0) {
      brandFilterList.innerHTML = '';
      data.items.forEach(brand => {
        const brandItem = document.createElement('li');
        brandItem.className = 'p-b-6';
        brandItem.innerHTML = `
          <a href="#" class="filter-link stext-106 trans-04" data-brand="${brand.name}">
            ${brand.name} ${brand.productCount ? `(${brand.productCount})` : ''}
          </a>
        `;
        brandFilterList.appendChild(brandItem);
      });
      
      console.log('Brands loaded successfully:', data.items.length);
      // Re-bind events for new brand links
      bindFilterEvents();
    } else {
      console.log('No brands found or brandFilterList not found');
      if (brandFilterList) {
        brandFilterList.innerHTML = '<li class="p-b-6"><span class="stext-106">No brands available</span></li>';
      }
    }
  } catch (error) {
    console.error('Error loading brands:', error);
    const brandFilterList = document.getElementById('brandFilterList');
    if (brandFilterList) {
      brandFilterList.innerHTML = '<li class="p-b-6"><span class="stext-106">Error loading brands</span></li>';
    }
  }
}

function bindFilterEvents() {
  const allFilterLinks = document.querySelectorAll(".filter-link");
  
  allFilterLinks.forEach((link) => {
    // Remove existing event listeners by cloning
    const newLink = link.cloneNode(true);
    link.parentNode.replaceChild(newLink, link);
  });
  
  // Re-bind events
  document.querySelectorAll(".filter-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const filterValue = link.textContent.trim();
      const filterType = link
        .closest(".filter-col2")
        .querySelector(".mtext-102")
        .textContent.trim()
        .toLowerCase();
      
      const otherLinks = link
        .closest(".filter-col2")
        .querySelectorAll(".filter-link");
      otherLinks.forEach((otherLink) => {
        otherLink.classList.remove("filter-link-active");
      });
      link.classList.add("filter-link-active");
      
      if (filterType === "sort by") {
        selectedFilters.sortBy = filterValue;
      } else if (filterType === "price") {
        selectedFilters.price = filterValue === "All" ? [] : [filterValue];
      } else if (filterType === "category") {
        selectedFilters.category = filterValue === "All" ? [] : [filterValue];
      } else if (filterType === "brand") {
        selectedFilters.brand = (filterValue === "All Brands" || filterValue === "All") ? "" : (link.dataset.brand || "");
      } else if (filterType === "by name") {
        selectedFilters.name = filterValue === "All" ? "All" : filterValue;
      }
      
      console.log('Filter applied:', filterType, filterValue, selectedFilters);
      updateFilters();
    });
  });
}

// Initial bind
bindFilterEvents();

if (sortSelect) {
  sortSelect.addEventListener("change", (event) => {
    selectedFilters.sortBy = event.target.value;
    updateFilters();
  });
}

async function updateFilters() {
  const queryParams = new URLSearchParams(selectedFilters).toString();
  try {
    const response = await fetch(`/shop?${queryParams}&api=true`);
    const data = await response.json();
    displayProducts(data.products);
  } catch (err) {
    console.log(err);
  }
}

function displayProducts(products) {
  const productContainer = document.querySelector(".products__container");
  productContainer.innerHTML = "";

  console.log(products);

  if(products.length===0){
    const productItem = document.createElement("div");
    productItem.classList.add("productnotFound");
    productItem.innerHTML = `
         <div>
            <p>Product not found!</p>
         </div>
      `;
    productContainer.appendChild(productItem);
  }else{
    products.forEach((product) => {
      const productItem = document.createElement("div");
      productItem.classList.add("product__item");
      
      // Determine badge type
      const badgeHtml = product.isFestivalOffer ? 
        `<div class="product__badge festival-badge">
          <i class="fas fa-star"></i> Festival
        </div>` : 
        `<div class="product__badge light-pink">Hot</div>`;
      
      // Handle pricing with NaN protection
      const originalPrice = product.originalPrice || product.basePrice || product.price || 0;
      const finalPrice = product.finalPrice || originalPrice;
      const hasValidOffer = product.hasOffer && finalPrice < originalPrice;
      
      const priceHtml = hasValidOffer
        ? `<span class="new__price">&#8377;${Math.round(finalPrice)}</span>
           <span class="old__price">&#8377;${Math.round(originalPrice)}</span>
           ${product.isPercentageOffer ? `<span class="save__price">${product.discountPercentage}% Off</span>` : ''}`
        : `<span class="new__price">&#8377;${Math.round(originalPrice)}</span>`;
      
      productItem.innerHTML = `
          <div class="product__banner">
            <a href="/details/${product._id}" class="product__images">
              <img src="${product.images[0]}" alt="${product.name}" class="product__img default" />
              <img src="${product.images[1] || product.images[0]}" alt="${product.name}" class="product__img hover" />
            </a>
            <div class="product__actions">
              <a href="#" class="action__btn" aria-label="Quick View">
                <i class="fi fi-rs-eye"></i>
              </a>
              <button type="button" class="action__btn wishlist-btn" aria-label="Add to Wishlist" data-product-id="${product._id}">
                <i class="fi fi-rs-heart"></i>
              </button>
            </div>
            ${badgeHtml}
          </div>
          <div class="product__content">
            <span class="product__category">${product.brand ? product.brand.name : 'No Brand'}</span>
            <h3 class="product__title">${product.name}</h3>
            <div class="product__rating">
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
            </div>
            <div class="product__price flex">
              ${priceHtml}
            </div>
            <button type="button" class="action__btn cart__btn" aria-label="Add To Cart" data-product-id="${product._id}">
              <i class="fi fi-rs-shopping-bag-add"></i>
            </button>
          </div>
        `;
      productContainer.appendChild(productItem);
    });
    
    // Bind wishlist and cart events
    bindProductActions();
    // Check wishlist status for newly loaded products
    checkWishlistStatus();
  }
}

// Bind wishlist and cart button events
function bindProductActions() {
  console.log('Binding product actions...');
  
  // Wishlist buttons
  const wishlistBtns = document.querySelectorAll('.wishlist-btn');
  console.log('Found wishlist buttons:', wishlistBtns.length);
  
  // Debug: Log each button found
  wishlistBtns.forEach((btn, index) => {
    console.log(`Wishlist button ${index}:`, btn, 'Product ID:', btn.dataset.productId);
  });
  
  wishlistBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Wishlist button clicked');
      const productId = btn.dataset.productId;
      const icon = btn.querySelector('i');
      
      // Check if user is logged in first
      try {
        const loginCheckResponse = await fetch('/api/auth/check');
        const loginData = await loginCheckResponse.json();
        
        if (!loginData.loggedIn) {
          if (typeof Toast !== 'undefined') {
            Toast.error('Login Required', 'Please login to add items to wishlist');
          } else {
            alert('Please login to add items to wishlist');
          }
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }
      } catch (error) {
        console.error('Login check failed:', error);
      }
      
      // Check if already in wishlist (toggle functionality)
      const isInWishlist = btn.classList.contains('wishlist-active');
      
      if (isInWishlist) {
        // Remove from wishlist
        const confirmed = await Toast.confirm({
          title: 'Remove from Wishlist',
          message: 'Are you sure you want to remove this item from your wishlist?',
          confirmText: 'Remove',
          cancelText: 'Cancel',
          type: 'warning'
        });
        
        if (!confirmed) return;
        
        try {
          // First get wishlist to find the item ID
          const wishlistResponse = await fetch('/api/wishlist');
          const wishlistData = await wishlistResponse.json();
          console.log('Wishlist data for removal:', wishlistData);
          const wishlistItem = wishlistData.items?.find(item => item.productId._id === productId);
          console.log('Found wishlist item:', wishlistItem, 'for product:', productId);
          
          if (wishlistItem) {
            const response = await fetch(`/remove-from-wishlist/${wishlistItem._id}`, {
              method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.val) {
              icon.classList.add('emptying');
              btn.classList.remove('wishlist-active');
              Toast.success('Removed from Wishlist', 'Item removed from wishlist successfully');
              
              setTimeout(() => icon.classList.remove('emptying'), 400);
            } else {
              Toast.error('Failed to Remove', data.msg);
            }
          } else {
            Toast.error('Item Not Found', 'Could not find item in wishlist');
          }
        } catch (error) {
          console.error('Remove wishlist error:', error);
          Toast.error('Network Error', 'Please check your connection');
        }
      } else {
        // Add to wishlist
        icon.classList.add('filled');
        btn.classList.add('pulse');
        
        try {
          const response = await fetch(`/add-to-wislist/${productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ size: 'N/A', color: 'N/A' })
          });
          
          const data = await response.json();
          if (data.val) {
            Toast.success('Added to Wishlist', 'Item added to wishlist successfully');
            btn.classList.add('wishlist-active');
          } else {
            Toast.error('Failed to Add', data.msg);
            // Revert animation
            icon.classList.remove('filled');
            btn.classList.remove('wishlist-active');
          }
        } catch (error) {
          console.error('Wishlist error:', error);
          Toast.error('Network Error', 'Please check your connection');
          icon.classList.remove('filled');
          btn.classList.remove('wishlist-active');
        }
        
        setTimeout(() => btn.classList.remove('pulse'), 600);
      }
    });
  });
  
  // Cart buttons
  const cartBtns = document.querySelectorAll('.cart__btn');
  console.log('Found cart buttons:', cartBtns.length);
  
  // Debug: Log each cart button found
  cartBtns.forEach((btn, index) => {
    console.log(`Cart button ${index}:`, btn, 'Product ID:', btn.dataset.productId);
  });
  
  cartBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('Cart button clicked');
      const productId = btn.dataset.productId;
      
      // Check if user is logged in first
      try {
        const loginCheckResponse = await fetch('/api/auth/check');
        const loginData = await loginCheckResponse.json();
        
        if (!loginData.loggedIn) {
          if (typeof Toast !== 'undefined') {
            Toast.error('Login Required', 'Please login to add items to cart');
          } else {
            alert('Please login to add items to cart');
          }
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }
      } catch (error) {
        console.error('Login check failed:', error);
      }
      
      // Open variant selection popup
      if (window.variantPopup) {
        console.log('Opening variant popup for product:', productId);
        window.variantPopup.open(productId, {
          onConfirm: async (selection) => {
            console.log('Variant selection confirmed:', selection);
            try {
              const response = await fetch('/add-to-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productId: productId,
                  variantId: selection.variant?._id,
                  quantity: selection.quantity,
                  attributes: selection.attributes
                })
              });
              
              const data = await response.json();
              if (data.val) {
                if (typeof Toast !== 'undefined') {
                  Toast.success('Added to Cart', 'Item added to cart successfully');
                } else {
                  alert('Item added to cart successfully');
                }
              } else {
                if (response.status === 401 || data.msg.includes('login')) {
                  if (typeof Toast !== 'undefined') {
                    Toast.error('Login Required', 'Please login to add items to cart');
                  } else {
                    alert('Please login to add items to cart');
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
            } catch (error) {
              console.error('Add to cart error:', error);
              Toast.error('Network Error', 'Please check your connection');
            }
          }
        });
      } else {
        console.log('Variant popup not available, using fallback');
        // Fallback if variant popup is not available
        try {
          const response = await fetch('/add-to-cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: productId,
              quantity: 1
            })
          });
          
          const data = await response.json();
          if (data.val) {
            Toast.success('Added to Cart', 'Item added to cart successfully');
          } else {
            if (response.status === 401 || data.msg.includes('login')) {
              Toast.error('Login Required', 'Please login to add items to cart');
              setTimeout(() => {
                window.location.href = '/login';
              }, 2000);
            } else {
              Toast.error('Failed to Add', data.msg);
            }
          }
        } catch (error) {
          console.error('Fallback add to cart error:', error);
          Toast.error('Network Error', 'Please check your connection');
        }
      }
    });
  });
}

const loader = document.querySelector(".loaderPlain");

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY + 1000  >= document.body.offsetHeight) {
    loadMoreProducts();
  }
});

let page = 1;
const limit = 10;
let hasMoreProducts = true;

async function loadMoreProducts() {
  loader.style.display = "block";
  page++;
  try {
    const queryParams = new URLSearchParams({
      page: page,
      limit: limit,
      api: true,
      sortBy: selectedFilters.sortBy,
      price: selectedFilters.price.join(","),  
      category: selectedFilters.category.join(","),  
      rating: selectedFilters.rating || "",  
    }).toString();

    const response = await fetch(`/shop?${queryParams}`);
    const data = await response.json();

    if (data.products.length > 0) {
      data.products.forEach((product) => {
        const productContainer = document.querySelector(".products__container");
        const productItem = document.createElement("div");
        productItem.classList.add("product__item");
        
        // Determine badge type
        const badgeHtml = product.isFestivalOffer ? 
          `<div class="product__badge festival-badge">
            <i class="fas fa-star"></i> Festival
          </div>` : 
          `<div class="product__badge light-pink">Hot</div>`;
        
        // Handle pricing with NaN protection
        const originalPrice = product.originalPrice || product.basePrice || product.price || 0;
        const finalPrice = product.finalPrice || originalPrice;
        const hasValidOffer = product.hasOffer && finalPrice < originalPrice;
        
        const priceHtml = hasValidOffer
          ? `<span class="new__price">&#8377;${Math.round(finalPrice)}</span>
             <span class="old__price">&#8377;${Math.round(originalPrice)}</span>
             ${product.isPercentageOffer ? `<span class="save__price">${product.discountPercentage}% Off</span>` : ''}`
          : `<span class="new__price">&#8377;${Math.round(originalPrice)}</span>`;
        
        productItem.innerHTML = `
          <div class="product__banner">
            <a href="/details/${product._id}" class="product__images">
              <img src="${product.images[0]}" alt="${product.name}" class="product__img default" />
              <img src="${product.images[1] || product.images[0]}" alt="${product.name}" class="product__img hover" />
            </a>
            <div class="product__actions">
              <a href="#" class="action__btn" aria-label="Quick View">
                <i class="fi fi-rs-eye"></i>
              </a>
              <button type="button" class="action__btn wishlist-btn" aria-label="Add to Wishlist" data-product-id="${product._id}">
                <i class="fi fi-rs-heart"></i>
              </button>
            </div>
            ${badgeHtml}
          </div>
          <div class="product__content">
            <span class="product__category">${product.brand ? product.brand.name : 'No Brand'}</span>
            <h3 class="product__title">${product.name}</h3>
            <div class="product__rating">
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
            </div>
            <div class="product__price flex">
              ${priceHtml}
            </div>
            <button type="button" class="action__btn cart__btn" aria-label="Add To Cart" data-product-id="${product._id}">
              <i class="fi fi-rs-shopping-bag-add"></i>
            </button>
          </div>
        `;
        productContainer.appendChild(productItem);
      });
      
      // Bind wishlist and cart events for new products
      bindProductActions();
      // Check wishlist status for newly loaded products
      checkWishlistStatus();
    } else {
      hasMoreProducts = false;
      loader.style.display = "none";
    }
  } catch (err) {
    console.log(err);
    loader.style.display = "none";
  }
}