export const PROJECT_MANAGEMENT_PERMISSIONS = {
  projectsView: 'projects.view',
  projectsEdit: 'projects.edit',
  projectsCreate: 'projects.create',
  projectsDelete: 'projects.delete',
  tasksView: 'tasks.view',
  tasksCreate: 'tasks.create',
  tasksEdit: 'tasks.edit',
  tasksAssign: 'tasks.assign',
  tasksTransition: 'tasks.transition',
  tasksComment: 'tasks.comment',
  tasksAttachmentsManage: 'tasks.attachmentsManage',
  tasksDelete: 'tasks.delete',
  admin: 'projects.admin',
  // Compatibility aliases for older mock UI imports.
  view: 'projects.view',
  createTask: 'tasks.create',
  editTask: 'tasks.edit',
  deleteTask: 'tasks.delete',
  assignTask: 'tasks.assign',
  manageProjects: 'projects.edit',
  manageBoards: 'tasks.transition',
  manageWorkflows: 'projects.admin',
  viewReports: 'projects.view',
  manageAll: 'projects.admin',
} as const

export type ProjectManagementPermissionKey = keyof typeof PROJECT_MANAGEMENT_PERMISSIONS
