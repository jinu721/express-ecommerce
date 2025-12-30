/**
 * Dynamic Variant Selector
 * Handles product variant selection with dynamic attributes
 */

class VariantSelector {
  constructor(productId, containerId) {
    this.productId = productId;
    this.container = document.getElementById(containerId);
    this.selectedAttributes = new Map();
    this.variants = [];
    this.attributes = [];
    this.currentVariant = null;
    
    this.init();
  }

  async init() {
    try {
      await this.loadProductData();
      this.renderAttributeSelectors();
      this.bindEvents();
    } catch (error) {
      console.error('Failed to initialize variant selector:', error);
      this.showError('Failed to load product options');
    }
  }

  async loadProductData() {
    // Load variants
    const variantResponse = await fetch(`/api/products/${this.productId}/variants`);
    const variantData = await variantResponse.json();
    
    if (!variantData.success) {
      throw new Error(variantData.message);
    }
    
    this.variants = variantData.variants;

    // Load attributes
    const attrResponse = await fetch(`/api/products/${this.productId}/attributes`);
    const attrData = await attrResponse.json();
    
    if (!attrData.success) {
      throw new Error(attrData.message);
    }
    
    this.attributes = attrData.attributes;
  }

  renderAttributeSelectors() {
    if (this.attributes.length === 0) {
      this.container.innerHTML = '<p class="text-muted">No options available for this product.</p>';
      return;
    }

    let html = '<div class="variant-selectors">';
    
    for (const attribute of this.attributes) {
      html += this.renderAttributeSelector(attribute);
    }
    
    html += '</div>';
    html += '<div id="variant-info" class="mt-3"></div>';
    html += '<div id="selection-guide" class="mt-2"></div>';
    
    this.container.innerHTML = html;
    
    // Show selection guide
    this.updateSelectionGuide();
  }

  renderAttributeSelector(attribute) {
    const availableValues = this.getAvailableValues(attribute.name);
    
    if (availableValues.length === 0) {
      return '';
    }

    let html = `
      <div class="attribute-selector mb-3" data-attribute="${attribute.name}">
        <label class="form-label fw-bold">${attribute.displayName}${attribute.isRequired ? ' *' : ''}</label>
    `;

    if (attribute.type === 'COLOR_PICKER') {
      html += '<div class="color-options d-flex flex-wrap gap-2">';
      for (const value of availableValues) {
        const isSelected = this.selectedAttributes.get(attribute.name) === value.value;
        const isAvailable = this.isValueAvailable(attribute.name, value.value);
        
        html += `
          <div class="color-option ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}" 
               data-value="${value.value}" 
               title="${value.displayValue}"
               style="background-color: ${value.hexCode || '#ccc'}">
            ${isSelected ? '<i class="fas fa-check"></i>' : ''}
          </div>
        `;
      }
      html += '</div>';
    } else {
      html += '<select class="form-select attribute-select" data-attribute="' + attribute.name + '">';
      html += '<option value="">Choose ' + attribute.displayName + '</option>';
      
      for (const value of availableValues) {
        const isAvailable = this.isValueAvailable(attribute.name, value.value);
        const selected = this.selectedAttributes.get(attribute.name) === value.value ? 'selected' : '';
        
        html += `
          <option value="${value.value}" ${selected} ${!isAvailable ? 'disabled' : ''}>
            ${value.displayValue} ${!isAvailable ? '(Out of Stock)' : ''}
          </option>
        `;
      }
      html += '</select>';
    }

    // Show available combinations for this attribute
    if (this.selectedAttributes.size > 0) {
      const otherSelections = Array.from(this.selectedAttributes.entries())
        .filter(([attr]) => attr !== attribute.name)
        .map(([attr, val]) => `${attr}: ${val}`)
        .join(', ');
      
      if (otherSelections) {
        html += `<small class="text-muted">Available for: ${otherSelections}</small>`;
      }
    }

    html += '</div>';
    return html;
  }

