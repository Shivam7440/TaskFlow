const Document = require('../models/Document');
const Project = require('../models/Project');
const { AppError } = require('../middleware/errorHandler');
const { checkProjectPermission } = require('../utils/permissionUtils');

exports.getDocuments = async (req, res, next) => {
  try {
    const { project } = req.query;
    if (!project) {
      return next(new AppError('Project ID is required', 400));
    }

    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return next(new AppError('Project not found', 404));
    }

    if (!checkProjectPermission(projectDoc, req.user._id, 'viewer')) {
      return next(new AppError('Not authorized to view documents in this project', 403));
    }

    const documents = await Document.find({ project })
      .populate('author', 'name email avatar')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('author', 'name email avatar')
      .populate('relatedTasks', 'title status');

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    const projectDoc = await Project.findById(document.project);
    if (!checkProjectPermission(projectDoc, req.user._id, 'viewer')) {
      return next(new AppError('Not authorized to view this document', 403));
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    const { title, content, project, type, relatedTasks } = req.body;

    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return next(new AppError('Project not found', 404));
    }

    if (!checkProjectPermission(projectDoc, req.user._id, 'editor')) {
      return next(new AppError('Not authorized to create documents in this project', 403));
    }

    const document = await Document.create({
      title,
      content,
      project,
      type,
      relatedTasks,
      author: req.user._id,
    });

    await document.populate('author', 'name email avatar');

    res.status(201).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    let document = await Document.findById(req.params.id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    const projectDoc = await Project.findById(document.project);
    if (!checkProjectPermission(projectDoc, req.user._id, 'editor')) {
      return next(new AppError('Not authorized to update documents in this project', 403));
    }

    document = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('author', 'name email avatar')
      .populate('relatedTasks', 'title status');

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    const projectDoc = await Project.findById(document.project);
    // Allow admin or document author to delete
    const isAdmin = checkProjectPermission(projectDoc, req.user._id, 'admin');
    const isAuthor = document.author.toString() === req.user._id.toString();

    if (!isAdmin && !isAuthor) {
      return next(new AppError('Not authorized to delete this document', 403));
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
