const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Group name is required'],
            trim: true,
            minlength: [2, 'Group name must be at least 2 characters'],
            maxlength: [60, 'Group name cannot exceed 60 characters']
        },
        description: {
            type: String,
            default: '',
            maxlength: [200, 'Description cannot exceed 200 characters']
        },
        category: {
            type: String,
            enum: ['trip', 'home', 'couple', 'friends', 'work', 'other'],
            default: 'other'
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
