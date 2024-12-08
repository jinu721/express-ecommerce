// const filterLinks = document.querySelectorAll(".filter-link");

// let selectedFilters = {
//   sortBy: "Default",
//   price: "All",
//   category: "All",
//   name: "All",
// };

// filterLinks.forEach((link) => {
//   link.addEventListener("click", (event) => {
//     event.preventDefault();
//     const filterType = link
//       .closest(".filter-col2")
//       .querySelector(".mtext-102")
//       .textContent.trim()
//       .toLowerCase();
//     if (link.classList.contains("filter-link-active")) {
//       return;
//     }
//     const otherLinks = link
//       .closest(".filter-col2")
//       .querySelectorAll(".filter-link");
//     otherLinks.forEach((otherLink) => {
//       otherLink.classList.remove("filter-link-active");
//     });
//     link.classList.add("filter-link-active");
//     const filterValue = link.textContent.trim();
//     if (filterType === "sort by") {
//       selectedFilters.sortBy = filterValue;
//     } else if (filterType === "price") {
//       selectedFilters.price = filterValue;
//     } else if (filterType === "category") {
//       selectedFilters.category = filterValue;
//     } else if (filterType === "by name") {
//       selectedFilters.name = filterValue;
//     }
//     updateFilters();
//   });
// });

// async function updateFilters() {
//   const queryParams = new URLSearchParams(selectedFilters).toString();
//   try{
//     const response = await fetch('/')
//   }catch(err){
//     console.log(er);
//   }
// }

const filterLinks = document.querySelectorAll(".filter-link");
const sortSelect = document.querySelector(".sort-select");

let selectedFilters = {
  sortBy: "Default",
  price: [],
  category: [],
  name: "All",
};

filterLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const filterValue = link.textContent.trim();
    const filterType = link
      .closest(".filter-col2")
      .querySelector(".mtext-102")
      .textContent.trim()
      .toLowerCase();
    const otherLinks = link
      .closest(".filter-col2")
      .querySelectorAll(".filter-link");
    otherLinks.forEach((otherLink) => {
      otherLink.classList.remove("filter-link-active");
    });
    link.classList.add("filter-link-active");
    if (filterType === "sort by") {
      selectedFilters.sortBy = filterValue;
    } else if (filterType === "price") {
      selectedFilters.price = [filterValue];
    } else if (filterType === "category") {
      selectedFilters.category = [filterValue];
    } else if (filterType === "by name") {
      selectedFilters.name = filterValue === "All" ? "All" : filterValue;
    }
    updateFilters();
  });
});

if (sortSelect) {
  sortSelect.addEventListener("change", (event) => {
    selectedFilters.sortBy = event.target.value;
    updateFilters();
  });
}

async function updateFilters() {
  const queryParams = new URLSearchParams(selectedFilters).toString();
  try {
    const response = await fetch(`/shop?${queryParams}&api=true`);
    const data = await response.json();
    displayProducts(data.products);
  } catch (err) {
    console.log(err);
  }
}

