const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Fast and capable

exports.convertNotesToTasks = async (notes) => {
  try {
    const prompt = `
    You are an expert AI project manager. Given the following unstructured meeting notes, emails, or chat logs, your job is to extract actionable tasks with intelligent analysis.
    
    Requirements:
    - Identify distinct, actionable tasks from the text.
    - For each task, analyze and assign:
      - "title": concise task title (string)
      - "description": detailed description of what needs to be done (string)
      - "priority": analyze urgency/importance and assign one of: "urgent", "high", "medium", "low"
      - "status": determine the appropriate status: "todo" (not started), "in-progress" (already being worked on), "review" (needs review/feedback)
      - "dueDate": if a deadline is mentioned, format as ISO 8601 YYYY-MM-DD string, otherwise null
      - "subtasks": array of strings representing smaller checklist items / sub-steps to complete this task (2-5 items per task)
    
    Priority Guidelines:
    - "urgent": blockers, critical bugs, phrases like "ASAP", "immediately", "critical", "blocking"
    - "high": important deadlines, key deliverables, phrases like "important", "priority", "must have"
    - "medium": standard work items, regular tasks
    - "low": nice-to-haves, improvements, exploratory work
    
    Status Guidelines:
    - "todo": new tasks not yet started
    - "in-progress": tasks mentioned as currently being worked on, or with language like "working on", "started"
    - "review": tasks that need review, approval, or feedback
    
    Output ONLY valid JSON as an array of objects. No markdown, no explanation.
    
    Notes:
    """
    ${notes}
    """
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (jsonString.startsWith('[[')) jsonString = jsonString.slice(1, -1);
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error('Failed to convert notes to tasks with AI.');
  }
};

exports.rewriteToUserStory = async (taskDescription) => {
  try {
    const prompt = `
    You are an Agile Product Owner. Rewrite the following task description into a proper Scrum User Story format.
    Include standard sections:
    - **User Story**: As a <type of user>, I want <some goal> so that <some reason>.
    - **Acceptance Criteria**: List of criteria.
    - Output formatting should be standard readable text, optionally with markdown styling. Do not wrap in JSON.

    Task Description:
    """
    ${taskDescription}
    """
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error('Failed to rewrite task with AI.');
  }
};

