const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
} = require('../controllers/adminController');

router.use(authenticate, requireRole('admin'));

router.get('/applications', listApplications);
router.get('/applications/:id', getApplication);
router.post('/applications/:id/approve', approveApplication);
router.post('/applications/:id/reject', rejectApplication);

module.exports = router;
