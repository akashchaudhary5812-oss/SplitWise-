const express = require('express');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

const router = express.Router();

// Search users by email
router.get('/search', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters' });
        }

        const users = await User.find({
            $or: [
                { email: { $regex: q, $options: 'i' } },
                { name: { $regex: q, $options: 'i' } }
            ],
            _id: { $ne: req.userId }
        })
            .select('name email avatar')
            .limit(10);

        res.json({ users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Failed to search users' });
    }
});

// Get dashboard stats
router.get('/dashboard', auth, async (req, res) => {
    try {
        const groups = await Group.find({ members: req.userId });
        const groupIds = groups.map((g) => g._id);

        const expenses = await Expense.find({ group: { $in: groupIds } })
            .populate('splits.user', 'name email');

        let totalOwed = 0;
        let totalOwe = 0;
        let totalExpenses = 0;

        expenses.forEach((expense) => {
            totalExpenses += expense.amount;

            if (expense.paidBy.toString() === req.userId.toString()) {
                expense.splits.forEach((split) => {
                    if (split.user._id.toString() !== req.userId.toString()) {
                        totalOwed += split.amount;
                    }
                });
            } else {
                expense.splits.forEach((split) => {
                    if (split.user._id.toString() === req.userId.toString()) {
                        totalOwe += split.amount;
                    }
                });
            }
        });

        // Monthly spending data (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyExpenses = await Expense.aggregate([
            { $match: { group: { $in: groupIds }, date: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Category breakdown
        const categoryBreakdown = await Expense.aggregate([
            { $match: { group: { $in: groupIds } } },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({
            totalGroups: groups.length,
            totalOwed: Math.round(totalOwed * 100) / 100,
            totalOwe: Math.round(totalOwe * 100) / 100,
            netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            monthlyExpenses,
            categoryBreakdown
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard data' });
    }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.length < 2) {
            return res.status(400).json({ message: 'Name must be at least 2 characters' });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { name },
            { new: true }
        ).select('-password');

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

module.exports = router;
