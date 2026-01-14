
let imageSelector;

document.addEventListener('DOMContentLoaded', () => {
    const brandModalElement = document.getElementById('brandModal');
    const brandModal = new bootstrap.Modal(brandModalElement);
    const brandForm = document.getElementById('brandForm');
    const saveBtn = document.getElementById('saveBrandBtn');

    // Initialize ImageSelector
    imageSelector = new ImageSelector('imageSelector', {
        maxImages: 1,
        minImages: 1,
        allowCrop: true,
        aspectRatio: 1
    });
    window.imageSelector = imageSelector;

    window.openAddBrandModal = () => {
        document.getElementById('brandId').value = '';
        brandForm.reset();
        imageSelector.clear();
        document.getElementById('brandModalLabel').innerText = 'Add New Brand';
        brandModal.show();
    };

    window.openEditBrandModal = (id, name, logo, isActive) => {
        document.getElementById('brandId').value = id;
        document.getElementById('brandName').value = name;
        document.getElementById('brandStatus').value = isActive;

        imageSelector.clear();
        if (logo && logo !== 'undefined' && logo !== '/undefined' && logo !== '/') {
            // Load existing image
            const formattedLogo = logo.startsWith('/') ? logo : '/' + logo;
            imageSelector.loadImages([formattedLogo]);
        }

        document.getElementById('brandModalLabel').innerText = 'Edit Brand';
        brandModal.show();
    };

    brandForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('brandId').value;
        const name = document.getElementById('brandName').value.trim();
        const isActive = document.getElementById('brandStatus').value;
        const isEdit = !!id;

        // Validation
        if (!name) {
            showError('brandName', 'Brand name is required');
            return;
        }

        // Validate images
        if (!imageSelector.validate()) {
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('isActive', isActive);

        // Handle image from ImageSelector
        const images = imageSelector.images.filter(img => img !== null);
        if (images.length > 0 && images[0].file) {
            formData.append('logo', images[0].file);
        }

        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        try {
            const response = await fetch(isEdit ? `/admin/brands/${id}` : '/admin/brands', {
                method: isEdit ? 'PUT' : 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success || result.val) {
                Toast.success('Success', result.message || 'Brand saved successfully');
                setTimeout(() => location.reload(), 1500);
            } else {
                throw new Error(result.message || 'Unknown error');
            }

        } catch (error) {
            console.error(error);
            Toast.error('Error', error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Brand';
        }
    });

    window.toggleBrandStatus = async (id) => {
        try {
            const response = await fetch(`/admin/brands/${id}/toggle`, { method: 'POST' });
            const result = await response.json();

            if (result.success) {
                location.reload();
            } else {
                Toast.error('Error', result.message);
            }
        } catch (error) {
            console.error(error);
            Toast.error('Error', 'Failed to toggle status');
        }
    };

    window.deleteBrand = async (id, name) => {
        const confirmed = await Toast.confirm({
            title: 'Delete Brand',
            message: `You are about to delete ${name}. This cannot be undone!`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'error'
        });

        if (confirmed) {
            try {
                const response = await fetch(`/admin/brands/${id}`, { method: 'DELETE' });
                const json = await response.json();

                if (json.success) {
                    Toast.success('Deleted', 'Brand has been deleted.');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    Toast.error('Error', json.message);
                }
            } catch (error) {
                console.error(error);
                Toast.error('Error', 'Failed to delete brand');
            }
        }
    };

    function showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        field.classList.add('is-invalid');
        const feedback = document.getElementById(`${fieldId}Error`);
        if (feedback) {
            feedback.innerText = message;
            field.addEventListener('input', () => {
                field.classList.remove('is-invalid');
                feedback.innerText = '';
            }, { once: true });
        } else {
            Toast.error('Validation Error', message);
        }
    }
});
