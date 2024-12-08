function changeMainImage(clickedImage) {
  const mainImage = document.querySelector("#mainImage");
  const currentMainImageSrc = mainImage.src;
  mainImage.src = clickedImage.src;
  clickedImage.src = currentMainImageSrc;
}

function enableZoom(event) {
  const mainImage = document.getElementById("mainImage");
  const zoomOverlay = document.getElementById("zoomOverlay");

  zoomOverlay.style.display = "block";
  zoomOverlay.style.backgroundImage = `url('${mainImage.src}')`;
  mainImage.addEventListener("mousemove", (event) =>
    moveZoom(event, mainImage, zoomOverlay)
  );
}

function disableZoom() {
  const zoomOverlay = document.getElementById("zoomOverlay");
  zoomOverlay.style.display = "none";
  const mainImage = document.getElementById("mainImage");
  mainImage.removeEventListener("mousemove", moveZoom);
}

function moveZoom(event, mainImage, zoomOverlay) {
  const { left, top, width, height } = mainImage.getBoundingClientRect();
  const x = event.clientX - left;
  const y = event.clientY - top;

  const bgPosX = (x / width) * 100;
  const bgPosY = (y / height) * 100;

  zoomOverlay.style.left = `${event.clientX - 75}px`;
  zoomOverlay.style.top = `${event.clientY - 75}px`;
  zoomOverlay.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
}

// ~~~~~~~~~~~~~~~~~~~ cart add item ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

let selectedSize = "";
let selectedColor = "";

// document.addEventListener('DOMContentLoaded', () => {
const firstColor = document.querySelector(".color__link");
const firstSize = document.querySelector(".size__link");

if (firstColor) {
  firstColor.classList.add("selected");
  selectedColor = firstColor.getAttribute("data-color-name");
  console.log("Default selected color:", selectedColor);
}

if (firstSize) {
  firstSize.classList.add("size-active");
  selectedSize = firstSize.textContent;
  console.log("Default selected size:", selectedSize);
}

// });

function selectColor(event) {
  const colorLinks = document.querySelectorAll(".color__link");
  colorLinks.forEach((link) => link.classList.remove("selected"));
  event.target.classList.add("selected");
  selectedColor = event.target.getAttribute("data-color-name");
  console.log("Selected color:", selectedColor);
}
function selectSize(event) {
  const sizeLinks = document.querySelectorAll(".size__link");
  sizeLinks.forEach((link) => link.classList.remove("size-active"));
  event.target.classList.add("size-active");
  selectedSize = event.target.textContent;
  console.log("Selected size:", selectedSize);
  stockStatus();
}

document.querySelectorAll(".color__link").forEach((colorLink) => {
  colorLink.addEventListener("click", selectColor);
});

document.querySelectorAll(".size__link").forEach((sizeLink) => {
  sizeLink.addEventListener("click", selectSize);
});

const btAddToCart = document.querySelector(".btAddToCart");

btAddToCart.addEventListener("click", async (e) => {
  const quantity = document.querySelector(".quantity").value;
  const price = document.querySelector(".offerPriceProduct").textContent;
  console.log(price);
  const productId = e.target.getAttribute("data-id");
  console.log(quantity);
  console.log(productId);
  try {
    const response = await fetch("/add-to-cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        price: parseInt(price.replace("₹", "")),
        quantity: parseInt(quantity),
        size: selectedSize,
        color: selectedColor,
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
      Swal.fire({
        title: "Good job!",
        text: data.msg,
        icon: "success",
      });
    }
  } catch (err) {
    console.log(err);
  }
});

function validateQuantity(input, stock) {
  let value = parseInt(input.value, 10);
  if (value < 1) {
    input.value = 1;
  } else if (value > stock) {
    input.value = stock;
  } else if (isNaN(value)) {
    input.value = 1;
  }
}

const productId = document.querySelector("#productIdStore").value;
const stockText = document.querySelector(".stockText");

console.log(productId);

async function stockStatus() {
  try {
    const response = await fetch(
      `/product-stock?id=${productId}&size=${selectedSize}`
    );
    const data = await response.json();
    console.log(data);
    stockText.textContent = data.val
      ? `${data.stock.stock} Items in Stock`
      : "Out of stock";
  } catch (err) {
    console.log(err);
  }
}

stockStatus();

const btnBuyNow = document.querySelector(".btn-buynow");

btnBuyNow.addEventListener("click", async (e) => {
  const quantity = document.querySelector(".quantity").value;
  const price = document.querySelector(".offerPriceProduct").textContent;
  console.log(price);
  const productId = e.target.getAttribute("data-id");
  console.log(quantity);
  console.log(productId);
  try {
    const response = await fetch("/add-to-cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        price: parseInt(price.replace("₹", "")),
        quantity: parseInt(quantity),
        size: selectedSize,
        color: selectedColor,
        isBuyNow: true,
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
      window.location.href = "/checkout";
    }
  } catch (err) {
    console.log(err);
  }
});

const wishlistButton = document.getElementById("wishlistButton");
const wishlistIcon = wishlistButton.querySelector(".wishlistIcon");

