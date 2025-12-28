/**
 * Modal Selector - Reusable modal for selecting categories, brands, etc.
 * Similar to image cropper modal but for data selection
 */

class ModalSelector {
  constructor(options = {}) {
    this.options = {
      title: options.title || 'Select Item',
      searchPlaceholder: options.searchPlaceholder || 'Search...',
      apiEndpoint: options.apiEndpoint || '',
      displayField: options.displayField || 'name',
      valueField: options.valueField || '_id',
      allowMultiple: options.allowMultiple || false,
      onSelect: options.onSelect || (() => {}),
      onCancel: options.onCancel || (() => {}),
      ...options
    };
    
    this.selectedItems = [];
    this.allItems = [];
    this.filteredItems = [];
    this.isOpen = false;
    
    this.createModal();
  }

  createModal() {
    // Create modal HTML
    const modalHTML = `
      <div class="modal-selector-overlay" id="modalSelectorOverlay">
        <div class="modal-selector-container">
          <div class="modal-selector-header">
            <h3 class="modal-selector-title">${this.options.title}</h3>
            <button class="modal-selector-close" id="modalSelectorClose">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-selector-search">
            <div class="search-input-container">
              <i class="fas fa-search search-icon"></i>
              <input 
                type="text" 
                class="search-input" 
                id="modalSelectorSearch"
                placeholder="${this.options.searchPlaceholder}"
              />
            </div>
          </div>
          
          <div class="modal-selector-content">
            <div class="items-grid" id="modalSelectorGrid">
              <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading items...</p>
              </div>
            </div>
          </div>
          
          <div class="modal-selector-footer">
            <div class="selected-count" id="selectedCount">
              0 items selected
            </div>
            <div class="modal-selector-actions">
              <button class="btn btn-secondary" id="modalSelectorCancel">Cancel</button>
              <button class="btn btn-primary" id="modalSelectorConfirm" disabled>
                ${this.options.allowMultiple ? 'Select Items' : 'Select Item'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Get references
    this.modal = document.getElementById('modalSelectorOverlay');
    this.searchInput = document.getElementById('modalSelectorSearch');
    this.grid = document.getElementById('modalSelectorGrid');
    this.selectedCountEl = document.getElementById('selectedCount');
    this.confirmBtn = document.getElementById('modalSelectorConfirm');
    
    // Bind events
    this.bindEvents();
  }

  bindEvents() {
    // Close modal
    document.getElementById('modalSelectorClose').addEventListener('click', () => this.close());
    document.getElementById('modalSelectorCancel').addEventListener('click', () => this.close());
    
    // Confirm selection
    this.confirmBtn.addEventListener('click', () => this.confirm());
    
    // Search
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    
    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
    
    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  async open() {
    this.isOpen = true;
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Load data
    await this.loadItems();
    
    // Focus search
    setTimeout(() => this.searchInput.focus(), 100);
  }

  close() {
    this.isOpen = false;
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
    this.selectedItems = [];
    this.options.onCancel();
  }

  confirm() {
    if (this.selectedItems.length > 0) {
      this.options.onSelect(this.selectedItems);
      this.close();
    }
  }

  async loadItems() {
    try {
      this.showLoading();
      
      console.log('Loading items from:', this.options.apiEndpoint);
      const response = await fetch(this.options.apiEndpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      this.allItems = data.items || data || [];
      this.filteredItems = [...this.allItems];
      
      console.log('Items loaded:', this.allItems.length);
      this.renderItems();
    } catch (error) {
      console.error('Error loading items:', error);
      this.showError(`Failed to load items: ${error.message}`);
    }
  }

  showLoading() {
    this.grid.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading items...</p>
      </div>
    `;
  }

  showError(message) {
    this.grid.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  renderItems() {
    if (this.filteredItems.length === 0) {
      this.grid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <p>No items found</p>
        </div>
      `;
      return;
    }

    const itemsHTML = this.filteredItems.map(item => {
      const isSelected = this.selectedItems.some(selected => 
        selected[this.options.valueField] === item[this.options.valueField]
      );
      
      return `
        <div class="item-card ${isSelected ? 'selected' : ''}" data-id="${item[this.options.valueField]}">
          <div class="item-content">
            ${item.image ? `<img src="${item.image}" alt="${item[this.options.displayField]}" class="item-image" />` : ''}
            <div class="item-info">
              <h4 class="item-name">${item[this.options.displayField]}</h4>
              ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
              ${item.count !== undefined ? `<span class="item-count">${item.count} items</span>` : ''}
            </div>
          </div>
          <div class="item-actions">
            <div class="selection-indicator">
              <i class="fas fa-check"></i>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.grid.innerHTML = itemsHTML;
    
    // Bind click events
    this.grid.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => this.toggleItem(card));
    });
  }

  toggleItem(cardElement) {
    const itemId = cardElement.dataset.id;
    const item = this.allItems.find(i => i[this.options.valueField] === itemId);
    
    if (!item) return;

    const existingIndex = this.selectedItems.findIndex(selected => 
      selected[this.options.valueField] === itemId
    );

    if (existingIndex > -1) {
      // Deselect
      this.selectedItems.splice(existingIndex, 1);
      cardElement.classList.remove('selected');
    } else {
      // Select
      if (!this.options.allowMultiple) {
        // Single selection - clear previous
        this.selectedItems = [];
        this.grid.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));
      }
      
      this.selectedItems.push(item);
      cardElement.classList.add('selected');
    }

    this.updateUI();
  }

  updateUI() {
    const count = this.selectedItems.length;
    this.selectedCountEl.textContent = `${count} item${count !== 1 ? 's' : ''} selected`;
    this.confirmBtn.disabled = count === 0;
  }

  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredItems = [...this.allItems];
    } else {
      this.filteredItems = this.allItems.filter(item => 
        item[this.options.displayField].toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm))
      );
    }
    
    this.renderItems();
  }

  // Static method to create and open selector
  static async select(options) {
    console.log('ModalSelector.select called with options:', options);
    
    return new Promise((resolve, reject) => {
      try {
        const selector = new ModalSelector({
          ...options,
          onSelect: (items) => {
            console.log('Items selected:', items);
            resolve(options.allowMultiple ? items : items[0]);
            selector.destroy();
          },
          onCancel: () => {
            console.log('Selection cancelled');
            resolve(null);
            selector.destroy();
          }
        });
        
        console.log('ModalSelector created, opening...');
        selector.open().catch(error => {
          console.error('Error opening modal selector:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error creating modal selector:', error);
        reject(error);
      }
    });
  }

  destroy() {
    if (this.modal) {
      this.modal.remove();
    }
  }
}

// Export for use
window.ModalSelector = ModalSelector;