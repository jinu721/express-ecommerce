/**
 * Modern Image Selector Component
 * Supports 1-4 images with drag & drop, cropping, and preview
 */

class ImageSelector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      console.error(`ImageSelector: Container with ID '${containerId}' not found!`);
      return;
    }
    
    console.log(`ImageSelector: Initializing for container '${containerId}'`);
    
    this.options = {
      maxImages: 4,
      minImages: 1,
      allowCrop: true,
      aspectRatio: 1, // 1:1 square by default
      quality: 0.8,
      maxSize: 5 * 1024 * 1024, // 5MB
      acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      ...options
    };
    
    this.images = [];
    this.cropper = null;
    this.currentCropIndex = -1;
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="image-selector-container">
        <label class="form-label">Product Images (${this.options.minImages}-${this.options.maxImages} images)</label>
        <div class="image-selector-grid" id="imageGrid">
          ${this.renderImageBoxes()}
        </div>
      </div>
      ${this.options.allowCrop ? this.renderCropModal() : ''}
    `;
  }

  renderImageBoxes() {
    let html = '';
    
    console.log("renderImageBoxes called, images:", this.images);
    
    for (let i = 0; i < this.options.maxImages; i++) {
      const image = this.images[i];
      const isPrimary = i === 0;
      
      console.log(`Rendering box ${i + 1}, has image:`, !!image);
      
      html += `
        <div class="image-upload-box ${image ? 'has-image' : ''}" data-index="${i}" style="position: relative;">
          ${image ? this.renderImagePreview(image, i, isPrimary) : this.renderUploadPlaceholder(i)}
          <input type="file" class="image-input" id="imageInput${i}" accept="${this.options.acceptedTypes.join(',')}" data-index="${i}" style="display: none;">
        </div>
      `;
    }
    
    console.log("Generated HTML:", html.substring(0, 200) + "...");
    return html;
  }

  renderUploadPlaceholder(index) {
    const isPrimary = index === 0;
    return `
      <div class="upload-placeholder">
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        <div class="upload-text">${isPrimary ? 'Primary Image' : `Image ${index + 1}`}</div>
        <div class="upload-subtext">Click to upload${isPrimary ? ' (Required)' : ' (Optional)'}</div>
      </div>
    `;
  }

  renderImagePreview(image, index, isPrimary) {
    console.log(`Rendering image preview ${index + 1}:`, image.url);
    // Get the correct instance name for onclick handlers
    const instanceName = this.container.id === 'editImageSelector' ? 'editImageSelector' : 'imageSelector';
    
    return `
      <div class="image-preview show" style="display: block !important; position: relative; width: 100%; height: 100%;">
        <img src="${image.url}" alt="Preview ${index + 1}" class="preview-image" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" onload="console.log('Image loaded: ${image.url}')" onerror="console.error('Image failed to load: ${image.url}')">
        <div class="image-actions">
          ${this.options.allowCrop ? `<button type="button" class="action-btn edit" onclick="window.${instanceName}.openCrop(${index})" title="Edit"><i class="fas fa-crop"></i></button>` : ''}
          <button type="button" class="action-btn remove" onclick="window.${instanceName}.removeImage(${index})" title="Remove"><i class="fas fa-trash"></i></button>
        </div>
        <div class="image-counter">${index + 1}</div>
        ${isPrimary ? '<div class="primary-badge">Primary</div>' : ''}
      </div>
    `;
  }

  renderCropModal() {
    return `
      <div class="crop-modal" id="cropModal">
        <div class="crop-container">
          <div class="crop-header">
            <h3 class="crop-title">Crop Image</h3>
          </div>
          <div class="crop-image-container">
            <img id="cropImage" style="max-width: 100%; display: block;">
          </div>
          <div class="crop-actions">
            <button type="button" class="btn-crop cancel" onclick="imageSelector.closeCrop()">Cancel</button>
            <button type="button" class="btn-crop save" onclick="imageSelector.saveCrop()">Save</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // File input change events
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('image-input')) {
        const index = parseInt(e.target.dataset.index);
        this.handleFileSelect(e.target.files[0], index);
      }
    });

    // Click events for upload boxes
    this.container.addEventListener('click', (e) => {
      const uploadBox = e.target.closest('.image-upload-box');
      if (uploadBox && !uploadBox.classList.contains('has-image')) {
        const index = parseInt(uploadBox.dataset.index);
        document.getElementById(`imageInput${index}`).click();
      }
    });

    // Drag and drop events
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const uploadBox = e.target.closest('.image-upload-box');
      if (uploadBox) {
        uploadBox.style.borderColor = '#3b82f6';
        uploadBox.style.background = '#eff6ff';
      }
    });

    this.container.addEventListener('dragleave', (e) => {
      const uploadBox = e.target.closest('.image-upload-box');
      if (uploadBox) {
        uploadBox.style.borderColor = '';
        uploadBox.style.background = '';
      }
    });

    this.container.addEventListener('drop', (e) => {
      e.preventDefault();
      const uploadBox = e.target.closest('.image-upload-box');
      if (uploadBox) {
        uploadBox.style.borderColor = '';
        uploadBox.style.background = '';
        const index = parseInt(uploadBox.dataset.index);
        const file = e.dataTransfer.files[0];
        this.handleFileSelect(file, index);
      }
    });
  }

  handleFileSelect(file, index) {
    if (!file) return;

    // Validate file type
    if (!this.options.acceptedTypes.includes(file.type)) {
      Toast.error('Invalid File Type', `Please select a valid image file (${this.options.acceptedTypes.join(', ')})`);
      return;
    }

    // Validate file size
    if (file.size > this.options.maxSize) {
      Toast.error('File Too Large', `Please select an image smaller than ${this.formatFileSize(this.options.maxSize)}`);
      return;
    }

    // Create image object
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        file: file,
        url: e.target.result,
        name: file.name,
        size: file.size
      };

      this.images[index] = imageData;
      this.updateDisplay();

      // Auto-open crop for new images
      if (this.options.allowCrop) {
        setTimeout(() => this.openCrop(index), 100);
      }
    };
    reader.readAsDataURL(file);
  }

  removeImage(index) {
    this.images[index] = null;
    
    // Shift images left to fill gaps
    const filteredImages = this.images.filter(img => img !== null);
    this.images = [...filteredImages];
    
    // Pad with nulls to maintain array length
    while (this.images.length < this.options.maxImages) {
      this.images.push(null);
    }
    
    this.updateDisplay();
    Toast.success('Image Removed', 'Image has been removed successfully');
  }

  openCrop(index) {
    if (!this.images[index]) return;

    this.currentCropIndex = index;
    const modal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    
    cropImage.src = this.images[index].url;
    modal.classList.add('show');

    // Initialize cropper
    setTimeout(() => {
      if (this.cropper) {
        this.cropper.destroy();
      }
      
      this.cropper = new Cropper(cropImage, {
        aspectRatio: this.options.aspectRatio,
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
    }, 100);
  }

  closeCrop() {
    const modal = document.getElementById('cropModal');
    modal.classList.remove('show');
    
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
    
    this.currentCropIndex = -1;
  }

  saveCrop() {
    if (!this.cropper || this.currentCropIndex === -1) return;

    const canvas = this.cropper.getCroppedCanvas({
      width: 800,
      height: 800,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    canvas.toBlob((blob) => {
      const croppedFile = new File([blob], this.images[this.currentCropIndex].name, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        this.images[this.currentCropIndex] = {
          ...this.images[this.currentCropIndex],
          file: croppedFile,
          url: e.target.result
        };
        
        this.updateDisplay();
        this.closeCrop();
        Toast.success('Image Cropped', 'Image has been cropped successfully');
      };
      reader.readAsDataURL(croppedFile);
    }, 'image/jpeg', this.options.quality);
  }

  updateDisplay() {
    // Use direct DOM manipulation instead of innerHTML
    this.updateDisplayDirect();
  }

  // Get all images as FormData
  getFormData(fieldName = 'images') {
    const formData = new FormData();
    
    this.images.forEach((image, index) => {
      if (image) {
        if (image.file) {
          // New uploaded image
          console.log(`Adding new image ${index + 1}:`, image.file.name);
          formData.append(`${fieldName}${index + 1}`, image.file);
        } else if (image.url) {
          // Existing image - send URL
          console.log(`Adding existing image ${index + 1}:`, image.url);
          formData.append(`existing${fieldName}${index + 1}`, image.url);
        }
      }
    });
    
    // Log all form data entries for debugging
    console.log("FormData entries:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    return formData;
  }

  // Get image count
  getImageCount() {
    return this.images.filter(img => img !== null).length;
  }

  // Validate images
  validate() {
    const imageCount = this.getImageCount();
    
    if (imageCount < this.options.minImages) {
      Toast.error('Not Enough Images', `Please add at least ${this.options.minImages} image(s)`);
      return false;
    }
    
    return true;
  }

  // Clear all images
  clear() {
    this.images = [];
    while (this.images.length < this.options.maxImages) {
      this.images.push(null);
    }
    this.updateDisplay();
  }

  // Load existing images
  loadImages(imageUrls) {
    console.log("ImageSelector.loadImages called with:", imageUrls);
    this.clear();
    
    if (!imageUrls || imageUrls.length === 0) {
      console.log("No images to load");
      return;
    }
    
    // Initialize the images array with the correct length
    this.images = new Array(this.options.maxImages).fill(null);
    
    imageUrls.forEach((url, index) => {
      if (index < this.options.maxImages && url) {
        console.log(`Loading image ${index + 1}:`, url);
        
        // Immediately add the image to the array (don't wait for load test)
        this.images[index] = {
          url: url,
          file: null, // Existing image, no file
          name: `existing-${index + 1}.jpg`,
          size: 0
        };
        
        // Test if image is accessible (for debugging only)
        const testImg = new Image();
        testImg.onload = () => {
          console.log(`Image ${index + 1} loaded successfully:`, url);
        };
        
        testImg.onerror = () => {
          console.error(`Image ${index + 1} failed to load:`, url);
          // Try with different path variations
          const variations = [
            url,
            url.startsWith('/') ? url.substring(1) : `/${url}`,
            url.replace(/^\/+/, '/'),
            url.replace(/\\/g, '/'), // Convert backslashes to forward slashes
            `/uploads/${url.replace(/^.*[\\\/]/, '')}`
          ];
          
          console.log("Trying image variations:", variations);
          this.tryImageVariations(variations, index);
        };
        
        testImg.src = url;
      }
    });
    
    console.log("Images array after loading:", this.images);
    // Use direct DOM update instead of innerHTML
    this.updateDisplayDirect();
    console.log("Display updated");
  }

  // Helper method to try different image path variations
  tryImageVariations(variations, index) {
    if (variations.length === 0) {
      console.error(`All variations failed for image ${index + 1}`);
      return;
    }
    
    const url = variations.shift();
    const testImg = new Image();
    
    testImg.onload = () => {
      console.log(`Image ${index + 1} loaded with variation:`, url);
      this.images[index] = {
        url: url,
        file: null,
        name: `existing-${index + 1}.jpg`,
        size: 0
      };
      this.updateDisplay();
    };
    
    testImg.onerror = () => {
      console.log(`Variation failed:`, url);
      this.tryImageVariations(variations, index);
    };
    
    testImg.src = url;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Alternative method to create DOM elements directly
  createImageBox(image, index) {
    const isPrimary = index === 0;
    const box = document.createElement('div');
    box.className = `image-upload-box ${image ? 'has-image' : ''}`;
    box.setAttribute('data-index', index);
    box.style.position = 'relative';
    
    if (image) {
      // Create image preview
      const preview = document.createElement('div');
      preview.className = 'image-preview show';
      preview.style.cssText = 'display: block !important; position: relative; width: 100%; height: 100%;';
      
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = `Preview ${index + 1}`;
      img.className = 'preview-image';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 10px;';
      img.onload = () => console.log('Image loaded:', image.url);
      img.onerror = () => console.error('Image failed to load:', image.url);
      
      preview.appendChild(img);
      
      // Add actions
      const actions = document.createElement('div');
      actions.className = 'image-actions';
      
      if (this.options.allowCrop) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'action-btn edit';
        editBtn.title = 'Edit';
        editBtn.innerHTML = '<i class="fas fa-crop"></i>';
        editBtn.onclick = () => window[this.container.id].openCrop(index);
        actions.appendChild(editBtn);
      }
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'action-btn remove';
      removeBtn.title = 'Remove';
      removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
      removeBtn.onclick = () => window[this.container.id].removeImage(index);
      actions.appendChild(removeBtn);
      
      preview.appendChild(actions);
      
      // Add counter
      const counter = document.createElement('div');
      counter.className = 'image-counter';
      counter.textContent = index + 1;
      preview.appendChild(counter);
      
      // Add primary badge
      if (isPrimary) {
        const badge = document.createElement('div');
        badge.className = 'primary-badge';
        badge.textContent = 'Primary';
        preview.appendChild(badge);
      }
      
      box.appendChild(preview);
    } else {
      // Create upload placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'upload-placeholder';
      placeholder.innerHTML = `
        <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        <div class="upload-text">${isPrimary ? 'Primary Image' : `Image ${index + 1}`}</div>
        <div class="upload-subtext">Click to upload${isPrimary ? ' (Required)' : ' (Optional)'}</div>
      `;
      box.appendChild(placeholder);
    }
    
    // Add file input
    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'image-input';
    input.id = `imageInput${index}`;
    input.accept = this.options.acceptedTypes.join(',');
    input.setAttribute('data-index', index);
    input.style.display = 'none';
    box.appendChild(input);
    
    return box;
  }

  // Updated updateDisplay using DOM creation
  updateDisplayDirect() {
    console.log("updateDisplayDirect called, current images:", this.images);
    const grid = document.getElementById('imageGrid');
    if (!grid) {
      console.error("imageGrid not found!");
      return;
    }
    
    // Clear existing content
    grid.innerHTML = '';
    
    // Create boxes directly
    for (let i = 0; i < this.options.maxImages; i++) {
      const image = this.images[i];
      console.log(`Creating box ${i + 1}, has image:`, !!image);
      const box = this.createImageBox(image, i);
      grid.appendChild(box);
    }
    
    // Re-bind events after DOM update
    this.bindEvents();
    
    console.log("Direct DOM update completed");
    
    // Verify the update
    setTimeout(() => {
      const boxes = grid.querySelectorAll('.image-upload-box');
      console.log("Verification - boxes found:", boxes.length);
      boxes.forEach((box, index) => {
        const hasImage = box.classList.contains('has-image');
        const preview = box.querySelector('.image-preview');
        console.log(`Box ${index + 1}:`, {
          hasImageClass: hasImage,
          children: box.children.length,
          hasPreview: !!preview,
          previewVisible: preview ? window.getComputedStyle(preview).display !== 'none' : false
        });
      });
    }, 50);
  }
}

// Global instance for easy access
window.ImageSelector = ImageSelector;