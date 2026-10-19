const Template = require('../models/Template');
const { AppError } = require('../middleware/errorHandler');

// Get all templates (public + workspace specific)
exports.getTemplates = async (req, res, next) => {
  try {
    const { category, type, workspace } = req.query;
    
    // Build query: public OR belongs to the user OR workspace
    const query = {
      $or: [
        { isPublic: true },
        { creator: req.user._id }
      ]
    };
    
    if (workspace) {
        query.$or.push({ workspace });
    }

    if (category) query.category = category;
    if (type) query.type = type;

    const templates = await Template.find(query)
      .populate('creator', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new template
exports.createTemplate = async (req, res, next) => {
  try {
    const templateData = {
      ...req.body,
      creator: req.user._id,
    };

    const template = await Template.create(templateData);

    res.status(201).json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
};

// Get single template
exports.getTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('creator', 'name');

    if (!template) {
      return next(new AppError('Template not found', 404));
    }

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    next(error);
  }
};

// Delete template
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return next(new AppError('Template not found', 404));
    }

    if (template.creator.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to delete this template', 403));
    }

    await template.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
