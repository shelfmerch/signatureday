declare module '@jsquash/oxipng' {
  export function oxipng(input: BufferSource, options?: { level?: number }): Promise<Uint8Array>;
}
