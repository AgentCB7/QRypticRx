const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createPrescription,
  listPrescriptions,
  getPrescription,
  verifyPrescription,
  dispensePrescription,
} = require('../controllers/prescriptionController');

// Pharmacist: verify (must be registered before /:id to avoid param capture)
router.post('/verify', authenticate, requireRole('pharmacist'), verifyPrescription);

// Doctor routes
router.post('/', authenticate, requireRole('doctor'), createPrescription);
router.get('/', authenticate, requireRole('doctor'), listPrescriptions);
router.get('/:id', authenticate, requireRole('doctor'), getPrescription);

// Pharmacist: dispense
router.post('/:id/dispense', authenticate, requireRole('pharmacist'), dispensePrescription);

module.exports = router;
