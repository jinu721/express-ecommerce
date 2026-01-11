const Attribute = require('../models/attributeModel');
const Category = require('../models/categoryModel');

module.exports = {
  async getAllAttributes(req, res) {
    try {
      const { category, active } = req.query;
      
      let query = {};
      if (category) query.category = category;
      if (active !== undefined) query.isActive = active === 'true';

      const attributes = await Attribute.find(query)
        .populate('category', 'name')
        .sort({ sortOrder: 1, name: 1 });

      res.json({
        success: true,
        count: attributes.length,
        attributes
      });
    } catch (error) {
      console.error('Get attributes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attributes',
        error: error.message
      });
    }
  },

  async getCategoryAttributes(req, res) {
    try {
      const { categoryId } = req.params;
      
      const attributes = await Attribute.getForCategory(categoryId);

      res.json({
        success: true,
        count: attributes.length,
        attributes: attributes.map(attr => ({
          _id: attr._id,
          name: attr.name,
          displayName: attr.displayName,
          type: attr.type,
          values: attr.values.filter(v => v.isActive),
          isRequired: attr.isRequired
        }))
      });
    } catch (error) {
      console.error('Get category attributes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category attributes',
        error: error.message
      });
    }
  },


  async createAttribute(req, res) {
    try {
      const { name, displayName, type, values, category, isRequired } = req.body;

      const existing = await Attribute.findOne({
        name: name.toUpperCase(),
        category: category || null
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Attribute with this name already exists for this category'
        });
      }

      const attribute = await Attribute.create({
        name: name.toUpperCase(),
        displayName,
        type: type || 'SELECT',
        values: values || [],
        category: category || null,
        isRequired: isRequired || false,
        isActive: true
      });

      await attribute.populate('category', 'name');

      res.status(201).json({
        success: true,
        message: 'Attribute created successfully',
        attribute
      });
    } catch (error) {
      console.error('Create attribute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create attribute',
        error: error.message
      });
    }
  },

  async updateAttribute(req, res) {
    try {
      const { attributeId } = req.params;
      const updates = req.body;

      delete updates.name;

      const attribute = await Attribute.findByIdAndUpdate(
        attributeId,
        updates,
        { new: true, runValidators: true }
      ).populate('category', 'name');

      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: 'Attribute not found'
        });
      }

      res.json({
        success: true,
        message: 'Attribute updated successfully',
        attribute
      });
    } catch (error) {
      console.error('Update attribute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update attribute',
        error: error.message
      });
    }
  },

  async deleteAttribute(req, res) {
    try {
      const { attributeId } = req.params;

      const attribute = await Attribute.findByIdAndDelete(attributeId);

      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: 'Attribute not found'
        });
      }

      res.json({
        success: true,
        message: 'Attribute deleted successfully'
      });
    } catch (error) {
      console.error('Delete attribute error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete attribute',
        error: error.message
      });
    }
  },

  async addAttributeValue(req, res) {
    try {
      const { attributeId } = req.params;
      const { value, displayValue, hexCode, sortOrder } = req.body;

      const attribute = await Attribute.findById(attributeId);
      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: 'Attribute not found'
        });
      }

      const existingValue = attribute.values.find(v => v.value === value);
      if (existingValue) {
        return res.status(400).json({
          success: false,
          message: 'Value already exists for this attribute'
        });
      }

      attribute.values.push({
        value,
        displayValue: displayValue || value,
        hexCode,
        sortOrder: sortOrder || 0,
        isActive: true
      });

      await attribute.save();

      res.json({
        success: true,
        message: 'Value added successfully',
        attribute
      });
    } catch (error) {
      console.error('Add attribute value error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add value',
        error: error.message
      });
    }
  },

  async updateAttributeValue(req, res) {
    try {
      const { attributeId, valueId } = req.params;
      const updates = req.body;

      const attribute = await Attribute.findById(attributeId);
      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: 'Attribute not found'
        });
      }

      const valueIndex = attribute.values.findIndex(v => v._id.toString() === valueId);
      if (valueIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Value not found'
        });
      }

      Object.assign(attribute.values[valueIndex], updates);
      await attribute.save();

      res.json({
        success: true,
        message: 'Value updated successfully',
        attribute
      });
    } catch (error) {
      console.error('Update attribute value error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update value',
        error: error.message
      });
    }
  },


  async deleteAttributeValue(req, res) {
    try {
      const { attributeId, valueId } = req.params;

      const attribute = await Attribute.findById(attributeId);
      if (!attribute) {
        return res.status(404).json({
          success: false,
          message: 'Attribute not found'
        });
      }

      attribute.values = attribute.values.filter(v => v._id.toString() !== valueId);
      await attribute.save();

      res.json({
        success: true,
        message: 'Value deleted successfully',
        attribute
      });
    } catch (error) {
      console.error('Delete attribute value error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete value',
        error: error.message
      });
    }
  },

  async renderAttributeManagement(req, res) {
    try {
      const attributes = await Attribute.find({})
        .populate('category', 'name')
        .sort({ sortOrder: 1, name: 1 });

      const categories = await Category.find({ isDeleted: false })
        .sort({ name: 1 });

      res.render('attributeManagement', {
        attributes,
        categories
      });
    } catch (error) {
      console.error('Render attribute management error:', error);
      res.status(500).render('500', { 
        message: 'Error loading attribute management' 
      });
    }
  },

  async createClothingAttributes(req, res) {
    try {
      const clothingAttributes = [
        {
          name: 'SIZE',
          displayName: 'Size',
          type: 'SELECT',
          values: [
            { value: 'XS', displayValue: 'Extra Small', sortOrder: 1 },
            { value: 'S', displayValue: 'Small', sortOrder: 2 },
            { value: 'M', displayValue: 'Medium', sortOrder: 3 },
            { value: 'L', displayValue: 'Large', sortOrder: 4 },
            { value: 'XL', displayValue: 'Extra Large', sortOrder: 5 },
            { value: 'XXL', displayValue: '2X Large', sortOrder: 6 },
            { value: 'XXXL', displayValue: '3X Large', sortOrder: 7 }
          ],
          isRequired: true,
          sortOrder: 1
        },
        {
          name: 'COLOR',
          displayName: 'Color',
          type: 'COLOR_PICKER',
          values: [
            { value: 'BLACK', displayValue: 'Black', hexCode: '#000000', sortOrder: 1 },
            { value: 'WHITE', displayValue: 'White', hexCode: '#FFFFFF', sortOrder: 2 },
            { value: 'RED', displayValue: 'Red', hexCode: '#FF0000', sortOrder: 3 },
            { value: 'BLUE', displayValue: 'Blue', hexCode: '#0000FF', sortOrder: 4 },
            { value: 'GREEN', displayValue: 'Green', hexCode: '#008000', sortOrder: 5 },
            { value: 'YELLOW', displayValue: 'Yellow', hexCode: '#FFFF00', sortOrder: 6 },
            { value: 'GRAY', displayValue: 'Gray', hexCode: '#808080', sortOrder: 7 },
            { value: 'NAVY', displayValue: 'Navy', hexCode: '#000080', sortOrder: 8 }
          ],
          isRequired: false,
          sortOrder: 2
        }
      ];

      const results = [];
      for (const attrData of clothingAttributes) {
        const existing = await Attribute.findOne({ name: attrData.name, category: null });
        if (!existing) {
          const attribute = await Attribute.create(attrData);
          results.push(attribute);
        }
      }

      res.json({
        success: true,
        message: `Created ${results.length} default clothing attributes`,
        attributes: results
      });
    } catch (error) {
      console.error('Create clothing attributes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create clothing attributes',
        error: error.message
      });
    }
  }
};