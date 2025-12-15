/**
 * WebR Web Worker
 * 
 * Runs R code in an isolated thread using WebR (WebAssembly).
 * Communicates via postMessage with request/response ID tracking.
 */

import { WebR } from 'webr'
import type { RObject } from 'webr'

// Type definitions for messages
interface ExecuteRequest {
    id: number
    type: 'execute'
    code: string
}

interface ExecuteResponse {
    id: number
    success: boolean
    result?: string
    error?: string
    output?: string[]
}

// WebR instance
let webR: WebR | null = null
let loadPromise: Promise<void> | null = null

// Output buffer
let outputBuffer: string[] = []

async function initWebR(): Promise<void> {
    if (webR) return
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
        webR = new WebR({
            channelType: 1, // PostMessage channel (no SharedArrayBuffer required)
        })

        await webR.init()

        self.postMessage({ type: 'ready', language: 'r' })
    })()

    return loadPromise
}

async function executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
    outputBuffer = []

    try {
        await initWebR()
        if (!webR) throw new Error('WebR not initialized')

        // Capture output using shelter
        const shelter = await new webR.Shelter()

        try {
            const result = await shelter.captureR(request.code, {
                captureStreams: true,
                captureConditions: true,
            })

            // Collect output
            const output: string[] = []
            if (result.output) {
                for (const item of result.output) {
                    if (item.type === 'stdout' || item.type === 'stderr') {
                        output.push(item.data as string)
                    }
                }
            }

            // Get result value
            let resultStr: string | undefined
            if (result.result) {
                try {
                    const jsResult = await (result.result as RObject).toJs()
                    resultStr = JSON.stringify(jsResult, null, 2)
                } catch {
                    resultStr = '[R Object]'
                }
            }

            return {
                id: request.id,
                success: true,
                result: resultStr,
                output,
            }
        } finally {
            shelter.purge()
        }
    } catch (error: any) {
        return {
            id: request.id,
            success: false,
            error: error.message || String(error),
            output: outputBuffer,
        }
    }
}

// Message handler
self.onmessage = async (event: MessageEvent) => {
    const data = event.data

    switch (data.type) {
        case 'init':
            try {
                await initWebR()
            } catch (error: any) {
                self.postMessage({ type: 'error', error: error.message })
            }
            break

        case 'execute':
            const response = await executeCode(data as ExecuteRequest)
            self.postMessage(response)
            break

        case 'interrupt':
            // WebR doesn't support true interrupts, restart worker
            webR = null
            loadPromise = null
            self.postMessage({ type: 'interrupted' })
            break

        default:
            self.postMessage({ type: 'error', error: `Unknown message type: ${data.type}` })
    }
}

// Start loading WebR immediately
initWebR().catch(console.error)