  getAvailableValues(attributeName) {
    const attribute = this.attributes.find(attr => attr.name === attributeName);
    if (!attribute) return [];

    // If no selections made yet, show all values that have stock
    if (this.selectedAttributes.size === 0) {
      const availableValues = new Set();
      this.variants.forEach(variant => {
        if (variant.isInStock && variant.availableStock > 0 && variant.attributes[attributeName]) {
          availableValues.add(variant.attributes[attributeName]);
        }
      });
      return attribute.values.filter(value => availableValues.has(value.value));
    }

    // Get all possible values from variants that match current selections (excluding this attribute)
    const otherSelections = new Map(this.selectedAttributes);
    otherSelections.delete(attributeName); // Remove current attribute from filter

    const availableValues = new Set();
    
    this.variants.forEach(variant => {
      // Check if variant matches all OTHER selected attributes
      let matches = true;
      for (const [attr, val] of otherSelections) {
        if (variant.attributes[attr] !== val) {
          matches = false;
          break;
        }
      }
      
      // If variant matches other selections and has stock, include its value for this attribute
      if (matches && variant.isInStock && variant.availableStock > 0 && variant.attributes[attributeName]) {
        availableValues.add(variant.attributes[attributeName]);
      }
    });

    // Filter attribute values to only show those that are available
    return attribute.values.filter(value => availableValues.has(value.value));
  }

  isValueAvailable(attributeName, value) {
    // Check if this value is available given current selections
    const testAttributes = new Map(this.selectedAttributes);
    testAttributes.set(attributeName, value);

    return this.variants.some(variant => {
      // Check if variant matches all selected attributes
      for (const [attr, val] of testAttributes) {
        if (variant.attributes[attr] !== val) {
          return false;
        }
      }
      return variant.isInStock && variant.availableStock > 0;
    });
  }

