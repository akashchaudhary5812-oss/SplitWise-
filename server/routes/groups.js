const express = require('express');
const { body, validationResult } = require('express-validator');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
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

// Create group
router.post(
    '/',
    auth,
    [
        body('name')
            .trim()
            .isLength({ min: 2, max: 60 })
            .withMessage('Group name must be 2-60 characters'),
        body('category')
            .optional()
            .isIn(['trip', 'home', 'couple', 'friends', 'work', 'other'])
            .withMessage('Invalid category')
    ],
    async (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { name, description, category, memberEmails } = req.body;

            // Find members by email
            let members = [req.userId];
            if (memberEmails && memberEmails.length > 0) {
                const foundUsers = await User.find({ email: { $in: memberEmails } });
                const foundIds = foundUsers.map((u) => u._id.toString());
                members = [...new Set([req.userId.toString(), ...foundIds])];
            }

            const group = new Group({
                name,
                description: description || '',
                category: category || 'other',
                members,
                createdBy: req.userId
            });

            await group.save();
            await group.populate('members', 'name email avatar');

            res.status(201).json({ message: 'Group created', group });
        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ message: 'Failed to create group' });
        }
    }
);

// Get all user's groups
router.get('/', auth, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.userId })
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email')
            .sort({ updatedAt: -1 });

        // Calculate total expenses for each group
        const groupsWithTotals = await Promise.all(
            groups.map(async (group) => {
                const expenses = await Expense.find({ group: group._id });
                const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                return { ...group.toObject(), totalExpenses };
            })
        );

        res.json({ groups: groupsWithTotals });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
});

// Get single group with balances
router.get('/:id', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('members', 'name email avatar')
            .populate('createdBy', 'name email');

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (!group.members.some((m) => m._id.toString() === req.userId.toString())) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        // Get expenses
        const expenses = await Expense.find({ group: group._id })
            .populate('paidBy', 'name email avatar')
            .populate('splits.user', 'name email avatar')
            .sort({ date: -1 });

        // Get settlements
        const settlements = await Settlement.find({ group: group._id })
            .populate('payer', 'name email avatar')
            .populate('payee', 'name email avatar')
            .sort({ createdAt: -1 });

        // Calculate balances
        const balances = {};
        group.members.forEach((member) => {
            balances[member._id.toString()] = 0;
        });

        expenses.forEach((expense) => {
            const payerId = expense.paidBy._id.toString();
            balances[payerId] = (balances[payerId] || 0) + expense.amount;

            expense.splits.forEach((split) => {
                const userId = split.user._id ? split.user._id.toString() : split.user.toString();
                balances[userId] = (balances[userId] || 0) - split.amount;
            });
        });

        // Apply settlements
        settlements.forEach((settlement) => {
            const payerId = settlement.payer._id.toString();
            const payeeId = settlement.payee._id.toString();
            balances[payerId] = (balances[payerId] || 0) + settlement.amount;
            balances[payeeId] = (balances[payeeId] || 0) - settlement.amount;
        });

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Simplify debts
        const simplifiedDebts = simplifyDebts(balances, group.members);

        res.json({
            group,
            expenses,
            settlements,
            balances,
            simplifiedDebts,
            totalExpenses
        });
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ message: 'Failed to fetch group details' });
    }
});

// Add member to group
router.post('/:id/members', auth, async (req, res) => {
    try {
        const { email } = req.body;
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User with this email not found' });
        }

        if (group.members.includes(user._id)) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        group.members.push(user._id);
        await group.save();
        await group.populate('members', 'name email avatar');

        res.json({ message: 'Member added', group });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ message: 'Failed to add member' });
    }
});

// Delete group
router.delete('/:id', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        if (group.createdBy.toString() !== req.userId.toString()) {
            return res.status(403).json({ message: 'Only the group creator can delete it' });
        }

        await Expense.deleteMany({ group: group._id });
        await Settlement.deleteMany({ group: group._id });
        await Group.findByIdAndDelete(group._id);

        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ message: 'Failed to delete group' });
    }
});

// Simplify debts algorithm
function simplifyDebts(balances, members) {
    const debts = [];
    const memberMap = {};
    members.forEach((m) => {
        memberMap[m._id.toString()] = m;
    });

    const positives = [];
    const negatives = [];

    Object.entries(balances).forEach(([userId, balance]) => {
        const rounded = Math.round(balance * 100) / 100;
        if (rounded > 0.01) {
            positives.push({ userId, amount: rounded });
        } else if (rounded < -0.01) {
            negatives.push({ userId, amount: Math.abs(rounded) });
        }
    });

    positives.sort((a, b) => b.amount - a.amount);
    negatives.sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;
    while (i < negatives.length && j < positives.length) {
        const debtor = negatives[i];
        const creditor = positives[j];
        const settleAmount = Math.min(debtor.amount, creditor.amount);

        if (settleAmount > 0.01) {
            debts.push({
                from: memberMap[debtor.userId] || { _id: debtor.userId, name: 'Unknown' },
                to: memberMap[creditor.userId] || { _id: creditor.userId, name: 'Unknown' },
                amount: Math.round(settleAmount * 100) / 100
            });
        }

        debtor.amount -= settleAmount;
        creditor.amount -= settleAmount;

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return debts;
}

module.exports = router;
