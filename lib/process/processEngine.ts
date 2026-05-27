// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: process
// TARGET_FASTAPI_ENDPOINT: /api/v1/processes
// NOTES: Process Engine core should move to Python Process Domain.

import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CompanyBranchClosingSchema,
  runCompanyBranchClosingOrchestrator,
} from '@/lib/operations/orchestrators/companyBranchClosing.orchestrator'
import {
  CompanyBranchOpeningSchema,
  runCompanyBranchOpeningOrchestrator,
} from '@/lib/operations/orchestrators/companyBranchOpening.orchestrator'
import { isMissingInfrastructureError } from '@/lib/operations/operationRequestService'
import { getProcessDefinition } from './processRegistry'
import { ProcessInstanceService } from './processInstanceService'
import { ProcessTaskService } from './processTaskService'
import { ProcessApprovalService } from './processApprovalService'
import { recordProcessEvent } from './processEvents'
import { requireProcessStartAccess } from './processGuards'
import {
  canCancelProcess,
  firstProcessStep,
  getProcessStep,
  isTerminalProcessStatus,
  nextStepForAction,
  statusForStep,
} from './processStateMachine'
import { processFailure, processMissingInfrastructure, processSuccess } from './processResponse'
import type {
  ProcessDefinition,
  ProcessEngineContext,
  ProcessEngineResult,
  ProcessInstance,
  ProcessStartInput,
  ProcessStepDefinition,
} from './process.types'

export class ProcessEngine {
  private readonly instances: ProcessInstanceService
  private readonly tasks: ProcessTaskService
  private readonly approvals: ProcessApprovalService

  constructor(private readonly context: ProcessEngineContext) {
    this.instances = new ProcessInstanceService(context.supabase, context.tenantContext)
    this.tasks = new ProcessTaskService(context.supabase, context.tenantContext)
    this.approvals = new ProcessApprovalService(context.supabase, context.tenantContext)
  }

