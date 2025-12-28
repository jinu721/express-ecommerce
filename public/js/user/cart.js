const deleteIconCart = document.querySelectorAll('.deleteIconCart');

deleteIconCart.forEach(elem => {
    elem.addEventListener('click',(e) => {
      const cartItemId = e.target.getAttribute('data-id');
      showDeleteConfirmation(cartItemId);
    });
});

// Create confirmation modal for cart delete
function showDeleteConfirmation(cartItemId) {
  // Create modal HTML
  const modalHTML = `
    <div class="modal fade" id="deleteCartModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Confirm Delete</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to remove this item from your cart?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Remove Item</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('deleteCartModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('deleteCartModal'));
  modal.show();
  
  // Handle confirm delete
  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.textContent;
    
    // Show loading state
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Removing...';
    
    try {
      const response = await fetch(`/delete-from-cart/${cartItemId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!data.val) {
        showToast(data.msg, 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
      } else {
        showToast('Item removed from cart', 'success');
        modal.hide();
        setTimeout(() => {
          window.location.href = '/cart';
        }, 1000);
      }
    } catch (err) {
      console.error('Delete cart item error:', err);
      showToast('Failed to remove item', 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = originalText;
    }
  });
  
  // Clean up modal when hidden
  document.getElementById('deleteCartModal').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}
// function renderCart(cart, products) {
//     const cartContainer = document.querySelector('.cart.section--lg.container');

//     if (cart.items.length === 0) {
//         cartContainer.innerHTML = `
//           <section class="cartEmpty">
//             <p>No items in cart</p>
//           </section>
//         `;
//     } else {
//         let cartItemsHTML = cart.items.map(item => {
//             const product = products.find(p => p._id === item.productId.toString());
//             return `
//               <tr>
//                 <td><a href="/details/${product._id}"><img src="${product.images[0]}" alt="" class="table__img" /></a></td>
//                 <td>
//                   <h3 class="table__title">${product.name}</h3>
//                   <p class="table__description">${product.description.slice(0, 40)}...</p>
//                 </td>
//                 <td><span class="table__price">${product.price}</span></td>
//                 <td><input type="number" value="${item.quantity}" class="quantity" /></td>
//                 <td><span class="Total">${item.total}</span></td>
//                 <td><i data-id="${item._id}" class="fi fi-rs-trash table__trash deleteIconCart"></i></td>
//               </tr>
//             `;
//         }).join("");

//         cartContainer.innerHTML = `
//           <section class="cart section--lg container">
//             <div class="table__container">
//               <table class="table">
//                 <thead>
//                   <tr>
//                     <th>Image</th>
//                     <th>Name</th>
//                     <th>Price</th>
//                     <th>Quantity</th>
//                     <th>Subtotal</th>
//                     <th>Delete</th>
//                   </tr>
//                 </thead>
//                 <tbody>${cartItemsHTML}</tbody>
//               </table>
//             </div>

//             <div class="cart__actions">
//               <a href="#" class="btn flex btn__md">
//                 <i class="fi-rs-shuffle"></i> Update Cart
//               </a>
//               <a href="#" class="btn flex btn__md">
//                 <i class="fi-rs-shopping-bag"></i> Continue Shopping
//               </a>
//             </div>

//             <div class="divider">
//               <i class="fi fi-rs-fingerprint"></i>
//             </div>

//             <div class="cart__group grid">
//               <!-- Shipping and Coupon forms here -->
//               <div class="cart__total">
//                 <h3 class="section__title">Cart Totals</h3>
//                 <table class="cart__total-table">
//                     <tr>
//                       <td><span class="cart__total-title">Cart Subtotal</span></td>
//                       <td><span class="cart__total-price">$${cart.cartTotal}</span></td>
//                     </tr>
//                     <tr>
//                       <td><span class="cart__total-title">Shipping</span></td>
//                       <td><span class="cart__total-price">$10.00</span></td>
//                     </tr>
//                     <tr>
//                       <td><span class="cart__total-title">Total</span></td>
//                       <td><span class="cart__total-price">$${cart.cartTotal + 10.00}</span></td>
//                     </tr>
//                 </table>
//                 <a href="checkout.html" class="btn flex btn--md">
//                   <i class="fi fi-rs-box-alt"></i> Proceed To Checkout
//                 </a>
//               </div>
//             </div>
//           </section>
//         `;
//         document.querySelectorAll('.deleteIconCart').forEach(newElem => {
//             newElem.addEventListener('click', async (e) => {
//                 const cartItemId = e.target.getAttribute('data-id');
//                 try {
//                     const response = await fetch(`/delete-from-cart/${cartItemId}`, {
//                         method: 'DELETE',
//                     });
//                     const data = await response.json();

//                     if (data.val) {
//                         renderCart(data.cart, data.products);
//                     } else {
//                         Swal.fire({
//                             icon: "error",
//                             title: "Oops...",
//                             text: data.msg,
//                         });
//                     }
//                 } catch (err) {
//                     console.log(err);
//                 }
//             });
//         });
//     }
// }
document.querySelectorAll('.quantity').forEach(input => {
  input.addEventListener('change', async (e) => {
    const newQuantity = parseInt(e.target.value);
    const itemId = e.target.getAttribute('data-id');
    const previousQuantity = parseInt(e.target.getAttribute('data-prev-quantity') || input.defaultValue);

    // Validate quantity
    if (newQuantity < 1 || isNaN(newQuantity)) {
      e.target.value = previousQuantity;
      showToast('Quantity must be at least 1', 'error');
      return;
    }

    // Show loading state
    e.target.disabled = true;
    const totalElement = document.querySelector(`.Total[data-id="${itemId}"]`);
    const originalTotal = totalElement.textContent;
    totalElement.textContent = 'Updating...';

    try {
      const response = await fetch(`/update-cart-item/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      const data = await response.json();
      console.log('Cart update response:', data);
      
      if (data.val) {
        e.target.setAttribute('data-prev-quantity', newQuantity);
        // Round the values to avoid floating point issues
        totalElement.textContent = Math.round(data.updatedTotal);
        document.querySelectorAll('.cartTotalPrice').forEach(elem => {
          elem.textContent = Math.round(data.cartTotal);
        });
        showToast('Cart updated successfully', 'success');
      } else {
        e.target.value = previousQuantity;
        totalElement.textContent = originalTotal;
        showToast(data.msg, 'error');
      }
    } catch (err) {
      console.error('Cart update error:', err);
      e.target.value = previousQuantity;
      totalElement.textContent = originalTotal;
      showToast('Failed to update cart', 'error');
    } finally {
      e.target.disabled = false;
    }
  });
});

// Toast function for cart
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#17a2b8',
    warning: '#ffc107'
  };
  
  toast.style.backgroundColor = colors[type] || colors.info;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 100);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}



// document.querySelector('.btnProceedToCheckout').addEventListener('click',async ()=>{
//   try{
//     const response = await fetch('/checkout');
//     console.log(response);
//   }catch(err){
//     console.log(err);
//   }
// })

// document.querySelector('.btnProceedToCheckout').addEventListener('click', async () => {
//   const response = await fetch('/checkout');
//   if (resp) {
//       window.location.href = '/checkout';
//       alert('Error: ' + data.msg);
//   }
// });
