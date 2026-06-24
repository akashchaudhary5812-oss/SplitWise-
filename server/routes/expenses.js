const express = require('express');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const router = express.Router();

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
        });
    }
    return null;
};

// Create expense
router.post(
    '/',
    auth,
    [
        body('description')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Description is required (max 100 chars)'),
        body('amount')
            .isFloat({ min: 0.01 })
            .withMessage('Amount must be greater than 0'),
        body('groupId').isMongoId().withMessage('Valid group ID is required'),
        body('splitType')
            .optional()
            .isIn(['equal', 'exact', 'percentage'])
            .withMessage('Invalid split type')
    ],
    async (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { description, amount, groupId, category, splitType, splits, date, notes } = req.body;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (!group.members.some((m) => m.toString() === req.userId.toString())) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }

            let calculatedSplits = [];
            const type = splitType || 'equal';

            if (type === 'equal') {
                const splitMembers = splits && splits.length > 0
                    ? splits.map((s) => s.user)
                    : group.members.map((m) => m.toString());

                const perPerson = Math.round((amount / splitMembers.length) * 100) / 100;
                const remainder = Math.round((amount - perPerson * splitMembers.length) * 100) / 100;

                calculatedSplits = splitMembers.map((userId, index) => ({
                    user: userId,
                    amount: index === 0 ? perPerson + remainder : perPerson,
                    isPaid: userId.toString() === req.userId.toString()
                }));
            } else if (type === 'exact') {
                if (!splits || splits.length === 0) {
                    return res.status(400).json({ message: 'Splits are required for exact split type' });
                }
                const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
                if (Math.abs(totalSplit - amount) > 0.01) {
                    return res.status(400).json({
                        message: `Split amounts (${totalSplit.toFixed(2)}) don't add up to total (${amount.toFixed(2)})`
                    });
                }
                calculatedSplits = splits.map((s) => ({
                    user: s.user,
                    amount: s.amount,
                    isPaid: s.user.toString() === req.userId.toString()
                }));
            } else if (type === 'percentage') {
                if (!splits || splits.length === 0) {
                    return res.status(400).json({ message: 'Splits are required for percentage split type' });
                }
                const totalPercent = splits.reduce((sum, s) => sum + s.amount, 0);
                if (Math.abs(totalPercent - 100) > 0.01) {
                    return res.status(400).json({
                        message: `Percentages (${totalPercent}%) must add up to 100%`
                    });
                }
                calculatedSplits = splits.map((s) => ({
                    user: s.user,
                    amount: Math.round((amount * s.amount) / 100 * 100) / 100,
                    isPaid: s.user.toString() === req.userId.toString()
                }));
            }

            const expense = new Expense({
                description,
                amount,
                category: category || 'other',
                paidBy: req.userId,
                group: groupId,
                splitType: type,
                splits: calculatedSplits,
                date: date || Date.now(),
                notes: notes || ''
            });

            await expense.save();
            await expense.populate('paidBy', 'name email avatar');
            await expense.populate('splits.user', 'name email avatar');

            res.status(201).json({ message: 'Expense added', expense });
        } catch (error) {
            console.error('Create expense error:', error);
            res.status(500).json({ message: 'Failed to create expense' });
        }
    }
);

// Get expenses for a group
router.get('/group/:groupId', auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ group: req.params.groupId })
            .populate('paidBy', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .sort({ date: -1 });

        res.json({ expenses });
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ message: 'Failed to fetch expenses' });
    }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        if (expense.paidBy.toString() !== req.userId.toString()) {
            return res.status(403).json({ message: 'Only the payer can delete this expense' });
        }

        await Expense.findByIdAndDelete(req.params.id);
        res.json({ message: 'Expense deleted' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ message: 'Failed to delete expense' });
    }
});

// Get user's recent expenses across all groups
router.get('/recent', auth, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.userId }).select('_id');
        const groupIds = groups.map((g) => g._id);

        const expenses = await Expense.find({ group: { $in: groupIds } })
            .populate('paidBy', 'name email avatar')
            .populate('group', 'name')
            .populate('splits.user', 'name email avatar')
            .sort({ date: -1 })
            .limit(20);

        res.json({ expenses });
    } catch (error) {
        console.error('Get recent expenses error:', error);
        res.status(500).json({ message: 'Failed to fetch recent expenses' });
    }
});

module.exports = router;