  bindEvents() {
    // Handle select dropdowns
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('attribute-select')) {
        const attribute = e.target.dataset.attribute;
        const value = e.target.value;
        
        if (value) {
          this.selectedAttributes.set(attribute, value);
        } else {
          this.selectedAttributes.delete(attribute);
        }
        
        this.updateVariant();
      }
    });

    // Handle color options
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.color-option')) {
        const colorOption = e.target.closest('.color-option');
        const attribute = colorOption.closest('.attribute-selector').dataset.attribute;
        const value = colorOption.dataset.value;
        
        if (colorOption.classList.contains('disabled')) {
          return;
        }

        // Toggle selection
        if (this.selectedAttributes.get(attribute) === value) {
          this.selectedAttributes.delete(attribute);
        } else {
          this.selectedAttributes.set(attribute, value);
        }
        
        this.updateVariant();
      }
    });
  }

  updateVariant() {
    // Find matching variant
    this.currentVariant = this.variants.find(variant => {
      for (const [attr, value] of this.selectedAttributes) {
        if (variant.attributes[attr] !== value) {
          return false;
        }
      }
      return true;
    });

    // Re-render selectors to update availability based on current selections
    this.renderAttributeSelectors();
    
    // Update variant info and stock status
    this.updateVariantInfo();
    this.updateStockStatus();
    this.updateAddToCartButtons();
    this.updateSelectionGuide();
    
    // Trigger custom event
    this.container.dispatchEvent(new CustomEvent('variantChanged', {
      detail: {
        variant: this.currentVariant,
        attributes: Object.fromEntries(this.selectedAttributes)
      }
    }));
  }

  updateVariantInfo() {
    const infoContainer = document.getElementById('variant-info');
    if (!infoContainer) return;

    if (this.currentVariant) {
      const stockStatus = this.currentVariant.isInStock ? 
        `<span class="text-success"><i class="fas fa-check-circle"></i> In Stock (${this.currentVariant.availableStock})</span>` :
        '<span class="text-danger"><i class="fas fa-times-circle"></i> Out of Stock</span>';

      // Show variant pricing with proper fallbacks
      let priceInfo = '';
      
      // Get pricing data with fallbacks
      const originalPrice = this.currentVariant.originalPrice || this.currentVariant.basePrice || 0;
      const finalPrice = this.currentVariant.finalPrice || this.currentVariant.originalPrice || this.currentVariant.basePrice || 0;
      const discount = this.currentVariant.discount || 0;
      const discountPercentage = this.currentVariant.discountPercentage || 0;
      const hasOffer = this.currentVariant.hasOffer || false;
      const isPercentageOffer = this.currentVariant.isPercentageOffer || false;
      
      console.log('Variant pricing debug:', {
        variantId: this.currentVariant._id,
        originalPrice,
        finalPrice,
        discount,
        discountPercentage,
        hasOffer,
        isPercentageOffer,
        rawVariant: this.currentVariant
      });
      
      if (hasOffer && discount > 0) {
        priceInfo = `
          <div class="variant-pricing mt-3">
            <div class="price-row d-flex align-items-center gap-3 mb-2">
              <span class="h4 text-success mb-0 fw-bold">₹${Math.round(finalPrice)}</span>
              <span class="h6 text-muted text-decoration-line-through mb-0">₹${Math.round(originalPrice)}</span>
              ${isPercentageOffer && discountPercentage ? `<span class="badge bg-danger fs-6">${discountPercentage}% OFF</span>` : ''}
            </div>
            ${this.currentVariant.offer ? `
              <div class="offer-info">
                <small class="text-success fw-semibold">
                  <i class="fas fa-tag me-1"></i>${this.currentVariant.offer.name}
                </small>
              </div>
            ` : ''}
            <div class="savings-info mt-1">
              <small class="text-muted">You save ₹${Math.round(discount)}</small>
            </div>
          </div>
        `;
      } else {
        priceInfo = `
          <div class="variant-pricing mt-3">
            <div class="price-row">
              <span class="h4 text-dark mb-0 fw-bold">₹${Math.round(finalPrice || originalPrice)}</span>
            </div>
          </div>
        `;
      }

      infoContainer.innerHTML = `
        <div class="variant-details p-3 bg-light rounded">
          <div class="row">
            <div class="col-md-6">
              <strong>SKU:</strong> ${this.currentVariant.sku}<br>
              <strong>Selection:</strong> ${this.currentVariant.attributeString}
            </div>
            <div class="col-md-6">
              <strong>Stock:</strong> ${stockStatus}
              ${this.currentVariant.isLowStock ? '<br><small class="text-warning">Low Stock!</small>' : ''}
            </div>
          </div>
          ${priceInfo} 
        </div>
      `;
    } else if (this.selectedAttributes.size > 0) {
      infoContainer.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> 
          This combination is not available. Please select different options.
        </div>
      `;
    } else {
      infoContainer.innerHTML = '';
    }
  }

  // Public methods
  getSelectedVariant() {
    return this.currentVariant;
  }

  getSelectedAttributes() {
    return Object.fromEntries(this.selectedAttributes);
  }

  isSelectionComplete() {
    const requiredAttributes = this.attributes.filter(attr => attr.isRequired);
    return requiredAttributes.every(attr => this.selectedAttributes.has(attr.name));
  }

  reset() {
    this.selectedAttributes.clear();
    this.currentVariant = null;
    this.renderAttributeSelectors();
    this.updateVariantInfo();
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle"></i> ${message}
      </div>
    `;
  }

  updateStockStatus() {
    const stockElement = document.querySelector('.stockText');
    if (!stockElement) return;

    if (this.currentVariant) {
      if (this.currentVariant.isInStock && this.currentVariant.availableStock > 0) {
        stockElement.innerHTML = `<span class="text-success">In Stock (${this.currentVariant.availableStock} available)</span>`;
        if (this.currentVariant.isLowStock) {
          stockElement.innerHTML += ' <small class="text-warning">- Low Stock!</small>';
        }
      } else {
        stockElement.innerHTML = '<span class="text-danger">Out of Stock</span>';
      }
    } else if (this.selectedAttributes.size > 0) {
      stockElement.innerHTML = '<span class="text-warning">Combination not available</span>';
    } else {
      stockElement.innerHTML = 'Select options to see availability';
    }
  }

  updateAddToCartButtons() {
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const buyNowBtn = document.querySelector('.buy-now-btn');
    
    const isAvailable = this.currentVariant && this.currentVariant.isInStock && this.currentVariant.availableStock > 0;
    const hasRequiredSelections = this.isSelectionComplete();
    
    if (addToCartBtn) {
      addToCartBtn.disabled = !isAvailable || !hasRequiredSelections;
      addToCartBtn.textContent = !hasRequiredSelections ? 'Select Options' : 
                                !isAvailable ? 'Out of Stock' : 'Add To Cart';
    }
    
    if (buyNowBtn) {
      buyNowBtn.disabled = !isAvailable || !hasRequiredSelections;
      buyNowBtn.textContent = !hasRequiredSelections ? 'Select Options' : 
                             !isAvailable ? 'Out of Stock' : 'Buy Now';
    }
  }

  updateSelectionGuide() {
    const guideContainer = document.getElementById('selection-guide');
    if (!guideContainer) return;

    if (this.selectedAttributes.size === 0) {
      guideContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> 
          <strong>How to select:</strong> Choose any option first (e.g., size or color), 
          then see what other options become available for that selection.
        </div>
      `;
    } else if (this.selectedAttributes.size > 0 && !this.currentVariant) {
      guideContainer.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> 
          This combination is not available. Try different options.
        </div>
      `;
    } else {
      guideContainer.innerHTML = '';
    }
  }
}

