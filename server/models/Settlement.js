const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
    {
        payer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        payee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        amount: {
            type: Number,
            required: [true, 'Settlement amount is required'],
            min: [0.01, 'Amount must be greater than 0']
        },
        group: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Group',
            required: true
        },
        notes: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Settlement', settlementSchema);
