const express = require('express');
const { body, validationResult } = require('express-validator');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const router = express.Router();

// Create settlement
router.post(
    '/',
    auth,
    [
        body('payeeId').isMongoId().withMessage('Valid payee ID is required'),
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
        body('groupId').isMongoId().withMessage('Valid group ID is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
                });
            }

            const { payeeId, amount, groupId, notes } = req.body;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (!group.members.some((m) => m.toString() === req.userId.toString())) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }

            const settlement = new Settlement({
                payer: req.userId,
                payee: payeeId,
                amount,
                group: groupId,
                notes: notes || ''
            });

            await settlement.save();
            await settlement.populate('payer', 'name email avatar');
            await settlement.populate('payee', 'name email avatar');

            res.status(201).json({ message: 'Settlement recorded', settlement });
        } catch (error) {
            console.error('Create settlement error:', error);
            res.status(500).json({ message: 'Failed to record settlement' });
        }
    }
);

// Get settlements for a group
router.get('/group/:groupId', auth, async (req, res) => {
    try {
        const settlements = await Settlement.find({ group: req.params.groupId })
            .populate('payer', 'name email avatar')
            .populate('payee', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json({ settlements });
    } catch (error) {
        console.error('Get settlements error:', error);
        res.status(500).json({ message: 'Failed to fetch settlements' });
    }
});

module.exports = router;