wishlistButton.addEventListener("click", (e) => {
  const productId = wishlistButton.getAttribute("data-id");
  const isAdding = !wishlistIcon.classList.contains("active");
  if (isAdding) {
    addToWishlist(productId);
  } else {
    const cartItemId = e.target.getAttribute("data-wishlist-item-id");
    removeFromWishlist(cartItemId);
  }
  wishlistIcon.classList.toggle("active");
  wishlistIcon.classList.add("fly");
  wishlistIcon.addEventListener("animationend", () => {
    wishlistIcon.classList.remove("fly");
  });
});

async function addToWishlist(productId) {
  try {
    const response = await fetch(`/add-to-wislist/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ size: selectedSize, color: selectedColor }),
    });
    const data = await response.json();
    if (data.val) {
      console.log("Added to wishlist");
      Swal.fire({
        title: 'Added!',
        text: 'Item added to wishlist.',
        icon: 'success',
      });
      wishlistButton.setAttribute("data-wishlist-item-id", data.wishlistItemId);
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
async function removeFromWishlist(cartItemId) {
  try {
    const response = await fetch(`/remove-from-wishlist/${cartItemId}`, {
      method: "DELETE",
    });
    console.log(response);
    const data = await response.json();
    if (data.val) {
      console.log("removed form wishlist");
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

async function fetchReviews() {
  try {
    const response = await fetch(`/product/reviews/${productId}`);
    const data = await response.json();

    if (!data.val) {
      console.log(data.msg);
    } else {
      reviewShowSection.innerHTML = ''; 
      data.reviews.forEach(review => {
        const reviewItem = document.createElement('div');
        const reviewDate = new Date(review.reviewDate);
        const formattedDate = reviewDate.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        });

        let stars = '';
        for (let i = 1; i <= 5; i++) {
          stars += i <= review.rating
            ? '<i class="fi fi-rs-star reviewItemActive"></i>'
            : '<i class="fi fi-rs-star"></i>';
        }

        const deleteIcon = review.user === data.currentUserId
          ? `<i class="fas fa-trash reviewDeleteIcon" data-review-id="${review._id}" title="Delete Review"></i>`
          : '';

        reviewItem.innerHTML = `
          <div class="review__single">
            <div class="reviewProfile">
              <img src="/img/icons/image.png" alt="Profile" class="review__img" />
              <h4 class="review__title">${review.username || 'Anonymous'}</h4>
            </div>
            <div class="review__data">
              <div class="review__rating">
                ${stars}
              </div>
              <p class="review__description">
                ${review.comment || 'No comment provided.'}
              </p>
              <span class="review__date">${formattedDate}</span>
              ${deleteIcon} 
            </div>
          </div>
        `;

        reviewShowSection.appendChild(reviewItem);
      });

      document.querySelectorAll('.reviewDeleteIcon').forEach(icon => {
        icon.addEventListener('click', async (event) => {
          const reviewId = event.target.getAttribute('data-review-id');
          await deleteReview(reviewId);
        });
      });
    }
  } catch (err) {
    console.log(err);
  }
}

async function deleteReview(reviewId) {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: 'Once deleted, you will not be able to recover this review!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/product/review/delete/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.val) {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: data.msg,
        });
      } else {
        Swal.fire({
          title: 'Deleted!',
          text: 'Your review has been deleted.',
          icon: 'success',
        });
        fetchReviews();
      }
    } catch (err) {
      console.log(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while deleting the review.',
      });
    }
  }
}


fetchReviews();

const form = document.querySelector(".review__form form");
const submitButtonReview = document.querySelector(".btnSubmitReview");
const commentInput = document.querySelector(".reviewTextarea");
const stars = document.querySelectorAll(".rate__product i");
const reviewShowSection = document.querySelector(".reviewShowSection");

let selectedRating = 0;

stars.forEach((star, index) => {
  star.addEventListener("click", () => {
    selectedRating = index + 1;
    stars.forEach((s, i) => {
      s.classList.toggle("active", i < selectedRating);
    });
  });
});

submitButtonReview.addEventListener("click", (event) => {
  event.preventDefault();
  const comment = commentInput.value.trim();
  if (!selectedRating) {
    Swal.fire({
      icon: "warning",
      title: "Rating Required",
      text: "Please select a star rating!",
    });
    return;
  }
  if (!comment) {
    Swal.fire({
      icon: "warning",
      title: "Comment Required",
      text: "Please write a comment!",
    });
    return;
  }
  async function addReview() {
    try {
      const response = await fetch(`/product/review/add/${productId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment,
          rating: selectedRating,
        }),
      });
      const data = await response.json();
      console.log(data);
      if (!data.val) {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: data.msg,
        });
      } else {
        Swal.fire({
          title: "Review Submitted!",
          text: "Your review has been added successfully.",
          icon: "success",
        });
        fetchReviews();
        form.reset();
      }
    } catch (err) {
      console.log(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred while submitting your review. Please try again later.",
      });
    }
  }
  addReview();
});
