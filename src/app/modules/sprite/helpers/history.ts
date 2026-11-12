export interface Command {
  redo(): void;
  undo(): void;
}

/** Several commands as one history entry (a brush stroke). Undone in reverse order. */
export function compositeCommand(commands: Command[]): Command {
  return {
    redo: () => commands.forEach((c) => c.redo()),
    undo: () => [...commands].reverse().forEach((c) => c.undo()),
  };
}

/** Command based undo / redo. */
export class History {
  private undos: Command[] = [];
  private redos: Command[] = [];

  execute(command: Command): void {
    command.redo();
    this.undos.push(command);
    this.redos = [];
  }

  /** Swaps the last entry (to merge a burst of small edits). Runs the new command. */
  replaceTop(command: Command): void {
    this.undos.pop();
    this.execute(command);
  }

  undo(): void {
    const command = this.undos.pop();
    if (!command) return;
    command.undo();
    this.redos.push(command);
  }

  redo(): void {
    const command = this.redos.pop();
    if (!command) return;
    command.redo();
    this.undos.push(command);
  }

  canUndo(): boolean {
    return this.undos.length > 0;
  }

  canRedo(): boolean {
    return this.redos.length > 0;
  }

  clear(): void {
    this.undos = [];
    this.redos = [];
  }
}
