const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  productID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    index: true
  },
  variantId: { 
    type: String, 
    default: null 
  },
  type: { 
    type: String, 
    enum: ['import', 'export', 'adjustment', 'sale'], 
    required: true,
    index: true
  },
  quantity: { 
    type: Number, 
    required: true 
  },
  previousStock: { 
    type: Number, 
    required: true 
  },
  newStock: { 
    type: Number, 
    required: true 
  },
  reason: { 
    type: String, 
    default: '' 
  },
  note: { 
    type: String, 
    default: '' 
  },
  adminID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null
  },
  orderID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order',
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
