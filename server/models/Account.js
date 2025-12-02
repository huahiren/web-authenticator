const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  name: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    required: true
  },
  issuer: {
    type: String,
    default: ''
  },
  userRemarks: {
    type: Map,
    of: String,
    default: () => new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Account', AccountSchema);
