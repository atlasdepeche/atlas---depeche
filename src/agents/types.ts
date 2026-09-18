/** One raw piece of evidence handed to an agent — always a stored source_item, never a bare claim. */
export interface EvidenceInput {
  /** index into the array passed to the agent — how it refers back to a specific item */
  index: number;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string | null;
}

export interface EventInput {
  title: string;
  category: string;
}

export interface AgentRunOutcome<T> {
  status: "success" | "error";
  output: T | null;
  errorMessage: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  startedAt: Date;
  finishedAt: Date;
}
