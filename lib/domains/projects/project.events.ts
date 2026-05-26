export const projectDomainEvents = [
  'project.created',
  'project.task_created',
  'project.task_completed',
] as const

export type ProjectDomainEvent = (typeof projectDomainEvents)[number]

