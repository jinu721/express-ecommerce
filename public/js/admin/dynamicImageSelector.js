/**
 * Dynamic Image Selector with Validation
 * Handles up to 4 images with drag & drop, preview, and validation
 */

class DynamicImageSelector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.maxImages = options.maxImages || 4;
    this.minImages = options.minImages || 1;
    this.allowedTypes = options.allowedTypes || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024; // 5MB
    this.images = [];
    this.cropperInstances = [];
    this.mode = options.mode || 'add'; // 'add' or 'edit'
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    const html = `
      <div class="dynamic-image-selector">
        <label class="form-label fw-bold">
          Product Images 
          <span class="text-danger">*</span>
          <small class="text-muted">(${this.minImages}-${this.maxImages} images required)</small>
        </label>
        
        <div class="image-grid" id="imageGrid">
          ${this.renderImageSlots()}
        </div>
        
        <div class="upload-actions mt-3">
          <input type="file" 
                 id="bulkImageInput" 
                 multiple 
                 accept="${this.allowedTypes.join(',')}" 
                 style="display: none;">
          <button type="button" 
                  class="btn btn-outline-primary btn-sm" 
                  onclick="document.getElementById('bulkImageInput').click()">
            <i class="fas fa-upload"></i> Upload Multiple Images
          </button>
          <button type="button" 
                  class="btn btn-outline-secondary btn-sm ms-2" 
                  onclick="imageSelector.clearAll()">
            <i class="fas fa-trash"></i> Clear All
          </button>
        </div>
        
        <div class="validation-message mt-2" id="imageValidationMessage"></div>
      </div>
    `;
    
    this.container.innerHTML = html;
  }

  renderImageSlots() {
    let html = '';
    for (let i = 0; i < this.maxImages; i++) {
      html += this.renderImageSlot(i);
    }
    return html;
  }

  renderImageSlot(index) {
    const image = this.images[index];
    const isEmpty = !image;
    
    return `
      <div class="image-slot ${isEmpty ? 'empty' : 'filled'}" data-index="${index}">
        <div class="image-content">
          ${isEmpty ? this.renderEmptySlot(index) : this.renderFilledSlot(index, image)}
        </div>
        
        ${!isEmpty ? `
          <div class="image-actions">
            <button type="button" 
                    class="btn btn-sm btn-primary" 
                    onclick="imageSelector.cropImage(${index})"
                    title="Crop Image">
              <i class="fas fa-crop"></i>
            </button>
            <button type="button" 
                    class="btn btn-sm btn-warning" 
                    onclick="imageSelector.replaceImage(${index})"
                    title="Replace Image">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <button type="button" 
                    class="btn btn-sm btn-danger" 
                    onclick="imageSelector.removeImage(${index})"
                    title="Remove Image">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        ` : ''}
        
        <div class="image-overlay">
          <span class="image-number">${index + 1}</span>
          ${index === 0 ? '<span class="primary-badge">Primary</span>' : ''}
        </div>
      </div>
    `;
  }

  renderEmptySlot(index) {
    return `
      <div class="empty-slot" onclick="imageSelector.selectImage(${index})">
        <div class="upload-icon">
          <i class="fas fa-plus"></i>
        </div>
        <div class="upload-text">
          <span>Add Image</span>
          <small>Click or drag to upload</small>
        </div>
      </div>
      <input type="file" 
             id="imageInput${index}" 
             accept="${this.allowedTypes.join(',')}" 
             style="display: none;"
             onchange="imageSelector.handleFileSelect(event, ${index})">
    `;
  }

  renderFilledSlot(index, image) {
    return `
      <div class="image-preview">
        <img src="${image.preview}" alt="Product Image ${index + 1}" class="preview-img">
        <div class="image-info">
          <small class="file-name">${image.name}</small>
          <small class="file-size">${this.formatFileSize(image.size)}</small>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Bulk upload
    document.getElementById('bulkImageInput').addEventListener('change', (e) => {
      this.handleBulkUpload(e);
    });

    // Drag and drop
    const imageGrid = document.getElementById('imageGrid');
    
    imageGrid.addEventListener('dragover', (e) => {
      e.preventDefault();
      imageGrid.classList.add('drag-over');
    });

    imageGrid.addEventListener('dragleave', (e) => {
      if (!imageGrid.contains(e.relatedTarget)) {
        imageGrid.classList.remove('drag-over');
      }
    });

    imageGrid.addEventListener('drop', (e) => {
      e.preventDefault();
      imageGrid.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      this.handleBulkFiles(files);
    });
  }

  selectImage(index) {
    document.getElementById(`imageInput${index}`).click();
  }

  handleFileSelect(event, index) {
    const file = event.target.files[0];
    if (file && this.validateFile(file)) {
      this.addImage(file, index);
    }
  }

  handleBulkUpload(event) {
    const files = Array.from(event.target.files);
    this.handleBulkFiles(files);
  }

  handleBulkFiles(files) {
    const validFiles = files.filter(file => this.validateFile(file));
    
    if (validFiles.length === 0) {
      this.showValidationMessage('No valid image files selected', 'error');
      return;
    }

    // Add files to empty slots
    let addedCount = 0;
    for (let i = 0; i < this.maxImages && addedCount < validFiles.length; i++) {
      if (!this.images[i]) {
        this.addImage(validFiles[addedCount], i);
        addedCount++;
      }
    }

    if (addedCount < validFiles.length) {
      this.showValidationMessage(
        `Only ${addedCount} images added. Maximum ${this.maxImages} images allowed.`, 
        'warning'
      );
    }

    // Clear the input
    document.getElementById('bulkImageInput').value = '';
  }

  validateFile(file) {
    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      this.showValidationMessage(
        `Invalid file type: ${file.name}. Only JPG, PNG, and WebP files are allowed.`, 
        'error'
      );
      return false;
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      this.showValidationMessage(
        `File too large: ${file.name}. Maximum size is ${this.formatFileSize(this.maxFileSize)}.`, 
        'error'
      );
      return false;
    }

    return true;
  }

  addImage(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.images[index] = {
        file: file,
        name: file.name,
        size: file.size,
        preview: e.target.result,
        cropped: null
      };
      
      this.updateSlot(index);
      this.validateImages();
    };
    reader.readAsDataURL(file);
  }

  removeImage(index) {
    // Destroy cropper if exists
    if (this.cropperInstances[index]) {
      this.cropperInstances[index].destroy();
      this.cropperInstances[index] = null;
    }

    this.images[index] = null;
    this.updateSlot(index);
    this.validateImages();
  }

  replaceImage(index) {
    document.getElementById(`imageInput${index}`).click();
  }

  cropImage(index) {
    const image = this.images[index];
    if (!image) return;

    this.showCropModal(index, image);
  }

  showCropModal(index, image) {
    const modalHtml = `
      <div class="modal fade" id="cropModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Crop Image ${index + 1}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="crop-container">
                <img id="cropImage" src="${image.preview}" style="max-width: 100%;">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="imageSelector.applyCrop(${index})">
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('cropModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('cropModal'));
    modal.show();

    // Initialize cropper after modal is shown
    modal._element.addEventListener('shown.bs.modal', () => {
      const cropImage = document.getElementById('cropImage');
      this.cropperInstances[index] = new Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false
      });
    });

    // Clean up on modal hide
    modal._element.addEventListener('hidden.bs.modal', () => {
      if (this.cropperInstances[index]) {
        this.cropperInstances[index].destroy();
        this.cropperInstances[index] = null;
      }
      document.getElementById('cropModal').remove();
    });
  }

  applyCrop(index) {
    const cropper = this.cropperInstances[index];
    if (!cropper) return;

    cropper.getCroppedCanvas({
      width: 800,
      height: 800,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    }).toBlob((blob) => {
      // Create new file from blob
      const croppedFile = new File([blob], this.images[index].name, {
        type: this.images[index].file.type
      });

      // Update image data
      this.images[index].file = croppedFile;
      this.images[index].size = croppedFile.size;
      this.images[index].preview = URL.createObjectURL(blob);
      this.images[index].cropped = true;

      this.updateSlot(index);
      
      // Close modal
      bootstrap.Modal.getInstance(document.getElementById('cropModal')).hide();
    }, this.images[index].file.type, 0.9);
  }

  updateSlot(index) {
    const slot = document.querySelector(`[data-index="${index}"]`);
    if (slot) {
      slot.outerHTML = this.renderImageSlot(index);
    }
  }

  clearAll() {
    if (confirm('Are you sure you want to remove all images?')) {
      for (let i = 0; i < this.maxImages; i++) {
        if (this.images[i]) {
          this.removeImage(i);
        }
      }
    }
  }

  validateImages() {
    const imageCount = this.images.filter(img => img !== null && img !== undefined).length;
    
    if (imageCount < this.minImages) {
      this.showValidationMessage(
        `Please add at least ${this.minImages} image${this.minImages > 1 ? 's' : ''}.`, 
        'error'
      );
      return false;
    }

    if (imageCount === 0) {
      this.showValidationMessage('', '');
      return false;
    }

    this.showValidationMessage(
      `${imageCount} image${imageCount > 1 ? 's' : ''} selected.`, 
      'success'
    );
    return true;
  }

  showValidationMessage(message, type) {
    const messageEl = document.getElementById('imageValidationMessage');
    if (!messageEl) return;

    messageEl.className = `validation-message mt-2 ${type ? `text-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'warning'}` : ''}`;
    messageEl.textContent = message;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Public methods for form integration
  getImages() {
    return this.images.filter(img => img !== null && img !== undefined);
  }

  getImageFiles() {
    return this.getImages().map(img => img.file);
  }

  isValid() {
    return this.validateImages();
  }

  reset() {
    for (let i = 0; i < this.maxImages; i++) {
      if (this.images[i]) {
        this.removeImage(i);
      }
    }
    this.images = [];
  }

  // For edit mode - load existing images
  loadExistingImages(imageUrls) {
    imageUrls.forEach((url, index) => {
      if (index < this.maxImages && url) {
        // Convert URL to file-like object for display
        this.images[index] = {
          file: null, // Will be null for existing images
          name: `existing-image-${index + 1}.jpg`,
          size: 0,
          preview: url.startsWith('/') ? url : `/${url}`,
          existing: true
        };
        this.updateSlot(index);
      }
    });
    this.validateImages();
  }
}

// Global instance
let imageSelector;