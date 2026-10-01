/** One ordered stream per patient draft owner; failed writes remain a barrier to finalization. */
export class DraftWriter<T> {
  private tail: Promise<void> = Promise.resolve();
  private error: unknown;
  constructor(
    private save: (data: T, version: number) => Promise<number>,
    private version: number,
  ) {}
  write(data: T): Promise<void> {
    const next = this.tail
      .catch(() => undefined)
      .then(async () => {
        try {
          this.version = await this.save(data, this.version);
          this.error = undefined;
        } catch (error) {
          this.error = error;
          throw error;
        }
      });
    this.tail = next;
    return next;
  }
  async flush(): Promise<number> {
    await this.tail;
    if (this.error) throw this.error;
    return this.version;
  }
}
