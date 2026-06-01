const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createPrescription,
  listPrescriptions,
  getPrescription,
  verifyPrescription,
  dispenseItem,
} = require('../controllers/prescriptionController');

router.post('/verify', authenticate, requireRole('pharmacist'), verifyPrescription);

router.post('/', authenticate, requireRole('doctor'), createPrescription);
router.get('/', authenticate, requireRole('doctor'), listPrescriptions);
router.get('/:id', authenticate, requireRole('doctor'), getPrescription);

router.post('/:id/items/:itemId/dispense', authenticate, requireRole('pharmacist'), dispenseItem);

module.exports = router;
