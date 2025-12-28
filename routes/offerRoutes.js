const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

// ~~~ Load Admin Offers Page ~~~
// Purpose: Displays a paginated list of all offers for admin management.
// Response: Renders the offers management page or returns an error if loading fails.
router.get('/admin/offers', offerController.offersLoad);

// ~~~ Get Form Data ~~~
// Purpose: Get data needed for offer creation form (products, categories, brands)
// Response: Returns form data
router.get('/admin/offers/form/data', offerController.getOfferFormData);

// ~~~ Create a New Offer ~~~
// Purpose: Adds a new offer to the system with provided details.
// Response: Returns success or error messages based on the operation.
router.post('/admin/offers', offerController.createOffer);

// ~~~ Get Offer Details ~~~
// Purpose: Get details of a specific offer
// Response: Returns offer details or error message
router.get('/admin/offers/:id', offerController.getOffer);

// ~~~ Update an Offer ~~~
// Purpose: Updates details of an existing offer in the system.
// Response: Returns success or error messages based on the operation.
router.put('/admin/offers/:id', offerController.updateOffer);

// ~~~ Delete an Offer ~~~
// Purpose: Deletes a specific offer from the system.
// Response: Returns success or error messages based on whether the deletion was successful.
router.delete('/admin/offers/:id', offerController.deleteOffer);

// ~~~ Toggle Offer Status ~~~
// Purpose: Enable/disable an offer
// Response: Returns success or error messages
router.post('/admin/offers/:id/toggle', offerController.toggleOfferStatus);

// ~~~ Get Active Offers (Public API) ~~~
// Purpose: Get active offers for frontend display
// Response: Returns list of active offers
router.get('/api/offers/active', offerController.getActiveOffers);

module.exports = router;
