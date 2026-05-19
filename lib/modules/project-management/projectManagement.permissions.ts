export const PROJECT_MANAGEMENT_PERMISSIONS = {
  view: 'project_management.view',
  createTask: 'project_management.create_task',
  editTask: 'project_management.edit_task',
  deleteTask: 'project_management.delete_task',
  assignTask: 'project_management.assign_task',
  manageProjects: 'project_management.manage_projects',
  manageBoards: 'project_management.manage_boards',
  manageWorkflows: 'project_management.manage_workflows',
  viewReports: 'project_management.view_reports',
  manageAll: 'project_management.manage_all',
} as const

export type ProjectManagementPermissionKey = keyof typeof PROJECT_MANAGEMENT_PERMISSIONS
