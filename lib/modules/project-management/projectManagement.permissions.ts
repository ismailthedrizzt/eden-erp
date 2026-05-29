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
} as const

export type ProjectManagementPermissionKey = keyof typeof PROJECT_MANAGEMENT_PERMISSIONS