exports.generateKanbanStructure = async (text) => {
  try {
    const prompt = `
    You are a Senior Project Management expert. Create a full Kanban board structure with high-quality, actionable tasks based on the following project description.
    
    Requirements:
    - Output ONLY valid JSON array - nothing else, no markdown, no explanations.
    - Output an array of exactly 4 column objects.
    - Each column object MUST have:
      - "columnId": Use exactly: "col_todo", "col_in_progress", "col_review", "col_completed"
      - "name": Use exactly: "To Do", "In Progress", "Review", "Completed"
      - "order": numeric order (0, 1, 2, 3)
      - "tasks": array of task objects
    - Each task object in the "tasks" array MUST have:
      - "title": concise, professional task title (string)
      - "description": clear, actionable description (string)
      - "priority": one of ("urgent", "high", "medium", "low")
      - "subtasks": array of strings (2-4 items)
    
    CRITICAL - Task Distribution Strategy (For a NEW project):
    - Most projects are generated from scratch, so the majority of tasks belong in "To Do".
    - "col_todo": (60-70% of tasks) - All planned work, features, and future requirements.
    - "col_in_progress": (15-20% of tasks) - Only the absolute first 2-3 logical steps (e.g., "Initial Repository Setup", "Environment Configuration").
    - "col_review": (5-10% of tasks) - Tasks that might be in a draft state or waiting for structural review.
    - "col_completed": (0-5% of tasks) - Only "Project Initialization" or "Concept Finalization". It's okay to have very few or zero here.
    
    Total Tasks: Generate 10-15 tasks in total. Ensure they are professional and specific to the user's project idea.
    
    Example output format:
    [
      { "columnId": "col_todo", "name": "To Do", "order": 0, "tasks": [...] },
      { "columnId": "col_in_progress", "name": "In Progress", "order": 1, "tasks": [...] },
      { "columnId": "col_review", "name": "Review", "order": 2, "tasks": [] },
      { "columnId": "col_completed", "name": "Completed", "order": 3, "tasks": [] }
    ]

    Project Description:
    """
    ${text}
    """
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // Extract JSON from response - handle various formats
    let jsonString = responseText;
    
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON array in the response
    const jsonArrayMatch = jsonString.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonArrayMatch) {
      jsonString = jsonArrayMatch[0];
    }
    
    jsonString = jsonString.trim();
    
    // Parse JSON
    const structure = JSON.parse(jsonString);
    
    // Validation and cleanup
    if (!Array.isArray(structure)) {
      throw new Error('AI response is not an array');
    }
    
    // Ensure each column has proper structure and at least one task
    const result_array = structure.map((col, idx) => {
      const cleanCol = {
        columnId: col.columnId || `col_${idx}`,
        name: col.name || 'Column',
        order: col.order !== undefined ? col.order : idx,
        tasks: Array.isArray(col.tasks) ? col.tasks.filter(t => t && t.title) : []
      };
      
      // Ensure tasks have required fields
      cleanCol.tasks = cleanCol.tasks.map(task => ({
        title: task.title || 'Untitled Task',
        description: task.description || '',
        priority: ['urgent', 'high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
        subtasks: Array.isArray(task.subtasks) ? task.subtasks : []
      }));
      
      return cleanCol;
    });
    
    // If no valid structure, generate default columns with sample tasks
    if (result_array.length === 0 || result_array.every(col => col.tasks.length === 0)) {
      console.warn('AI generated empty structure, creating defaults');
      return [
        {
          columnId: 'col_todo',
          name: 'To Do',
          order: 0,
          tasks: [
            {
              title: `Plan: ${text.substring(0, 30)}...`,
              description: `Planning and preparation for ${text}`,
              priority: 'high',
              subtasks: ['Define requirements', 'Create timeline']
            }
          ]
        },
        {
          columnId: 'col_in_progress',
          name: 'In Progress',
          order: 1,
          tasks: [
            {
              title: `Setup: ${text.substring(0, 30)}...`,
              description: 'Initial setup and configuration',
              priority: 'urgent',
              subtasks: ['Create structure', 'Setup tools']
            }
          ]
        },
        {
          columnId: 'col_review',
          name: 'Review',
          order: 2,
          tasks: [
            {
              title: 'Review and Testing',
              description: 'Testing and quality assurance',
              priority: 'medium',
              subtasks: ['Run tests', 'Check quality']
            }
          ]
        },
        {
          columnId: 'col_completed',
          name: 'Completed',
          order: 3,
          tasks: [
            {
              title: 'Deployment',
              description: 'Deploy to production',
              priority: 'high',
              subtasks: ['Final review', 'Deploy']
            }
          ]
        }
      ];
    }
    
    return result_array;
  } catch (error) {
    console.error("AI Service Error:", error.message);
    throw new Error('Failed to generate Kanban structure with AI: ' + error.message);
  }
};

exports.generateWorkspaceInsights = async (workspaceId, projects, tasks) => {
  try {
    const prompt = `
    You are an AI Workspace Analyst. I will provide you with a JSON summary of projects and tasks in a workspace.
    Analyze the data to provide 3 brief, actionable insights or recommendations for the team to improve efficiency, reallocate resources, or identify risks.
    Output ONLY an array of 3 concise string bullet points.
    
    Data Summary:
    Projects Count: ${projects.length}
    Tasks Count: ${tasks.length}
    Tasks Snippet (first 10): ${JSON.stringify(tasks.slice(0, 10).map(t => ({ title: t.title, status: t.status, dueDate: t.dueDate })))}
    `;

    const result = await model.generateContent(prompt);
    // Expecting newline separated bullet points or sentences.
    const text = result.response.text();
    const insights = text.split('\n').map(line => line.replace(/^[-\*\d\.]+\s*/, '').trim()).filter(line => line.length > 0).slice(0,3);
    return insights.length ? insights : ["Keep up the good work!", "Review upcoming deadlines.", "Ensure task loads are balanced."];
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error('Failed to generate insights with AI.');
  }
};
