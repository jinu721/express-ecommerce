/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close");

/*===== Menu Show =====*/
/* Validate if constant exists */
if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show-menu");
  });
}

/*===== Hide Show =====*/
/* Validate if constant exists */
if (navClose) {
  navClose.addEventListener("click", () => {
    navMenu.classList.remove("show-menu");
  });
}

/*=============== IMAGE GALLERY ===============*/
function imgGallery() {
  const mainImg = document.querySelector(".details__img"),
    smallImg = document.querySelectorAll(".details__small-img");

  smallImg.forEach((img) => {
    img.addEventListener("click", function () {
      mainImg.src = this.src;
    });
  });
}

imgGallery();

/*=============== SWIPER CATEGORIES ===============*/
let swiperCategories = new Swiper(".categories__container", {
  spaceBetween: 24,
  loop: true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },

  breakpoints: {
    350: {
      slidesPerView: 2,
      spaceBetween: 24,
    },
    768: {
      slidesPerView: 3,
      spaceBetween: 24,
    },
    992: {
      slidesPerView: 4,
      spaceBetween: 24,
    },
    1200: {
      slidesPerView: 5,
      spaceBetween: 24,
    },
    1400: {
      slidesPerView: 6,
      spaceBetween: 24,
    },
  },
});

/*=============== SWIPER PRODUCTS ===============*/
let swiperProducts = new Swiper(".new__container", {
  spaceBetween: 24,
  loop: true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },

  breakpoints: {
    768: {
      slidesPerView: 2,
      spaceBetween: 24,
    },
    992: {
      slidesPerView: 4,
      spaceBetween: 24,
    },
    1400: {
      slidesPerView: 4,
      spaceBetween: 24,
    },
  },
});

/*=============== PRODUCTS TABS ===============*/
// const tabs = document.querySelectorAll("[data-target]");
// const tabsContents = document.querySelectorAll(".tab__content");

// tabs.forEach((tab) => {
//   tab.addEventListener("click", () => {
//     const target = document.querySelector(tab.dataset.target);

//     // Remove active class from all tab contents and tabs
//     tabsContents.forEach((tabsContent) => {
//       tabsContent.classList.remove("active-tab");
//     });

//     tabs.forEach((tab) => {
//       tab.classList.remove("active-tab");
//     });

//     // Add active class to the clicked tab and its corresponding content
//     target.classList.add("active-tab");
//     tab.classList.add("active-tab");
//   });
// });



let debounceTimer;

function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 300); 
}
async function performSearch() {
  const query = document.getElementById('searchBox').value.trim();
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';
  if (query.length < 1) {
    document.getElementById('searchResults').innerHTML = '';
    document.querySelector('.mainPageSection').classList.remove('blurred');
    return;
  }

  try{
    const response = await fetch(`/product/search?key=${encodeURIComponent(query)}`);
    const data = await response.json();
    if(data.val){ 
      // if (data.results.length === 0) {
      //   resultsContainer.innerHTML = '<p>No results found</p>';
      //   return;
      // };
      document.querySelector('.mainPageSection').classList.add('blurred');
      console.log(data.results)
      data.results.forEach((item) => {
        const productHTML = `
          <div data-id="${item._id}" class="productItem" onclick="loadDetailsPage(event)">
            <img data-id="${item._id}" class="productItemImg" src="${item.images[0]}" alt="${item.name}">
            <p data-id="${item._id}" class="productItemName">${item.name}</p>
            <p data-id="${item._id}" class="productItemPrice">
              ${item.hasOffer 
                ? `<span class="new__price">&#8377;${Math.round(item.finalPrice)}</span><span class="old__price">&#8377;${Math.round(item.originalPrice)}</span>${item.isPercentageOffer ? `<span class="save__price">${item.discountPercentage}% Off</span>` : ''}`
                : `&#8377;${Math.round(item.originalPrice || item.finalPrice || item.basePrice || item.price)}`
              }
            </p>
          </div>
        `;
        resultsContainer.innerHTML += productHTML;
      });
    }else{
      console.log(data.msg)
    }
  }catch(err){
    console.log(err);
  }
}

loadDetailsPage = (e)=>{
  const productId = e.target.getAttribute('data-id');
  window.location.href = `/details/${productId}`;
}


