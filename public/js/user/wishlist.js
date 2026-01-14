const btnAddToCart = document.querySelectorAll('.btnAddToCart');

btnAddToCart.forEach(elem => {
    elem.addEventListener('click', async (e) => {
        e.preventDefault();
        const productId = e.target.getAttribute('data-productId');
        const wishlistItemId = e.target.getAttribute('data-wishlistItemId');
        const isAvailable = e.target.getAttribute('data-available') === 'true';

        if (!isAvailable) {
            if (typeof Toast !== 'undefined') {
                Toast.error('Unavailable', 'This product is currently unavailable and cannot be added to cart.');
            } else {
                alert('This product is currently unavailable.');
            }
            return;
        }
        // Check if Toast is available
        if (typeof Toast === 'undefined') {
            console.error('Toast is not defined');
            // Fallback to direct add to cart
            directAddToCart(productId, wishlistItemId);
            return;
        }

        // Open variant selection popup
        if (window.variantPopup) {
            window.variantPopup.open(productId, {
                onConfirm: async (selection) => {
                    try {
                        const response = await fetch('/wishlist/add-to-cart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                productId: productId,
                                wishlistItemId: wishlistItemId,
                                variantId: selection.variant?._id,
                                quantity: selection.quantity,
                                attributes: selection.attributes
                            })
                        });

                        const data = await response.json();
                        if (data.val) {
                            Toast.success('Added to Cart', 'Item moved to cart successfully');
                            setTimeout(() => {
                                window.location.href = '/wishlist';
                            }, 1500);
                        } else {
                            Toast.error('Error', data.msg);
                        }
                    } catch (err) {
                        console.log(err);
                        Toast.error('Error', 'Something went wrong');
                    }
                }
            });
        } else {
            // Fallback to direct add to cart without variant selection
            directAddToCart(productId, wishlistItemId);
        }
    });
});

async function directAddToCart(productId, wishlistItemId) {
    try {
        const response = await fetch('/wishlist/add-to-cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: productId,
                wishlistItemId: wishlistItemId,
            })
        });
        const data = await response.json();
        if (!data.val) {
            // Check if variant selection is required
            if (data.requiresVariantSelection && window.variantPopup) {
                console.log('Opening variant popup for wishlist item');
                window.variantPopup.open(productId, {
                    onConfirm: async (selection) => {
                        try {
                            const response = await fetch('/wishlist/add-to-cart', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    productId: productId,
                                    wishlistItemId: wishlistItemId,
                                    variantId: selection.variant?._id,
                                    quantity: selection.quantity,
                                    attributes: selection.attributes
                                })
                            });

                            const data = await response.json();
                            if (data.val) {
                                Toast.success('Added to Cart', 'Item moved to cart successfully');
                                setTimeout(() => {
                                    window.location.href = '/wishlist';
                                }, 1500);
                            } else {
                                Toast.error('Error', data.msg);
                            }
                        } catch (err) {
                            console.log(err);
                            Toast.error('Error', 'Something went wrong');
                        }
                    }
                });
                return; // Don't show error toast, popup is handling it
            }

            if (typeof Toast !== 'undefined') {
                Toast.error('Error', data.msg);
            } else {
                alert('Error: ' + data.msg);
            }
        } else {
            if (typeof Toast !== 'undefined') {
                Toast.success('Added to Cart', 'Item moved to cart successfully');
            } else {
                alert('Item moved to cart successfully');
            }
            setTimeout(() => {
                window.location.href = '/wishlist';
            }, 1500);
        }
    } catch (err) {
        console.log(err);
        if (typeof Toast !== 'undefined') {
            Toast.error('Error', 'Something went wrong');
        } else {
            alert('Error: Something went wrong');
        }
    }
}

const btnDeleteWishlist = document.querySelectorAll('.btnDeleteWishlist');

btnDeleteWishlist.forEach(elem => {
    elem.addEventListener('click', async (e) => {
        // Check if Toast is available
        if (typeof Toast === 'undefined') {
            console.error('Toast is not defined');
            if (confirm('Are you sure you want to remove this item from your wishlist?')) {
                deleteWishlistItem(e);
            }
            return;
        }

        const confirmed = await Toast.confirm({
            title: 'Remove from Wishlist',
            message: 'Are you sure you want to remove this item from your wishlist?',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (confirmed) {
            deleteWishlistItem(e);
        }
    });
});

async function deleteWishlistItem(e) {
    const cartItemId = e.target.getAttribute('data-id');
    const wishlistItemId = e.target.getAttribute('data-wishlistItemId');
    console.log(cartItemId);
    console.log(wishlistItemId);
    try {
        const response = await fetch(`/remove-from-wishlist/${wishlistItemId}`, {
            method: 'DELETE',
        });
        console.log(response);
        const data = await response.json();
        if (data.val) {
            console.log('removed form wishlist');
            if (typeof Toast !== 'undefined') {
                Toast.success('Removed', 'Item removed from wishlist');
            }
            setTimeout(() => {
                window.location.href = "/wishlist";
            }, 1500);
        } else {
            if (typeof Toast !== 'undefined') {
                Toast.error('Error', data.msg);
            } else {
                alert('Error: ' + data.msg);
            }
        }
    } catch (err) {
        console.log(err);
        if (typeof Toast !== 'undefined') {
            Toast.error('Error', 'Something went wrong');
        } else {
            alert('Error: Something went wrong');
        }
    }
}