// Add to cart functionality
class AddToCartHandler {
  constructor(variantSelector, productId) {
    this.variantSelector = variantSelector;
    this.productId = productId;
    this.bindEvents();
  }

  bindEvents() {
    // Add to cart button
    document.addEventListener('click', (e) => {
      if (e.target.matches('.add-to-cart-btn')) {
        e.preventDefault();
        this.handleAddToCart();
      }
    });

    // Buy now button
    document.addEventListener('click', (e) => {
      if (e.target.matches('.buy-now-btn')) {
        e.preventDefault();
        this.handleBuyNow();
      }
    });
  }

  async handleAddToCart() {
    const variant = this.variantSelector.getSelectedVariant();
    const attributes = this.variantSelector.getSelectedAttributes();
    
    if (!variant && Object.keys(attributes).length === 0) {
      this.showMessage('Please select product options', 'warning');
      return;
    }

    if (!variant) {
      this.showMessage('Selected combination is not available', 'error');
      return;
    }

    if (!variant.isInStock) {
      this.showMessage('This item is out of stock', 'error');
      return;
    }

    const quantity = parseInt(document.getElementById('quantity')?.value || 1);

    try {
      const response = await fetch('/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: this.productId,
          variantId: variant._id,
          quantity: quantity,
          attributes: attributes
        })
      });

      const data = await response.json();

      if (data.val) {
        this.showMessage('Item added to cart successfully!', 'success');
        this.updateCartCount(data.cartCount);
      } else {
        this.showMessage(data.msg || 'Failed to add item to cart', 'error');
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      this.showMessage('Failed to add item to cart', 'error');
    }
  }

  async handleBuyNow() {
    const variant = this.variantSelector.getSelectedVariant();
    const attributes = this.variantSelector.getSelectedAttributes();
    
    if (!variant && Object.keys(attributes).length === 0) {
      this.showMessage('Please select product options', 'warning');
      return;
    }

    if (!variant) {
      this.showMessage('Selected combination is not available', 'error');
      return;
    }

    if (!variant.isInStock) {
      this.showMessage('This item is out of stock', 'error');
      return;
    }

    const quantity = parseInt(document.getElementById('quantity')?.value || 1);

    try {
      const response = await fetch('/add-to-cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: this.productId,
          variantId: variant._id,
          quantity: quantity,
          attributes: attributes,
          isBuyNow: true
        })
      });

      const data = await response.json();

      if (data.val) {
        // Redirect to checkout
        window.location.href = '/checkout';
      } else {
        this.showMessage(data.msg || 'Failed to process buy now', 'error');
      }
    } catch (error) {
      console.error('Buy now error:', error);
      this.showMessage('Failed to process buy now', 'error');
    }
  }

  showMessage(message, type) {
    // Create or update message container
    let messageContainer = document.getElementById('cart-message');
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'cart-message';
      messageContainer.className = 'mt-3';
      document.querySelector('.add-to-cart-section')?.appendChild(messageContainer);
    }

    const alertClass = type === 'success' ? 'alert-success' : 
                     type === 'warning' ? 'alert-warning' : 'alert-danger';

    messageContainer.innerHTML = `
      <div class="alert ${alertClass} alert-dismissible fade show">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;

    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        messageContainer.innerHTML = '';
      }, 3000);
    }
  }

  updateCartCount(count) {
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
      el.textContent = count;
      if (count > 0) {
        el.style.display = 'inline';
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  const productId = document.querySelector('[data-product-id]')?.dataset.productId;
  
  if (productId) {
    const variantSelector = new VariantSelector(productId, 'variant-selector');
    const addToCartHandler = new AddToCartHandler(variantSelector, productId);
    
    // Make globally available
    window.variantSelector = variantSelector;
    window.addToCartHandler = addToCartHandler;
  }
});