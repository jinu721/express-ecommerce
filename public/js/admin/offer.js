document.addEventListener('DOMContentLoaded', () => {
    const offerModal = new bootstrap.Modal(document.getElementById('offerModal'));
    const offerForm = document.getElementById('offerForm');
    const searchResults = document.getElementById('searchResults');
    const selectedItemsContainer = document.getElementById('selectedItemsContainer');
    const selectedIdsInputs = document.getElementById('selectedIdsInputs');
    
    let selectedItems = []; // Array of { id, name }

    window.openAddOfferModal = () => {
        document.getElementById('offerId').value = '';
        offerForm.reset();
        selectedItems = [];
        renderSelectedItems();
        handleOfferTypeChange();
        document.getElementById('offerModalLabel').innerText = 'Create New Offer';
        offerModal.show();
    };

    window.handleOfferTypeChange = () => {
        const type = document.getElementById('offerType').value;
        const section = document.getElementById('selectionSection');
        const label = document.getElementById('selectionLabel');
        searchResults.style.display = 'none';

        if (type === 'REFERRAL') {
            section.style.display = 'none';
        } else {
            section.style.display = 'block';
            label.innerText = `Search Applicable ${type.charAt(0) + type.slice(1).toLowerCase()}s`;
        }
    };

    window.searchItems = async () => {
        const type = document.getElementById('offerType').value;
        const query = document.getElementById('searchItemInput').value.trim();
        
        if (!query) return;

        searchResults.innerHTML = '<div class="list-group-item">Searching...</div>';
        searchResults.style.display = 'block';

        try {
            let url = '';
            if (type === 'PRODUCT') url = `/admin/searchProducts?key=${query}`;
            else if (type === 'CATEGORY') url = `/admin/searchCategories?key=${query}`;
            else if (type === 'BRAND') url = `/admin/brands?search=${query}`; // Uses the JSON response

            const response = await fetch(url + ((type === 'BRAND') ? '' : ''), {
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();

            searchResults.innerHTML = '';
            
            let items = [];
            if (type === 'PRODUCT') items = data.products || [];
            else if (type === 'CATEGORY') items = data.categories || [];
            else if (type === 'BRAND') items = data.brands || [];

            if (items.length === 0) {
                searchResults.innerHTML = '<div class="list-group-item text-muted">No results found</div>';
                return;
            }

            items.forEach(item => {
                const itemDiv = document.createElement('a');
                itemDiv.className = 'list-group-item list-group-item-action';
                itemDiv.innerText = item.name;
                itemDiv.style.cursor = 'pointer';
                itemDiv.onclick = () => {
                    addItem(item._id, item.name);
                    searchResults.style.display = 'none';
                    document.getElementById('searchItemInput').value = '';
                };
                searchResults.appendChild(itemDiv);
            });

        } catch (error) {
            console.error(error);
            searchResults.innerHTML = '<div class="list-group-item text-danger">Error fetching results</div>';
        }
    };

    function addItem(id, name) {
        if (selectedItems.some(item => item.id === id)) return;
        selectedItems.push({ id, name });
        renderSelectedItems();
    }

    window.removeItem = (id) => {
        selectedItems = selectedItems.filter(item => item.id !== id);
        renderSelectedItems();
    };

    function renderSelectedItems() {
        selectedItemsContainer.innerHTML = '';
        selectedIdsInputs.innerHTML = '';
        const type = document.getElementById('offerType').value;

        selectedItems.forEach(item => {
            // Badge
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary p-2 d-flex align-items-center gap-2';
            badge.innerHTML = `${item.name} <i class="fas fa-times" onclick="removeItem('${item.id}')" style="cursor: pointer;"></i>`;
            selectedItemsContainer.appendChild(badge);

            // Hidden Input (Depends on Type)
            const input = document.createElement('input');
            input.type = 'hidden';
            if (type === 'PRODUCT') input.name = 'applicableProducts[]';
            else if (type === 'CATEGORY') input.name = 'applicableCategories[]';
            else if (type === 'BRAND') input.name = 'applicableBrands[]';
            input.value = item.id;
            selectedIdsInputs.appendChild(input);
        });
    }

    offerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('offerId').value;
        const type = document.getElementById('offerType').value;
        const isEdit = !!id;

        // Validation
        if (type !== 'REFERRAL' && selectedItems.length === 0) {
            document.getElementById('selectionError').innerText = 'Please select at least one item.';
            return;
        } else {
            document.getElementById('selectionError').innerText = '';
        }

        const formData = new FormData(offerForm);
        const data = Object.fromEntries(formData.entries());

        // Handle Array inputs manually
        if (type === 'PRODUCT') data.applicableProducts = selectedItems.map(i => i.id);
        else if (type === 'CATEGORY') data.applicableCategories = selectedItems.map(i => i.id);
        else if (type === 'BRAND') data.applicableBrands = selectedItems.map(i => i.id);

        try {
            const url = isEdit ? `/admin/offers/${id}` : '/admin/offers';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success || result.offer) { 
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: result.message || 'Offer saved successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                throw new Error(result.message || 'Unknown error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        }
    });

    window.loadAndEditOffer = async (id) => {
        try {
            const response = await fetch(`/admin/offers/${id}`);
            const result = await response.json();
            
            if (result.success) {
                const offer = result.offer;
                document.getElementById('offerId').value = offer._id;
                document.getElementById('offerName').value = offer.name;
                document.getElementById('offerType').value = offer.type;
                handleOfferTypeChange(); // Reset UI based on type
                
                document.getElementById('discountType').value = offer.discountType;
                document.getElementById('discountValue').value = offer.discountValue;
                document.getElementById('minPurchase').value = offer.minPurchase || 0;
                document.getElementById('maxDiscount').value = offer.maxDiscount || '';
                document.getElementById('usageLimit').value = offer.usageLimit || 0;
                
                // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
                document.getElementById('startDate').value = new Date(offer.startDate).toISOString().slice(0, 16);
                document.getElementById('endDate').value = new Date(offer.endDate).toISOString().slice(0, 16);
                
                document.getElementById('isActive').checked = offer.isActive;

                // Load selected items
                selectedItems = [];
                let items = [];
                if (offer.type === 'PRODUCT') items = offer.applicableProducts;
                else if (offer.type === 'CATEGORY') items = offer.applicableCategories;
                else if (offer.type === 'BRAND') items = offer.applicableBrands;

                items.forEach(item => {
                    selectedItems.push({ id: item._id, name: item.name });
                });
                renderSelectedItems();

                document.getElementById('offerModalLabel').innerText = 'Edit Offer';
                offerModal.show();
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to load offer details', 'error');
        }
    };

    window.toggleOfferStatus = async (id) => {
        try {
            const response = await fetch(`/admin/offers/${id}/toggle`, { method: 'POST' });
            const result = await response.json();
            if (result.success) location.reload();
            else Swal.fire('Error', result.message, 'error');
        } catch (error) {
            Swal.fire('Error', 'Failed to toggle status', 'error');
        }
    };

    window.deleteOffer = async (id, name) => {
        const result = await Swal.fire({
            title: 'Delete Offer?',
            text: `Remove ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Delete'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`/admin/offers/${id}`, { method: 'DELETE' });
                const json = await response.json();
                if (json.success) location.reload();
                else Swal.fire('Error', json.message, 'error');
            } catch (error) {
                Swal.fire('Error', 'Failed to delete offer', 'error');
            }
        }
    };
});
