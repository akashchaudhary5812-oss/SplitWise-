const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

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

// Register
router.post(
    '/register',
    [
        body('name')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be 2-50 characters'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters')
    ],
    async (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { name, email, password } = req.body;

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'An account with this email already exists' });
            }

            const user = new User({ name, email, password });
            await user.save();

            const token = generateToken(user._id);

            res.status(201).json({
                message: 'Account created successfully',
                token,
                user: user.toJSON()
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ message: 'Failed to create account. Please try again.' });
        }
    }
);

// Login
router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        try {
            const validationError = handleValidationErrors(req, res);
            if (validationError) return;

            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const token = generateToken(user._id);

            res.json({
                message: 'Login successful',
                token,
                user: user.toJSON()
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Login failed. Please try again.' });
        }
    }
);

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        res.json({ user: req.user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch user data' });
    }
});

module.exports = router;
