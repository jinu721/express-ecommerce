const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

router.get('/admin/offers', offerController.offersLoad);

router.get('/admin/offers/form/data', offerController.getOfferFormData);
router.post('/admin/offers', offerController.createOffer);
router.get('/admin/offers/:id', offerController.getOffer);
router.put('/admin/offers/:id', offerController.updateOffer);
router.delete('/admin/offers/:id', offerController.deleteOffer);
router.post('/admin/offers/:id/toggle', offerController.toggleOfferStatus);
router.get('/api/offers/active', offerController.getActiveOffers);

module.exports = router;
