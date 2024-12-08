
const loader = document.querySelector('.loaderPlain');
const categoryId = document.querySelector('#categoryIdStoreInp').value;

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        loadMoreProducts();
    }
});

let page = 1;
const limit = 10;

async function loadMoreProducts(){
    loader.style.display = "block";
    page++;
    try{
        const response = await fetch(`/category/${categoryId}?page=${page}&limit=${limit}&api=true`);
        const data = await response.json();
        data.products.forEach((product)=>{
            const productContainer = document.querySelector('.products__container');
            const productItem = document.createElement('div');
            productItem.classList.add('product__item');
            productItem.innerHTML = `
                <div class="product__banner">
                    <a href="/details/${product._id}" class="product__images">
                        <img src="/${product.images[0]}" alt="${product.name}" class="product__img default" />
                        <img src="/${product.images[1]}" alt="${product.name}" class="product__img hover" />
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
                    <span class="product__category">${data.category.name}</span>
                    <h3 class="product__title">${product.name}</h3>
                    <div class="product__rating">
                        <i class="fi fi-rs-star"></i>
                        <i class="fi fi-rs-star"></i>
                        <i class="fi fi-rs-star"></i>
                        <i class="fi fi-rs-star"></i>
                        <i class="fi fi-rs-star"></i>
                    </div>
                    <div class="product__price flex">
                        ${product.offerPrice ? `<span class="new__price">&#8377;${product.offerPrice}</span><span class="old__price">&#8377;${product.price}</span>` : `<span class="new__price">&#8377;${product.price}</span>`}
                    </div>
                    <a href="#" class="action__btn cart__btn" aria-label="Add To Cart">
                        <i class="fi fi-rs-shopping-bag-add"></i>
                    </a>
                </div>
            `;
            productContainer.appendChild(productItem);
            loader.style.display = "none";
        })
    }catch(err){
        console.log(err);
    }
}
