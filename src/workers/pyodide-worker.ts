/**
 * Pyodide Web Worker
 * 
 * Runs Python code in an isolated thread using Pyodide (WebAssembly).
 * Communicates via postMessage with request/response ID tracking.
 */

// Pyodide CDN URL - using latest stable version
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

// Type definitions for messages
interface ExecuteRequest {
    id: number
    type: 'execute'
    code: string
    context?: Record<string, unknown>
}

interface ExecuteResponse {
    id: number
    success: boolean
    result?: string
    error?: string
    stdout?: string
    stderr?: string
}

// Will hold the Pyodide instance once loaded
let pyodide: any = null
let loadPromise: Promise<void> | null = null

// Capture stdout/stderr
let stdoutBuffer: string[] = []
let stderrBuffer: string[] = []

async function initPyodide(): Promise<void> {
    if (pyodide) return
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
        // Import Pyodide dynamically
        const { loadPyodide } = await import('pyodide')

        pyodide = await loadPyodide({
            indexURL: PYODIDE_INDEX_URL,
            stdout: (text: string) => stdoutBuffer.push(text),
            stderr: (text: string) => stderrBuffer.push(text),
        })

        // Load commonly used packages
        await pyodide.loadPackage(['numpy', 'micropip'])

        self.postMessage({ type: 'ready', language: 'python' })
    })()

    return loadPromise
}

async function executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
    // Clear output buffers
    stdoutBuffer = []
    stderrBuffer = []

    try {
        // Ensure Pyodide is loaded
        await initPyodide()

        // Set context variables if provided
        if (request.context) {
            for (const [key, value] of Object.entries(request.context)) {
                pyodide.globals.set(key, pyodide.toPy(value))
            }
        }

        // Execute the code
        const result = await pyodide.runPythonAsync(request.code)

        // Convert result to string representation
        let resultStr: string | undefined
        if (result !== undefined && result !== null) {
            try {
                resultStr = result.toString()
            } catch {
                resultStr = String(result)
            }
        }

        return {
            id: request.id,
            success: true,
            result: resultStr,
            stdout: stdoutBuffer.join('\n'),
            stderr: stderrBuffer.join('\n'),
        }
    } catch (error: any) {
        return {
            id: request.id,
            success: false,
            error: error.message || String(error),
            stdout: stdoutBuffer.join('\n'),
            stderr: stderrBuffer.join('\n'),
        }
    }
}

// Message handler
self.onmessage = async (event: MessageEvent) => {
    const data = event.data

    switch (data.type) {
        case 'init':
            try {
                await initPyodide()
            } catch (error: any) {
                self.postMessage({ type: 'error', error: error.message })
            }
            break

        case 'execute':
            const response = await executeCode(data as ExecuteRequest)
            self.postMessage(response)
            break

        case 'interrupt':
            // Pyodide doesn't support true interrupts, but we can restart
            pyodide = null
            loadPromise = null
            self.postMessage({ type: 'interrupted' })
            break

        default:
            self.postMessage({ type: 'error', error: `Unknown message type: ${data.type}` })
    }
}

// Start loading Pyodide immediately
initPyodide().catch(console.error)
