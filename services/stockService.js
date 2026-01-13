const Variant = require('../models/variantModel');
const InventoryMovement = require('../models/inventoryModel');


class StockService {
  

  async checkStock(product, variant = null, quantity = 1, attributes = {}) {
    try {
      if (variant) {
        return {
          available: variant.isInStock(quantity),
          reason: variant.isInStock(quantity) ? 'Available' : `Only ${variant.availableStock} items available`,
          availableStock: variant.availableStock,
          variant: variant
        };
      }

      if (Object.keys(attributes).length > 0) {
        const query = {
          product: product._id,
          isActive: true
        };
        
        for (const [key, value] of Object.entries(attributes)) {
          query[`attributes.${key}`] = value;
        }
        
        const foundVariant = await Variant.findOne(query);

        if (!foundVariant) {
          return {
            available: false,
            reason: 'Variant not found for selected attributes',
            availableStock: 0,
            variant: null
          };
        }

        return {
          available: foundVariant.isInStock(quantity),
          reason: foundVariant.isInStock(quantity) ? 'Available' : `Only ${foundVariant.availableStock} items available`,
          availableStock: foundVariant.availableStock,
          variant: foundVariant
        };
      }

      const hasVariants = await Variant.countDocuments({ product: product._id, isActive: true });
      
      if (hasVariants > 0) {
        return {
          available: false,
          reason: 'Please select product options',
          availableStock: 0,
          variant: null
        };
      }

      const legacyStock = product.sizes?.stock || 999; 
      return {
        available: legacyStock >= quantity,
        reason: legacyStock >= quantity ? 'Available' : `Only ${legacyStock} items available`,
        availableStock: legacyStock,
        variant: null
      };

    } catch (error) {
      console.error('Stock check error:', error);
      return {
        available: false,
        reason: 'Stock check failed',
        availableStock: 0,
        variant: null
      };
    }
  }

  async reserveStock(variantId, quantity, reference = null, userId = null) {
    try {
      const variant = await Variant.findById(variantId);
      if (!variant) return { success: false, message: 'Variant not found' };
      if (!variant.isInStock(quantity)) return { success: false, message: 'Insufficient stock' };

      const updated = await Variant.findOneAndUpdate(
        { 
          _id: variantId, 
          $expr: { $gte: [{ $subtract: ['$stock', '$reserved'] }, quantity] } 
        },
        { $inc: { reserved: quantity } },
        { new: true }
      );

      if (!updated) return { success: false, message: 'Stock reservation failed - insufficient stock' };
      
      await this.recordInventoryMovement(
        variantId,
        'RESERVATION',
        -quantity,
        updated.stock + quantity,
        updated.stock,
        reference,
        'Stock reserved for order',
        userId
      );

      this.emitStockUpdate(updated);

      return { success: true, variant: updated };
    } catch (error) {
      console.error('Stock reservation error:', error);
      return { success: false, message: 'Stock reservation failed', error };
    }
  }


  async releaseStock(variantId, quantity, reference = null, userId = null) {
    try {
      const variant = await Variant.findById(variantId);
      if (!variant) return { success: false, message: 'Variant not found' };

      const updated = await Variant.findByIdAndUpdate(
        variantId,
        { $inc: { reserved: -quantity } },
        { new: true }
      );

      if (updated.reserved < 0) {
        updated.reserved = 0;
        await updated.save();
      }

      await this.recordInventoryMovement(
        variantId,
        'RELEASE',
        quantity,
        updated.stock - quantity,
        updated.stock,
        reference,
        'Reserved stock released',
        userId
      );

      this.emitStockUpdate(updated);

      return { success: true, variant: updated };
    } catch (error) {
      console.error('Stock release error:', error);
      return { success: false, message: 'Stock release failed', error };
    }
  }


