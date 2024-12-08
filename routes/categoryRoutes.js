const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const upload = require('../utils/multerConfig');

// ~~~ Load Categories for Admin ~~~
// Purpose: Loads the category management page for the admin with a list of all categories.
// Response: Renders the category management page with category details.
router.get('/admin/categories', categoryController.categoryLoadAdmin);

// ~~~ Add New Category ~~~
// Purpose: Allows the admin to add a new category along with an image upload.
// Response: Returns success or error messages based on the result of the operation.
router.post('/admin/category/add', upload.single('categoryImage'), categoryController.categoryAdd);

// ~~~ Add Offer to Category ~~~
// Purpose: Enables the admin to add a discount offer to a specific category.
// Response: Returns success or error messages after applying the offer.
router.post('/admin/category/offer/add', categoryController.categoryOfferAdd);

// ~~~ Load Specific Category Page ~~~
// Purpose: Loads the product list for a specific category.
// Response: Renders the category-specific product page or returns an error message.
router.get('/category/:categoryId/', categoryController.categoryLoad);

// ~~~ Unlist or Relist Category ~~~
// Purpose: Allows the admin to unlist (hide) or relist (show) a category.
// Response: Returns success or error messages based on the action performed.
router.get('/admin/category/unlist', categoryController.categoryUnlist);

// ~~~ Load Update Category Page ~~~
// Purpose: Loads the update page for editing category details.
// Response: Renders the category update page with current category details.
router.get('/admin/category/update/:categoryId', categoryController.categoryUpdateload);

// ~~~ Update Category Image ~~~
// Purpose: Allows the admin to update the image of a specific category.
// Response: Returns success or error messages after attempting the update.
router.post('/update-category-image/:categoryId', upload.single('categoryImage'), categoryController.categoryImageUpdate);

// ~~~ Update Category Details ~~~
// Purpose: Allows the admin to update category details like name or description.
// Response: Returns success or error messages after updating the category details.
router.post('/admin/category/update/:categoryId', categoryController.categoryUpdate);

module.exports = router;
