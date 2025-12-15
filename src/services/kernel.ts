/**
 * Kernel Service
 * 
 * Unified API for managing code execution Workers (Pyodide/WebR).
 * Provides timeout handling, request/response tracking, and kernel restart capability.
 */

import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

// Execution result type
export interface ExecutionResult {
    success: boolean
    result?: string
    error?: string
    stdout?: string
    stderr?: string
    output?: string[]
    executionTime: number
}

// Kernel state
export type KernelStatus = 'idle' | 'loading' | 'ready' | 'busy' | 'error' | 'dead'

export interface KernelState {
    status: KernelStatus
    language: 'python' | 'r'
    error?: string
}

// Internal request tracking
interface PendingRequest {
    resolve: (result: ExecutionResult) => void
    reject: (error: Error) => void
    startTime: number
    timeoutId: ReturnType<typeof setTimeout>
}

// Default timeout (30 seconds)
const DEFAULT_TIMEOUT_MS = 30000

class Kernel {
    private worker: Worker | null = null
    private language: 'python' | 'r'
    private pendingRequests: Map<number, PendingRequest> = new Map()
    private nextRequestId = 1
    private _status: Ref<KernelStatus> = ref('idle')
    private _error: Ref<string | undefined> = ref(undefined)
    private timeoutMs: number

    constructor(language: 'python' | 'r', timeoutMs = DEFAULT_TIMEOUT_MS) {
        this.language = language
        this.timeoutMs = timeoutMs
    }

    get status(): Ref<KernelStatus> {
        return this._status
    }

    get error(): Ref<string | undefined> {
        return this._error
    }

    /**
     * Initialize the kernel (load the Worker and runtime)
     */
    async init(): Promise<void> {
        if (this.worker) return

        this._status.value = 'loading'
        this._error.value = undefined

        try {
            // Create the appropriate Worker
            if (this.language === 'python') {
                this.worker = new Worker(
                    new URL('../workers/pyodide-worker.ts', import.meta.url),
                    { type: 'module' }
                )
            } else {
                this.worker = new Worker(
                    new URL('../workers/webr-worker.ts', import.meta.url),
                    { type: 'module' }
                )
            }

            // Setup message handler
            this.worker.onmessage = this.handleMessage.bind(this)
            this.worker.onerror = this.handleError.bind(this)

            // Wait for ready signal
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Kernel initialization timed out'))
                }, 60000) // 60s for initial load

                const handler = (event: MessageEvent) => {
                    if (event.data.type === 'ready') {
                        clearTimeout(timeout)
                        this.worker?.removeEventListener('message', handler)
                        resolve()
                    } else if (event.data.type === 'error') {
                        clearTimeout(timeout)
                        this.worker?.removeEventListener('message', handler)
                        reject(new Error(event.data.error))
                    }
                }
                this.worker?.addEventListener('message', handler)
            })

            this._status.value = 'ready'
        } catch (error: any) {
            this._status.value = 'error'
            this._error.value = error.message
            throw error
        }
    }

    /**
     * Execute code and return the result
     */
    async execute(code: string, context?: Record<string, unknown>): Promise<ExecutionResult> {
        if (!this.worker) {
            await this.init()
        }

        if (this._status.value === 'dead') {
            throw new Error('Kernel is dead. Please restart.')
        }

        const requestId = this.nextRequestId++
        this._status.value = 'busy'

        return new Promise((resolve, reject) => {
            const startTime = Date.now()

            // Setup timeout
            const timeoutId = setTimeout(() => {
                const pending = this.pendingRequests.get(requestId)
                if (pending) {
                    this.pendingRequests.delete(requestId)
                    this._status.value = 'error'
                    this._error.value = 'Execution timed out'

                    // Kill the worker and mark as dead
                    this.terminate()

                    resolve({
                        success: false,
                        error: `Execution timed out after ${this.timeoutMs / 1000}s. Kernel has been terminated.`,
                        executionTime: Date.now() - startTime,
                    })
                }
            }, this.timeoutMs)

            this.pendingRequests.set(requestId, { resolve, reject, startTime, timeoutId })

            // Send execution request
            this.worker?.postMessage({
                id: requestId,
                type: 'execute',
                code,
                context,
            })
        })
    }

    /**
     * Interrupt current execution (restarts the kernel)
     */
    async interrupt(): Promise<void> {
        if (!this.worker) return

        // For now, interrupting means terminating and restarting
        this.terminate()
        this._status.value = 'idle'

        // Could auto-restart here if desired
        // await this.init()
    }

    /**
     * Restart the kernel
     */
    async restart(): Promise<void> {
        this.terminate()
        this._status.value = 'idle'
        await this.init()
    }

    /**
     * Terminate the worker
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate()
            this.worker = null
        }

        // Reject all pending requests
        for (const [_id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeoutId)
            pending.resolve({
                success: false,
                error: 'Kernel terminated',
                executionTime: Date.now() - pending.startTime,
            })
        }
        this.pendingRequests.clear()
        this._status.value = 'dead'
    }

    private handleMessage(event: MessageEvent): void {
        const data = event.data

        // Handle execution responses
        if (data.id !== undefined) {
            const pending = this.pendingRequests.get(data.id)
            if (pending) {
                clearTimeout(pending.timeoutId)
                this.pendingRequests.delete(data.id)

                const executionTime = Date.now() - pending.startTime
                this._status.value = 'ready'

                pending.resolve({
                    success: data.success,
                    result: data.result,
                    error: data.error,
                    stdout: data.stdout,
                    stderr: data.stderr,
                    output: data.output,
                    executionTime,
                })
            }
        }
    }

    private handleError(error: ErrorEvent): void {
        console.error('[Kernel] Worker error:', error)
        this._status.value = 'error'
        this._error.value = error.message
    }
}

// Singleton kernel instances
const kernels: ShallowRef<Map<'python' | 'r', Kernel>> = shallowRef(new Map())

/**
 * Get or create a kernel for the specified language
 */
export function useKernel(language: 'python' | 'r'): Kernel {
    let kernel = kernels.value.get(language)
    if (!kernel) {
        kernel = new Kernel(language)
        kernels.value.set(language, kernel)
    }
    return kernel
}

/**
 * Execute code in the specified language
 */
export async function runCode(
    language: 'python' | 'r',
    code: string,
    context?: Record<string, unknown>
): Promise<ExecutionResult> {
    const kernel = useKernel(language)
    return kernel.execute(code, context)
}

/**
 * Get the status of a kernel
 */
export function getKernelStatus(language: 'python' | 'r'): Ref<KernelStatus> {
    const kernel = useKernel(language)
    return kernel.status
}

/**
 * Restart a kernel
 */
export async function restartKernel(language: 'python' | 'r'): Promise<void> {
    const kernel = useKernel(language)
    await kernel.restart()
}