  async deductStock(variantId, quantity, reference = null, userId = null) {
    try {
      const updated = await Variant.findOneAndUpdate(
        { 
          _id: variantId, 
          stock: { $gte: quantity }, 
          reserved: { $gte: quantity } 
        },
        { $inc: { stock: -quantity, reserved: -quantity } },
        { new: true }
      );

      if (!updated) return { success: false, message: 'Stock deduction failed - insufficient stock' };

      await this.recordInventoryMovement(
        variantId,
        'SALE',
        -quantity,
        updated.stock + quantity,
        updated.stock,
        reference,
        'Stock sold',
        userId
      );

      if (updated.isLowStock()) {
        this.emitLowStockAlert(updated);
      }
      
      this.emitStockUpdate(updated);

      return { success: true, variant: updated };
    } catch (error) {
      console.error('Stock deduction error:', error);
      return { success: false, message: 'Stock deduction failed', error };
    }
  }


  async restoreStock(variantId, quantity, reference = null, userId = null, reason = 'Stock restored') {
    try {
      const variant = await Variant.findById(variantId);
      if (!variant) return { success: false, message: 'Variant not found' };

      const updated = await Variant.findByIdAndUpdate(
        variantId,
        { $inc: { stock: quantity } },
        { new: true }
      );

      await this.recordInventoryMovement(
        variantId,
        'RETURN',
        quantity,
        updated.stock - quantity,
        updated.stock,
        reference,
        reason,
        userId
      );
      
      this.emitStockUpdate(updated);

      return { success: true, variant: updated };
    } catch (error) {
      console.error('Stock restoration error:', error);
      return { success: false, message: 'Stock restoration failed', error };
    }
  }

  async recordInventoryMovement(variantId, type, quantity, previousStock, newStock, reference, reason, userId) {
    try {
      await InventoryMovement.create({
        variant: variantId,
        type,
        quantity,
        previousStock,
        newStock,
        reference,
        reason,
        performedBy: userId
      });
    } catch (error) {
      console.error('Error recording inventory movement:', error);
    }
  }


  async checkAvailability(variantId, quantity = 1) {
    try {
      const variant = await Variant.findById(variantId);
      if (!variant || !variant.isActive) {
        return false;
      }
      return variant.isInStock(quantity);
    } catch (error) {
      console.error('Stock availability check error:', error);
      return false;
    }
  }

  async getStockStatus(variantId) {
    try {
      const variant = await Variant.findById(variantId).populate('product');
      if (!variant) return { success: false, message: 'Variant not found' };
      
      return {
        success: true,
        stock: {
          total: variant.stock,
          reserved: variant.reserved,
          available: variant.availableStock,
          isInStock: variant.isInStock(),
          isLowStock: variant.isLowStock(),
          threshold: variant.lowStockThreshold,
          attributes: variant.attributes
        }
      };
    } catch (error) {
      console.error('Get stock status error:', error);
      return { success: false, message: 'Failed to get stock status', error };
    }
  }

  async bulkUpdateStock(updates) {
    try {
      const results = await Promise.all(
        updates.map(async ({ variantId, quantity, userId, reason }) => {
          const variant = await Variant.findById(variantId);
          if (!variant) return { variantId, success: false, error: 'Variant not found' };

          const previousStock = variant.stock;
          const updated = await Variant.findByIdAndUpdate(
            variantId,
            { $set: { stock: quantity } },
            { new: true }
          );

          if (updated) {
            await this.recordInventoryMovement(
              variantId,
              'ADJUSTMENT',
              quantity - previousStock,
              previousStock,
              quantity,
              null,
              reason || 'Bulk stock update',
              userId
            );
            this.emitStockUpdate(updated);
          }
          
          return { variantId, success: !!updated };
        })
      );

      const failed = results.filter(r => !r.success);
      return {
        success: failed.length === 0,
        updated: results.filter(r => r.success).length,
        failed: failed.length,
        results
      };
    } catch (error) {
      console.error('Bulk stock update error:', error);
      return { success: false, message: 'Bulk update failed', error };
    }
  }

  async getStockHistory(variantId, limit = 50) {
    try {
      const movements = await InventoryMovement.find({ variant: variantId })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit);

      return { success: true, movements };
    } catch (error) {
      console.error('Get stock history error:', error);
      return { success: false, message: 'Failed to get stock history', error };
    }
  }
}

module.exports = new StockService();
