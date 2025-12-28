const btnAddToCart = document.querySelectorAll('.btnAddToCart');

btnAddToCart.forEach(elem => {
    elem.addEventListener('click',async (e)=>{
        const productid = e.target.getAttribute('data-productId'); 
        const wishlistItemId = e.target.getAttribute('data-wishlistItemId'); 
        try{
            console.log(wishlistItemId)
            console.log(productid)
            const response = await fetch('/wishlist/add-to-cart',{
                method:'POST',
                headers:{
                    'Content-Type': 'application/json',
                },
                body:JSON.stringify({
                    productId:productid,
                    wishlistItemId:wishlistItemId,
                })
            });
            const data = await response.json();
            if(!data.val){
                Toast.error('Error', data.msg);
            }else{
                Toast.success('Added to Cart', 'Item moved to cart successfully');
                setTimeout(() => {
                    window.location.href = '/wishlist';
                }, 1500);
            }
        }catch(err){
            console.log(err);
            Toast.error('Error', 'Something went wrong');
        }
    })
});

const btnDeleteWishlist = document.querySelectorAll('.btnDeleteWishlist');

btnDeleteWishlist.forEach(elem => {
    elem.addEventListener('click', async (e) => {
        const confirmed = await Toast.confirm({
            title: 'Remove from Wishlist',
            message: 'Are you sure you want to remove this item from your wishlist?',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (confirmed) {
            const cartItemId = e.target.getAttribute('data-id');
            const wishlistItemId = e.target.getAttribute('data-wishlistItemId'); 
            console.log(cartItemId);
            console.log(wishlistItemId);
            try{
                const response = await fetch(`/remove-from-wishlist/${wishlistItemId}`,{
                    method:'DELETE',
                });
                console.log(response);
                const data = await response.json();
                if (data.val) {
                    console.log('removed form wishlist');
                    Toast.success('Removed', 'Item removed from wishlist');
                    setTimeout(() => {
                        window.location.href = "/wishlist";
                    }, 1500);
                } else {
                    Toast.error('Error', data.msg);
                }
            }catch(err){
                console.log(err);
                Toast.error('Error', 'Something went wrong');
            }
        }
    })
});