  async startProcess(input: ProcessStartInput): Promise<ProcessEngineResult<ProcessInstance>> {
    try {
      const definition = getProcessDefinition(input.processKey)
      if (!definition) return processFailure('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)
      if (this.context.request) {
        const access = await requireProcessStartAccess(this.context.request, this.context.supabase, definition)
        if (access instanceof Response) {
          const body = await access.clone().json().catch(() => ({}))
          return processFailure(
            body.error || 'Bu sureci baslatmak icin gerekli yetkiniz bulunmuyor.',
            body.code || 'PROCESS_START_DENIED',
            access.status || 403,
            body.details
          )
        }
      }

      const firstStep = firstProcessStep(definition)
      const instance = await this.instances.create(definition, {
        ...input,
        moduleKey: input.moduleKey || definition.moduleKey,
        entityType: input.entityType || definition.entityType,
        operationKey: input.operationKey || definition.operationKey,
      }, firstStep?.key || null)

      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: instance,
        eventType: 'process.started',
        stepKey: firstStep?.key || null,
        newStatus: instance.status,
        payload: input.payload,
        createdBy: input.startedBy || this.context.userId || null,
      })

      if (firstStep) await this.enterStep(instance, definition, firstStep)
      if (input.autoRun) await this.runAutoSteps(instance.id)

      const current = await this.instances.get(instance.id)
      return processSuccess(current || instance, 201)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message, table: 'process_instances' })
      return processFailure(error?.message || 'Surec baslatilamadi.', error?.code || 'PROCESS_START_FAILED', 500)
    }
  }

  async completeStep(processInstanceId: string, stepKey: string, payload: Record<string, any> = {}) {
    try {
      const instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      if (isTerminalProcessStatus(instance.status)) return processFailure('Tamamlanmis veya iptal edilmis surecte adim tamamlanamaz.', 'PROCESS_TERMINAL', 409)

      const definition = getProcessDefinition(instance.process_key, instance.process_version)
      if (!definition) return processFailure('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)
      if (instance.current_step_key !== stepKey) {
        return processFailure('Bu adim surecin mevcut adimi degil.', 'PROCESS_STEP_MISMATCH', 409, {
          current_step_key: instance.current_step_key,
          requested_step_key: stepKey,
        })
      }

      const currentStep = getProcessStep(definition, stepKey)
      if (!currentStep) return processFailure('Surec adimi bulunamadi.', 'PROCESS_STEP_NOT_FOUND', 404)

      await this.completeOpenTasks(instance, stepKey, payload)
      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: instance,
        eventType: 'process.step_completed',
        stepKey,
        oldStatus: instance.status,
        payload,
        createdBy: this.context.userId || null,
      })

      const nextStep = nextStepForAction(definition, stepKey, 'complete')
      const moved = nextStep
        ? await this.instances.moveToStep(instance, nextStep.key, statusForStep(nextStep))
        : await this.instances.complete(instance, payload, this.context.userId || null)

      if (nextStep) {
        await this.enterStep(moved, definition, nextStep, payload)
        if (moved.status === 'completed') {
          await recordProcessEvent({
            supabase: this.context.supabase,
            tenantContext: this.context.tenantContext,
            process: moved,
            eventType: 'process.completed',
            stepKey: nextStep.key,
            newStatus: 'completed',
            payload: moved.result_json || {},
            createdBy: this.context.userId || null,
          })
        }
        await this.runAutoSteps(moved.id)
      }

      const current = await this.instances.get(moved.id)
      return processSuccess(current || moved)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Surec adimi tamamlanamadi.', error?.code || 'PROCESS_STEP_COMPLETE_FAILED', 500)
    }
  }

  async moveToStep(processInstanceId: string, nextStepKey: string) {
    try {
      const instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      const definition = getProcessDefinition(instance.process_key, instance.process_version)
      if (!definition) return processFailure('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)
      const step = getProcessStep(definition, nextStepKey)
      if (!step) return processFailure('Surec adimi bulunamadi.', 'PROCESS_STEP_NOT_FOUND', 404)
      const moved = await this.instances.moveToStep(instance, step.key, statusForStep(step))
      await this.enterStep(moved, definition, step)
      return processSuccess(moved)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Surec adimi degistirilemedi.', error?.code || 'PROCESS_MOVE_FAILED', 500)
    }
  }

  async cancelProcess(processInstanceId: string, reason = 'Kullanici tarafindan iptal edildi.') {
    try {
      const instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      const definition = getProcessDefinition(instance.process_key, instance.process_version)
      if (!definition) return processFailure('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)
      if (!canCancelProcess(instance, definition)) return processFailure('Bu durumda surec iptal edilemez.', 'PROCESS_CANCEL_NOT_ALLOWED', 409)
      const cancelled = await this.instances.cancel(instance, reason, this.context.userId || null)
      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: cancelled,
        eventType: 'process.cancelled',
        oldStatus: instance.status,
        newStatus: 'cancelled',
        payload: { reason },
        createdBy: this.context.userId || null,
      })
      return processSuccess(cancelled)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Surec iptal edilemedi.', error?.code || 'PROCESS_CANCEL_FAILED', 500)
    }
  }

  async failProcess(processInstanceId: string, errorPayload: Record<string, any>) {
    try {
      const instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      const failed = await this.instances.fail(instance, errorPayload)
      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: failed,
        eventType: 'process.failed',
        oldStatus: instance.status,
        newStatus: 'failed',
        payload: errorPayload,
        createdBy: this.context.userId || null,
      })
      return processSuccess(failed)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Surec basarisiz olarak isaretlenemedi.', error?.code || 'PROCESS_FAIL_FAILED', 500)
    }
  }

  async completeProcess(processInstanceId: string, result: Record<string, any> = {}) {
    try {
      const instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      const completed = await this.instances.complete(instance, result, this.context.userId || null)
      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: completed,
        eventType: 'process.completed',
        oldStatus: instance.status,
        newStatus: 'completed',
        payload: result,
        createdBy: this.context.userId || null,
      })
      return processSuccess(completed)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Surec tamamlanamadi.', error?.code || 'PROCESS_COMPLETE_FAILED', 500)
    }
  }

  async getProcessStatus(processInstanceId: string) {
    try {
      const instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      return processSuccess({
        id: instance.id,
        status: instance.status,
        current_step_key: instance.current_step_key,
        operation_id: instance.operation_id,
      })
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Surec durumu okunamadi.', error?.code || 'PROCESS_STATUS_FAILED', 500)
    }
  }

  async runAutoSteps(processInstanceId: string): Promise<ProcessEngineResult<ProcessInstance | null>> {
    try {
      let instance = await this.instances.get(processInstanceId)
      if (!instance) return processFailure('Surec kaydi bulunamadi.', 'PROCESS_NOT_FOUND', 404)
      const definition = getProcessDefinition(instance.process_key, instance.process_version)
      if (!definition) return processFailure('Surec tanimi bulunamadi.', 'PROCESS_DEFINITION_NOT_FOUND', 404)

      for (let guard = 0; guard < 5; guard += 1) {
        if (!instance.current_step_key || isTerminalProcessStatus(instance.status)) break
        const step = getProcessStep(definition, instance.current_step_key)
        if (!step || !['system', 'operation', 'notification'].includes(step.type)) break

        if (step.type === 'operation') {
          const operationResult = await this.executeOperationStep(instance, step)
          if (!operationResult.ok) {
            await this.instances.fail(instance, {
              code: operationResult.code,
              error: operationResult.error,
              details: operationResult.details,
            })
            return processFailure(
              operationResult.error || 'Surec operasyon adimi tamamlanamadi.',
              operationResult.code || 'PROCESS_OPERATION_FAILED',
              operationResult.status || 500,
              operationResult.details
            )
          }
          instance = await this.instances.update(instance.id, {
            operation_id: operationResult.data?.operation_id || instance.operation_id || null,
            result_json: {
              ...(instance.result_json || {}),
              operation_result: operationResult.data,
            },
          })
        }

        const nextStep = nextStepForAction(definition, step.key, 'complete')
        if (!nextStep) {
          instance = await this.instances.complete(instance, instance.result_json || {}, this.context.userId || null)
          await recordProcessEvent({
            supabase: this.context.supabase,
            tenantContext: this.context.tenantContext,
            process: instance,
            eventType: 'process.completed',
            stepKey: step.key,
            newStatus: 'completed',
            createdBy: this.context.userId || null,
          })
          break
        }

        const oldStatus = instance.status
        instance = await this.instances.moveToStep(instance, nextStep.key, statusForStep(nextStep))
        await recordProcessEvent({
          supabase: this.context.supabase,
          tenantContext: this.context.tenantContext,
          process: instance,
          eventType: 'process.step_completed',
          stepKey: step.key,
          oldStatus,
          newStatus: instance.status,
          createdBy: this.context.userId || null,
        })
        await this.enterStep(instance, definition, nextStep)
        if (instance.status === 'completed') {
          await recordProcessEvent({
            supabase: this.context.supabase,
            tenantContext: this.context.tenantContext,
            process: instance,
            eventType: 'process.completed',
            stepKey: nextStep.key,
            newStatus: 'completed',
            payload: instance.result_json || {},
            createdBy: this.context.userId || null,
          })
          break
        }
      }

      return processSuccess(instance)
    } catch (error: any) {
      if (isMissingInfrastructureError(error)) return processMissingInfrastructure({ source: error.message })
      return processFailure(error?.message || 'Otomatik surec adimlari calistirilamadi.', error?.code || 'PROCESS_AUTO_STEP_FAILED', 500)
    }
  }

  private async enterStep(
    instance: ProcessInstance,
    _definition: ProcessDefinition,
    step: ProcessStepDefinition,
    payload: Record<string, any> = {}
  ) {
    if (step.type === 'form' || step.type === 'review') {
      const task = await this.tasks.createTask({ process: instance, step, payload })
      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: instance,
        eventType: 'process.task_created',
        stepKey: step.key,
        payload: { task_id: task.id },
        createdBy: this.context.userId || null,
      })
    }

    if (step.type === 'approval') {
      const task = await this.tasks.createTask({ process: instance, step, payload })
      const approval = await this.approvals.createApproval({
        process: instance,
        step,
        taskId: task.id,
        requestedBy: this.context.userId || instance.started_by || null,
        payload,
      })
      await recordProcessEvent({
        supabase: this.context.supabase,
        tenantContext: this.context.tenantContext,
        process: instance,
        eventType: 'process.approval_requested',
        stepKey: step.key,
        payload: { task_id: task.id, approval_id: approval.id },
        createdBy: this.context.userId || null,
      })
    }
  }

  private async completeOpenTasks(instance: ProcessInstance, stepKey: string, result: Record<string, any>) {
    const tasks = await this.tasks.listProcessTasks(instance.id)
    await Promise.all(tasks
      .filter(task => task.step_key === stepKey && ['open', 'in_progress', 'overdue'].includes(task.status))
      .map(task => this.tasks.completeTask(task.id, this.context.userId || null, result)))
  }

  private async executeOperationStep(instance: ProcessInstance, step: ProcessStepDefinition): Promise<ProcessEngineResult<Record<string, any>>> {
    if (!this.context.request) {
      return processFailure('Bu operasyon adimi request baglami olmadan calistirilamaz.', 'PROCESS_REQUEST_REQUIRED', 409)
    }

    const operationKey = step.operationKey || instance.operation_key
    if (operationKey === 'branch_opening') {
      const parsed = CompanyBranchOpeningSchema.safeParse(instance.payload_json || {})
      if (!parsed.success) return processFailure('Sube acilisi surec verisi gecersiz.', 'PROCESS_OPERATION_PAYLOAD_INVALID', 400, parsed.error.flatten())
      const result = await runCompanyBranchOpeningOrchestrator({
        request: this.context.request,
        companyId: String(instance.company_id || instance.payload_json?.company_id || ''),
        input: parsed.data,
        rawBody: instance.payload_json || {},
      })
      if (!result.ok) return processFailure(result.error || 'Sube acilisi tamamlanamadi.', result.code || 'PROCESS_OPERATION_FAILED', result.status || 500, result.details)
      return processSuccess({
        ...result.data,
        operation_id: result.operation_id,
        operation_status: result.operation_status,
        warnings: result.warnings,
      })
    }

    if (operationKey === 'branch_closing') {
      const parsed = CompanyBranchClosingSchema.safeParse(instance.payload_json || {})
      if (!parsed.success) return processFailure('Sube kapanisi surec verisi gecersiz.', 'PROCESS_OPERATION_PAYLOAD_INVALID', 400, parsed.error.flatten())
      const result = await runCompanyBranchClosingOrchestrator({
        request: this.context.request,
        companyId: String(instance.company_id || instance.payload_json?.company_id || ''),
        input: parsed.data,
        rawBody: instance.payload_json || {},
      })
      if (!result.ok) return processFailure(result.error || 'Sube kapanisi tamamlanamadi.', result.code || 'PROCESS_OPERATION_FAILED', result.status || 500, result.details)
      return processSuccess({
        ...result.data,
        operation_id: result.operation_id,
        operation_status: result.operation_status,
        warnings: result.warnings,
      })
    }

    return processFailure('Bu operasyon henuz Process Engine uzerinden calistirilmiyor.', 'PROCESS_OPERATION_NOT_IMPLEMENTED', 501, {
      operation_key: operationKey,
    })
  }
}

export function createProcessEngine(supabase: SupabaseClient, context: Omit<ProcessEngineContext, 'supabase'>) {
  return new ProcessEngine({ ...context, supabase })
}
