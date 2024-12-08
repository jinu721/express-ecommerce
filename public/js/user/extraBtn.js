const addTocartBtn = document.querySelectorAll(".addTocartBtn");
const addToWishlistBtn = document.querySelectorAll(".addToWishlistBtn");
addTocartBtn.forEach((elem) => {
  elem.addEventListener("click", (e) => {
    addToCartFromList(e);
  });
});
addToWishlistBtn.forEach((elem) => {
  elem.addEventListener("click", (e) => {
    addToWishlist(e);
  });
});

async function addToWishlist(e) {
const productId = e.target.getAttribute("data-id");
const size = e.target.getAttribute("data-size");
const color = e.target.getAttribute("data-color");
  try {
    const response = await fetch(`/add-to-wislist/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ size: size, color: color }),
    });
    const data = await response.json();
    if (data.val) {
    //   console.log("Added to wishlist");
      Swal.fire({
        title: "Added!",
        text: "Item added to wishlist.",
        icon: "success",
      });
    //   wishlistButton.setAttribute("data-wishlist-item-id", data.wishlistItemId);
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: data.msg,
      });
    }
  } catch (err) {
    console.log(err);
  }
}

async function addToCartFromList(e) {
  const price = document.querySelector(".offerPriceProduct").textContent;
  const productId = e.target.getAttribute("data-id");
  const size = e.target.getAttribute("data-size");
  const color = e.target.getAttribute("data-color");
  try {
    const response = await fetch("/add-to-cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        price: parseInt(price.replace("₹", "")),
        quantity: 1,
        size: size,
        color: color,
        isBuyNow: false,
      }),
    });
    const data = await response.json();
    if (!data.val) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: data.msg,
      });
    } else {
      console.log("Added to cart successfully");
        Swal.fire({
          title: "Good job!",
          text: data.msg,
          icon: "success",
        });
    }
  } catch (err) {
    console.log(err);
  }
}
