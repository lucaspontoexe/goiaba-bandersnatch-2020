interface BaseSegment {
  name: string;
  files: string[];
}

export interface Segment extends BaseSegment {
  promptIn: number;
  decisionTimeout: number;
  nextSegmentIn: number;
  options: [{ name: string; goto: string }];
}

export interface FinalSegment extends BaseSegment {
  endIn: number;
}
