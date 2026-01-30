const express = require('express');
const { createCa, viewCa, editCa, updateStatusCa, deleteCa } = require('../controller/caController');
const router = express.Router();

router.post('/create', createCa);
router.get('/view', viewCa);
router.put('/edit/:id', editCa);
router.put('/update-status/:id', updateStatusCa);
router.delete('/delete/:id', deleteCa);

module.exports = router;