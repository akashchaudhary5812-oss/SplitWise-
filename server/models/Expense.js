const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    isPaid: {
        type: Boolean,
        default: false
    }
});

const expenseSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: [true, 'Expense description is required'],
            trim: true,
            maxlength: [100, 'Description cannot exceed 100 characters']
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0.01, 'Amount must be greater than 0']
        },
        category: {
            type: String,
            enum: [
                'food',
                'transport',
                'shopping',
                'entertainment',
                'utilities',
                'rent',
                'health',
                'travel',
                'education',
                'other'
            ],
            default: 'other'
        },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Payer is required']
        },
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: [true, 'Group is required']
        },
        splitType: {
            type: String,
            enum: ['equal', 'exact', 'percentage'],
            default: 'equal'
        },
        splits: [splitSchema],
        date: {
            type: Date,
            default: Date.now
        },
        notes: {
            type: String,
            default: '',
            maxlength: [300, 'Notes cannot exceed 300 characters']
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
