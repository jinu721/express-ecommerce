const deleteIconCart = document.querySelectorAll('.deleteIconCart');

deleteIconCart.forEach(elem => {
    elem.addEventListener('click',(e) => {
      Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
      }).then(async (result) => {
        if (result.isConfirmed) {
          const cartItemId = e.target.getAttribute('data-id');
          try {
              const response = await fetch(`/delete-from-cart/${cartItemId}`, {
                  method: 'DELETE',
              });
              const data = await response.json();
  
              if (!data.val) {
                  Swal.fire({
                      icon: "error",
                      title: "Oops...",
                      text: data.msg,
                  });
              } else {
                Swal.fire({
                  title: "Deleted!",
                  text: "Item has been deleted.",
                  icon: "success"
                }).then(()=>{
                  window.location.href = '/cart';
                });
              }
          } catch (err) {
              console.log(err);
          }
        }
      });
    });
});
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
    const newQuantity = e.target.value;
    const itemId = e.target.getAttribute('data-id');
    const previousQuantity = e.target.getAttribute('data-prev-quantity') || input.defaultValue;

    try {
      const response = await fetch(`/update-cart-item/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });
      const data = await response.json();
      console.log(data)
      if (data.val) {
        e.target.setAttribute('data-prev-quantity', newQuantity);
        document.querySelector(`.Total[data-id="${itemId}"]`).textContent = data.updatedTotal;
        document.querySelectorAll('.cartTotalPrice').forEach(elem => {
          elem.textContent = data.cartTotal;
        });
      } else {
        e.target.value = previousQuantity;
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: data.msg,
        });
      }
    } catch (err) {
      console.log(err);
      e.target.value = previousQuantity;
    }
  });
});



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
