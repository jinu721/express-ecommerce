document.addEventListener('DOMContentLoaded', () => {
    const brandModal = new bootstrap.Modal(document.getElementById('brandModal'));
    const brandForm = document.getElementById('brandForm');
    const logoPreview = document.getElementById('logoPreview');
    const saveBtn = document.getElementById('saveBrandBtn');

    window.openAddBrandModal = () => {
        document.getElementById('brandId').value = '';
        brandForm.reset();
        logoPreview.style.display = 'none';
        logoPreview.src = '';
        document.getElementById('brandModalLabel').innerText = 'Add New Brand';
        brandModal.show();
    };

    window.openEditBrandModal = (id, name, logo, isActive) => {
        document.getElementById('brandId').value = id;
        document.getElementById('brandName').value = name;
        document.getElementById('brandStatus').value = isActive;
        
        if (logo && logo !== 'undefined' && logo !== '/undefined') {
            logoPreview.src = logo;
            logoPreview.style.display = 'block';
        } else {
            logoPreview.style.display = 'none';
        }

        document.getElementById('brandModalLabel').innerText = 'Edit Brand';
        brandModal.show();
    };

    window.previewBrandLogo = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                logoPreview.src = e.target.result;
                logoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    brandForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('brandId').value;
        const name = document.getElementById('brandName').value.trim();
        const logo = document.getElementById('brandLogo').files[0];
        const isActive = document.getElementById('brandStatus').value;
        const isEdit = !!id;

        // Validation
        if (!name) {
            showError('brandName', 'Brand name is required');
            return;
        }
        if (!isEdit && !logo) {
            showError('brandLogo', 'Logo is required for new brands');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('isActive', isActive);
        if (logo) formData.append('logo', logo);

        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';

        try {
            const url = isEdit ? `/admin/brands/${id}?_method=PUT` : '/admin/brands';
            // Note: Since we use FormData, we don't set Content-Type header manually
            // But for PUT with multer, standard method override or direct PUT works.
            // Using standard fetch logic:

            const response = await fetch(isEdit ? `/admin/brands/${id}` : '/admin/brands', {
                method: isEdit ? 'PUT' : 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success || result.val) { // handle inconsistent API responses (standardize later)
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
        feedback.innerText = message;
        field.addEventListener('input', () => {
            field.classList.remove('is-invalid');
            feedback.innerText = '';
        }, { once: true });
    }
});
