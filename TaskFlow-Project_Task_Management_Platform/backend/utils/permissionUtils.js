/**
 * Check if a user has permission to access a project
 * @param {Object} project - Project document (with members populated if not owner)
 * @param {string} userId - ID of the user to check
 * @param {string} requiredRole - Minimum required role ('viewer', 'editor', 'admin')
 * @returns {boolean} - True if user has permission
 */
const checkProjectPermission = (project, userId, requiredRole = 'viewer') => {
  if (!project) return false;
  
  const ownerId = project.owner._id ? project.owner._id.toString() : project.owner.toString();
  const isOwner = ownerId === userId.toString();
  
  if (isOwner) return true; // Owner has all permissions (is effectively Admin)

  // Find member in project members array
  const member = project.members.find(m => {
    const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberId === userId.toString();
  });

  if (!member) return false;
  
  // Member must be active
  if (member.status !== 'active') return false;

  if (requiredRole === 'viewer') return true;
  if (requiredRole === 'editor') return ['admin', 'editor'].includes(member.role);
  if (requiredRole === 'admin') return member.role === 'admin';
  
  return false;
};

module.exports = {
  checkProjectPermission
};
