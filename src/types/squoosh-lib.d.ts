declare module '@squoosh/lib' {
  export class ImagePool {
    constructor(concurrency?: number);
    ingestImage(data: BufferSource | string): any;
    close(): Promise<void>;
  }
}
