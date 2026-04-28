declare module 'citation-js' {
  export default class Cite {
    data: any[]
    constructor(input: any)
    format(format: string, options?: Record<string, unknown>): string
  }
}
