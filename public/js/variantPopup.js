/**
 * Variant Selection Popup
 * Professional popup for variant selection when adding to cart
 */

class VariantPopup {
  constructor() {
    this.isOpen = false;
    this.currentProduct = null;
    this.selectedVariant = null;
    this.selectedAttributes = new Map();
    this.variants = [];
    this.attributes = [];
    this.onConfirm = null;
    this.createPopup();
  }

  createPopup() {
    const popupHTML = `
      <div class="variant-popup-overlay" id="variantPopupOverlay">
        <div class="variant-popup-container">
          <div class="variant-popup-header">
            <div class="product-info">
              <img class="product-image" id="popupProductImage" src="" alt="">
              <div class="product-details">
                <h3 class="product-name" id="popupProductName"></h3>
                <div class="product-price" id="popupProductPrice"></div>
              </div>
            </div>
            <button class="popup-close" id="variantPopupClose">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="variant-popup-content">
            <h4 class="selection-title">Select Options</h4>
            <div class="variant-selectors" id="popupVariantSelectors">
              <!-- Variant selectors will be populated here -->
            </div>
            
            <div class="quantity-section">
              <label for="popupQuantity">Quantity:</label>
              <div class="quantity-controls">
                <button type="button" class="qty-btn minus" id="qtyMinus">-</button>
                <input type="number" id="popupQuantity" value="1" min="1" max="999">
                <button type="button" class="qty-btn plus" id="qtyPlus">+</button>
              </div>
            </div>
            
            <div class="stock-info" id="popupStockInfo">
              <i class="fas fa-info-circle"></i>
              <span>Select options to see availability</span>
            </div>
          </div>
          
          <div class="variant-popup-footer">
            <button class="btn btn-secondary" id="variantPopupCancel">Cancel</button>
            <button class="btn btn-primary" id="variantPopupConfirm" disabled>
              <i class="fas fa-shopping-cart"></i>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
    this.bindEvents();
  }

  bindEvents() {
    const overlay = document.getElementById('variantPopupOverlay');
    const closeBtn = document.getElementById('variantPopupClose');
    const cancelBtn = document.getElementById('variantPopupCancel');
    const confirmBtn = document.getElementById('variantPopupConfirm');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyInput = document.getElementById('popupQuantity');

    // Close events
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());

    // Quantity controls
    qtyMinus.addEventListener('click', () => {
      const current = parseInt(qtyInput.value);
      if (current > 1) qtyInput.value = current - 1;
    });

    qtyPlus.addEventListener('click', () => {
      const current = parseInt(qtyInput.value);
      const max = parseInt(qtyInput.getAttribute('max'));
      if (current < max) qtyInput.value = current + 1;
    });

    qtyInput.addEventListener('input', () => {
      const value = parseInt(qtyInput.value);
      const max = parseInt(qtyInput.getAttribute('max'));
      if (value < 1) qtyInput.value = 1;
      if (value > max) qtyInput.value = max;
    });

    // Confirm button
    confirmBtn.addEventListener('click', () => {
      if (this.onConfirm && this.selectedVariant) {
        const quantity = parseInt(qtyInput.value);
        this.onConfirm({
          variant: this.selectedVariant,
          attributes: Object.fromEntries(this.selectedAttributes),
          quantity: quantity
        });
        this.close();
      }
    });
  }

  async open(productId, options = {}) {
    if (this.isOpen) return;

    console.log('Opening variant popup for product:', productId);

    try {
      // Load product data
      const response = await fetch(`/api/products/${productId}/popup-data`);
      const data = await response.json();

      console.log('Popup data response:', data);

      if (!data.success) {
        Toast.error('Error', data.message || 'Failed to load product data');
        return;
      }

      this.currentProduct = data.product;
      this.onConfirm = options.onConfirm || null;

      // Populate product info
      this.populateProductInfo();
      
      // Load variants if available
      if (data.variants && data.variants.length > 0) {
        console.log('Loading variants:', data.variants.length);
        await this.populateVariants(data.variants, data.attributes);
      } else {
        console.log('No variants found, treating as simple product');
        // No variants - simple product
        this.handleSimpleProduct();
      }

      // Show popup
      const overlay = document.getElementById('variantPopupOverlay');
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
      this.isOpen = true;

    } catch (error) {
      console.error('Error opening variant popup:', error);
      Toast.error('Error', 'Failed to load product options');
    }
  }

  populateProductInfo() {
    const image = document.getElementById('popupProductImage');
    const name = document.getElementById('popupProductName');
    const price = document.getElementById('popupProductPrice');

    image.src = this.currentProduct.images?.[0] ? `/${this.currentProduct.images[0]}` : '/img/no-image.png';
    image.alt = this.currentProduct.name;
    name.textContent = this.currentProduct.name;

    // Display price with offers
    if (this.currentProduct.hasOffer) {
      price.innerHTML = `
        <span class="new-price">₹${Math.round(this.currentProduct.finalPrice)}</span>
        <span class="old-price">₹${Math.round(this.currentProduct.originalPrice)}</span>
        ${this.currentProduct.discountPercentage ? `<span class="discount">${this.currentProduct.discountPercentage}% OFF</span>` : ''}
      `;
    } else {
      price.innerHTML = `<span class="new-price">₹${Math.round(this.currentProduct.originalPrice)}</span>`;
    }
  }

  async populateVariants(variants, attributes) {
    const container = document.getElementById('popupVariantSelectors');
    container.innerHTML = '';

    console.log('Populating variants:', variants.length, 'attributes:', attributes);

    if (!variants || variants.length === 0) {
      console.log('No variants provided, handling as simple product');
      this.handleSimpleProduct();
      return;
    }

    if (!attributes || attributes.length === 0) {
      console.log('No attributes provided, extracting from variants');
      // Try to extract attributes from variants
      const attributeMap = new Map();
      variants.forEach(variant => {
        if (variant.attributes) {
          Object.keys(variant.attributes).forEach(key => {
            if (!attributeMap.has(key)) {
              attributeMap.set(key, new Set());
            }
            attributeMap.get(key).add(variant.attributes[key]);
          });
        }
      });
      
      if (attributeMap.size === 0) {
        console.log('No attributes found in variants, handling as simple product');
        this.handleSimpleProduct();
        return;
      }
      
      attributes = Array.from(attributeMap.entries()).map(([key, values]) => ({
        name: key,
        displayName: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
        type: key.toLowerCase() === 'color' ? 'COLOR_PICKER' : 'DROPDOWN',
        isRequired: true,
        values: Array.from(values).map(value => ({
          value: value,
          displayValue: value,
          hexCode: key.toLowerCase() === 'color' ? this.getColorHex(value) : null
        }))
      }));
      
      console.log('Extracted attributes:', attributes);
    }

    this.variants = variants;
    this.attributes = attributes;

    // Create attribute selectors with dynamic filtering
    for (const attribute of attributes) {
      console.log('Creating selector for attribute:', attribute.name);
      const selectorHTML = this.createDynamicAttributeSelector(attribute);
      if (selectorHTML) {
        container.insertAdjacentHTML('beforeend', selectorHTML);
      }
    }

    // Bind attribute selection events with dynamic updates
    this.bindDynamicAttributeEvents();
  }

  createDynamicAttributeSelector(attribute) {
    const availableValues = this.getAvailableValuesForAttribute(attribute.name);
    
    if (availableValues.length === 0) return '';

    let selectorHTML = `
      <div class="attribute-group" data-attribute="${attribute.name}">
        <label class="attribute-label">${attribute.displayName}${attribute.isRequired ? ' *' : ''}</label>
    `;

    if (attribute.type === 'COLOR_PICKER') {
      selectorHTML += '<div class="color-options">';
      availableValues.forEach(value => {
        const isSelected = this.selectedAttributes.get(attribute.name) === value.value;
        const isAvailable = this.isValueAvailableForAttribute(attribute.name, value.value);
        
        selectorHTML += `
          <div class="color-option ${isSelected ? 'active' : ''} ${!isAvailable ? 'disabled' : ''}" 
               data-value="${value.value}" 
               title="${value.displayValue}"
               style="background-color: ${value.hexCode || '#ccc'}">
            ${isSelected ? '<i class="fas fa-check"></i>' : ''}
          </div>
        `;
      });
      selectorHTML += '</div>';
    } else {
      selectorHTML += '<div class="size-options">';
      availableValues.forEach(value => {
        const isSelected = this.selectedAttributes.get(attribute.name) === value.value;
        const isAvailable = this.isValueAvailableForAttribute(attribute.name, value.value);
        
        selectorHTML += `
          <button type="button" class="size-option ${isSelected ? 'active' : ''} ${!isAvailable ? 'disabled' : ''}" 
                  data-value="${value.value}" ${!isAvailable ? 'disabled' : ''}>
            ${value.displayValue}
          </button>
        `;
      });
      selectorHTML += '</div>';
    }

    selectorHTML += '</div>';
    return selectorHTML;
  }

  getAvailableValuesForAttribute(attributeName) {
    const attribute = this.attributes.find(attr => attr.name === attributeName);
    if (!attribute) return [];

    // If no selections made yet, show all values that have stock
    if (this.selectedAttributes.size === 0) {
      const availableValues = new Set();
      this.variants.forEach(variant => {
        if (variant.availableStock > 0 && variant.attributes[attributeName]) {
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
      if (matches && variant.availableStock > 0 && variant.attributes[attributeName]) {
        availableValues.add(variant.attributes[attributeName]);
      }
    });

    // Filter attribute values to only show those that are available
    return attribute.values.filter(value => availableValues.has(value.value));
  }

  isValueAvailableForAttribute(attributeName, value) {
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
      return variant.availableStock > 0;
    });
  }

  bindDynamicAttributeEvents() {
    const attributeGroups = document.querySelectorAll('.attribute-group');
    
    attributeGroups.forEach(group => {
      const attributeName = group.dataset.attribute;
      const options = group.querySelectorAll('.color-option, .size-option');
      
      options.forEach(option => {
        option.addEventListener('click', (e) => {
          e.preventDefault();
          
          if (option.classList.contains('disabled')) {
            return;
          }
          
          const value = option.dataset.value;
          
          // Toggle selection
          if (this.selectedAttributes.get(attributeName) === value) {
            this.selectedAttributes.delete(attributeName);
          } else {
            this.selectedAttributes.set(attributeName, value);
          }
          
          // Update variant and re-render with new availability
          this.updateSelectedVariantDynamic();
          this.rerenderAttributeSelectors();
        });
      });
    });
  }

  updateSelectedVariantDynamic() {
    // Find variant that matches all selected attributes
    this.selectedVariant = this.variants.find(variant => {
      if (!variant.attributes) return false;
      
      for (const [key, value] of this.selectedAttributes) {
        if (variant.attributes[key] !== value) return false;
      }
      
      return true;
    });

    this.updateUI();
  }

  rerenderAttributeSelectors() {
    // Re-render all attribute selectors to update availability
    const container = document.getElementById('popupVariantSelectors');
    container.innerHTML = '';

    for (const attribute of this.attributes) {
      const selectorHTML = this.createDynamicAttributeSelector(attribute);
      if (selectorHTML) {
        container.insertAdjacentHTML('beforeend', selectorHTML);
      }
    }

    // Re-bind events
    this.bindDynamicAttributeEvents();
  }

  getColorHex(colorName) {
    const colorMap = {
      'red': '#ff0000',
      'blue': '#0000ff',
      'green': '#008000',
      'black': '#000000',
      'white': '#ffffff',
      'yellow': '#ffff00',
      'pink': '#ffc0cb',
      'purple': '#800080',
      'orange': '#ffa500',
      'brown': '#a52a2a',
      'gray': '#808080',
      'grey': '#808080'
    };
    
    return colorMap[colorName.toLowerCase()] || '#cccccc';
  }

  updateUI() {
    const stockInfo = document.getElementById('popupStockInfo');
    const confirmBtn = document.getElementById('variantPopupConfirm');
    const qtyInput = document.getElementById('popupQuantity');

    if (this.selectedVariant) {
      const isInStock = this.selectedVariant.availableStock > 0;
      
      if (isInStock) {
        stockInfo.innerHTML = `
          <i class="fas fa-check-circle" style="color: #10b981;"></i>
          <span style="color: #10b981;">${this.selectedVariant.availableStock} items in stock</span>
        `;
        confirmBtn.disabled = false;
        qtyInput.setAttribute('max', this.selectedVariant.availableStock);
        
        if (this.selectedVariant.availableStock < 10) {
          stockInfo.innerHTML += ' <span style="color: #f59e0b;">(Low Stock!)</span>';
        }
      } else {
        stockInfo.innerHTML = `
          <i class="fas fa-times-circle" style="color: #ef4444;"></i>
          <span style="color: #ef4444;">Out of stock</span>
        `;
        confirmBtn.disabled = true;
      }
    } else if (this.selectedAttributes.size > 0) {
      stockInfo.innerHTML = `
        <i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>
        <span style="color: #f59e0b;">This combination is not available</span>
      `;
      confirmBtn.disabled = true;
    } else {
      stockInfo.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>Select options to see availability</span>
      `;
      confirmBtn.disabled = true;
    }
  }

  handleSimpleProduct() {
    const container = document.getElementById('popupVariantSelectors');
    container.innerHTML = '<p class="no-variants">This product has no variants to select.</p>';
    
    const confirmBtn = document.getElementById('variantPopupConfirm');
    const stockInfo = document.getElementById('popupStockInfo');
    
    // Enable add to cart for simple products
    confirmBtn.disabled = false;
    stockInfo.innerHTML = `
      <i class="fas fa-check-circle" style="color: #10b981;"></i>
      <span style="color: #10b981;">In Stock</span>
    `;
    
    // Set a dummy variant for simple products
    this.selectedVariant = { _id: null, availableStock: 999 };
  }

  close() {
    if (!this.isOpen) return;

    const overlay = document.getElementById('variantPopupOverlay');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    
    // Reset state
    this.selectedVariant = null;
    this.selectedAttributes.clear();
    this.variants = [];
    this.attributes = [];
    this.currentProduct = null;
    this.onConfirm = null;
    this.isOpen = false;
  }
}

// Global instance
window.variantPopup = new VariantPopup();