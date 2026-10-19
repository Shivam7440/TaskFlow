const aiService = require('../services/aiService');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Convert notes to tasks
// @route   POST /api/ai/meeting-to-tasks
// @access  Private
exports.convertNotesToTasks = async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) {
      return res.status(400).json({ success: false, message: 'Notes text is required' });
    }

    const tasks = await aiService.convertNotesToTasks(notes);
    res.status(200).json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Rewrite task to user story
// @route   POST /api/ai/rewrite-task
// @access  Private
exports.rewriteToUserStory = async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: 'Task description is required' });
    }

    const userStory = await aiService.rewriteToUserStory(description);
    res.status(200).json({ success: true, result: userStory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Kanban structure
// @route   POST /api/ai/generate-kanban
// @access  Private
exports.generateKanbanStructure = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text description is required' });
    }

    const structure = await aiService.generateKanbanStructure(text);
    res.status(200).json({ success: true, structure });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create project with Kanban and tasks from AI
// @route   POST /api/ai/create-project-with-kanban
// @access  Private
exports.createProjectWithKanban = async (req, res) => {
  try {
    const { name, description, workspace, color, aiDescription } = req.body;
    
    if (!name || !workspace) {
      return res.status(400).json({ success: false, message: 'Project name and workspace are required' });
    }

    if (!aiDescription) {
      return res.status(400).json({ success: false, message: 'AI description is required' });
    }

    console.log('🤖 Generating Kanban structure for:', aiDescription);
    
    // Generate Kanban structure
    const structure = await aiService.generateKanbanStructure(aiDescription);
    
    console.log('📋 Generated structure with', structure.length, 'columns and', structure.reduce((sum, col) => sum + (col.tasks?.length || 0), 0), 'tasks');
    
    if (!structure || structure.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to generate Kanban structure from AI' });
    }

    // Prepare columns with proper structure
    const columns = structure.map((col, idx) => ({
      columnId: col.columnId || `col_${idx}`,
      name: col.name || 'Column',
      order: col.order !== undefined ? col.order : idx,
      color: col.color || '#94A3B8'
    }));

    // Create project
    const project = await Project.create({
      name,
      description,
      workspace,
      owner: req.user._id,
      color,
      columns,
      members: []
    });

    // Create a mapping of AI column names to actual project column IDs
    const columnMapping = {};
    structure.forEach((aiCol, idx) => {
      const projectCol = columns[idx];
      // Map by both name and columnId for flexibility
      columnMapping[aiCol.name] = projectCol.columnId;
      columnMapping[aiCol.columnId] = projectCol.columnId;
    });

    // Create tasks for each column
    let createdTasks = [];
    for (let colIdx = 0; colIdx < structure.length; colIdx++) {
      const aiCol = structure[colIdx];
      const projectCol = columns[colIdx];
      const colId = projectCol.columnId;
      
      console.log(`📝 Processing column ${colIdx} (${projectCol.name}):`, aiCol.tasks?.length || 0, 'tasks');
      
      for (const taskObj of aiCol.tasks || []) {
        if (!taskObj.title) {
          console.warn('⚠️ Skipping task with no title');
          continue;
        }

        const checklist = (taskObj.subtasks || []).map((subtask, idx) => ({
          text: subtask,
          completed: false,
          order: idx
        }));

        try {
          console.log(`✏️ Creating task: "${taskObj.title}" in column "${colId}"`);
          
          // Map columnId to status
          let status = 'todo';
          if (aiCol.columnId === 'col_in_progress') status = 'in-progress';
          else if (aiCol.columnId === 'col_review') status = 'review';
          else if (aiCol.columnId === 'col_completed') status = 'completed';
          
          const task = await Task.create({
            title: taskObj.title,
            description: taskObj.description || '',
            project: project._id,
            column: colId,
            order: createdTasks.filter(t => t.column === colId).length,
            reporter: req.user._id,
            priority: taskObj.priority || 'medium',
            checklist,
            status: status
          });
          
          console.log(`✅ Task created: ${task._id}`);
          createdTasks.push(task);
        } catch (err) {
          console.error('❌ Failed creating task:', err.message);
          console.error('Task data:', { title: taskObj.title, column: colId, projectId: project._id });
        }
      }
    }

    await project.populate('owner', 'name email avatar');

    console.log('🎉 Project generation complete:', createdTasks.length, 'tasks created');

    res.status(201).json({
      success: true,
      message: `Project created with ${createdTasks.length} tasks`,
      project,
      tasksCreated: createdTasks.length
    });
  } catch (error) {
    console.error('AI create project error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get workspace insights
// @route   GET /api/ai/insights/:workspaceId
// @access  Private
exports.getWorkspaceInsights = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Fetch some basic data to analyze. In a real app, this might be more complex.
    const projects = await Project.find({ workspace: workspaceId }).select('_id name');
    const projectIds = projects.map(p => p._id);
    const tasks = await Task.find({ project: { $in: projectIds } }).select('title status dueDate priority');

    const insights = await aiService.generateWorkspaceInsights(workspaceId, projects, tasks);
    res.status(200).json({ success: true, insights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

