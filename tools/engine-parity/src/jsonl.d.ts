/** The corpus is bundled into the driver as text: one request per line. */
declare module '*.jsonl' {
  const text: string;
  export default text;
}