function displayProducts(products) {
  const productContainer = document.querySelector(".products__container");
  productContainer.innerHTML = "";

  console.log(products);

  if(products.length===0){
    const productItem = document.createElement("div");
    productItem.classList.add("productnotFound");
    productItem.innerHTML = `
         <div>
            <p>Product not found!</p>
         </div>
      `;
    productContainer.appendChild(productItem);
  }else{
    products.forEach((product) => {
      const productItem = document.createElement("div");
      productItem.classList.add("product__item");
      productItem.innerHTML = `
          <div class="product__banner">
            <a href="/details/${product._id}" class="product__images">
              <img src="${product.images[0]}" alt="${
        product.name
      }" class="product__img default" />
              <img src="${product.images[1]}" alt="${
        product.name
      }" class="product__img hover" />
            </a>
            <div class="product__actions">
              <a href="#" class="action__btn" aria-label="Quick View">
                <i class="fi fi-rs-eye"></i>
              </a>
              <a href="#" class="action__btn" aria-label="Add to Wishlist">
                <i class="fi fi-rs-heart"></i>
              </a>
            </div>
            <div class="product__badge light-pink">Hot</div>
          </div>
          <div class="product__content">
            <span class="product__category">${product.brand}</span>
            <h3 class="product__title">${product.name}</h3>
            <div class="product__rating">
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
            </div>
            <div class="product__price flex">
              ${
                product.offerPrice
                  ? `<span class="new__price">&#8377;${product.offerPrice}</span><span class="old__price">&#8377;${product.price}</span>`
                  : `<span class="new__price">&#8377;${product.price}</span>`
              }
            </div>
            <a href="#" class="action__btn cart__btn" aria-label="Add To Cart">
              <i class="fi fi-rs-shopping-bag-add"></i>
            </a>
          </div>
        `;
      productContainer.appendChild(productItem);
    });
  }
}

const loader = document.querySelector(".loaderPlain");

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY + 1000  >= document.body.offsetHeight) {
    loadMoreProducts();
  }
});

let page = 1;
const limit = 10;

// async function loadMoreProducts() {
//   loader.style.display = "block";
//   page++;
//   try {
//     const queryParams = new URLSearchParams({
//       page: page,
//       limit: limit,
//       api: true,
//       sortBy: selectedFilters.sortBy,
//       price: selectedFilters.price.join(","),
//       category: selectedFilters.category.join(","),
//       name: selectedFilters.name,
//     }).toString();
//     const response = await fetch(`/shop?${queryParams}`);
//     const data = await response.json();

//     if (data.products.length > 0) {
//       data.products.forEach((product) => {
//         const productContainer = document.querySelector(".products__container");
//         const productItem = document.createElement("div");
//         productItem.classList.add("product__item");
//         productItem.innerHTML = `
//           <div class="product__banner">
//             <a href="/details/${product._id}" class="product__images">
//               <img src="${product.images[0]}" alt="${
//           product.name
//         }" class="product__img default" />
//               <img src="${product.images[1]}" alt="${
//           product.name
//         }" class="product__img hover" />
//             </a>
//             <div class="product__actions">
//               <a href="#" class="action__btn" aria-label="Quick View">
//                 <i class="fi fi-rs-eye"></i>
//               </a>
//               <a href="#" class="action__btn" aria-label="Add to Wishlist">
//                 <i class="fi fi-rs-heart"></i>
//               </a>
//             </div>
//             <div class="product__badge light-pink">Hot</div>
//           </div>
//           <div class="product__content">
//             <span class="product__category">${product.brand}</span>
//             <h3 class="product__title">${product.name}</h3>
//             <div class="product__rating">
//               <i class="fi fi-rs-star"></i>
//               <i class="fi fi-rs-star"></i>
//               <i class="fi fi-rs-star"></i>
//               <i class="fi fi-rs-star"></i>
//               <i class="fi fi-rs-star"></i>
//             </div>
//             <div class="product__price flex">
//               ${
//                 product.offerPrice
//                   ? `<span class="new__price">&#8377;${product.offerPrice}</span><span class="old__price">&#8377;${product.price}</span>`
//                   : `<span class="new__price">&#8377;${product.price}</span>`
//               }
//             </div>
//             <a href="#" class="action__btn cart__btn" aria-label="Add To Cart">
//               <i class="fi fi-rs-shopping-bag-add"></i>
//             </a>
//           </div>
//         `;
//         productContainer.appendChild(productItem);
//       });
//     } else {
//       loader.style.display = "none";
//     }

//     loader.style.display = "none";
//   } catch (err) {
//     console.log(err);
//     loader.style.display = "none";
//   }
// }


async function loadMoreProducts() {
  loader.style.display = "block";
  page++;
  try {
    const queryParams = new URLSearchParams({
      page: page,
      limit: limit,
      api: true,
      sortBy: selectedFilters.sortBy,
      price: selectedFilters.price.join(","),  
      category: selectedFilters.category.join(","),  
      rating: selectedFilters.rating || "",  
    }).toString();

    const response = await fetch(`/shop?${queryParams}`);
    const data = await response.json();

    if (data.products.length > 0) {
      data.products.forEach((product) => {
        const productContainer = document.querySelector(".products__container");
        const productItem = document.createElement("div");
        productItem.classList.add("product__item");
        productItem.innerHTML = `
          <div class="product__banner">
            <a href="/details/${product._id}" class="product__images">
              <img src="${product.images[0]}" alt="${product.name}" class="product__img default" />
              <img src="${product.images[1]}" alt="${product.name}" class="product__img hover" />
            </a>
            <div class="product__actions">
              <a href="#" class="action__btn" aria-label="Quick View">
                <i class="fi fi-rs-eye"></i>
              </a>
              <a href="#" class="action__btn" aria-label="Add to Wishlist">
                <i class="fi fi-rs-heart"></i>
              </a>
            </div>
            <div class="product__badge light-pink">Hot</div>
          </div>
          <div class="product__content">
            <span class="product__category">${product.brand}</span>
            <h3 class="product__title">${product.name}</h3>
            <div class="product__rating">
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
              <i class="fi fi-rs-star"></i>
            </div>
            <div class="product__price flex">
              ${
                product.offerPrice
                  ? `<span class="new__price">&#8377;${product.offerPrice}</span><span class="old__price">&#8377;${product.price}</span>`
                  : `<span class="new__price">&#8377;${product.price}</span>`
              }
            </div>
            <a href="#" class="action__btn cart__btn" aria-label="Add To Cart">
              <i class="fi fi-rs-shopping-bag-add"></i>
            </a>
          </div>
        `;
        productContainer.appendChild(productItem);
      });
    } else {
      loader.style.display = "none";
    }

    loader.style.display = "none";
  } catch (err) {
    console.log(err);
    loader.style.display = "none";
  }
}
