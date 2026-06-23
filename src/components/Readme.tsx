import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/**
 * Renders an untrusted npm README (mixed markdown/HTML) safely.
 * Order matters: remark-gfm -> rehype-raw (parse embedded HTML) -> rehype-sanitize
 * (tag/attribute allowlist). No script/style/iframe survive the sanitize step.
 */
export function Readme({ source }: { source: string }) {
  return (
    <div className="prose prose-invert max-w-none prose-headings:scroll-mt-20 prose-a:text-sky-300 prose-code:text-neutral-300 prose-img:rounded">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, defaultSchema]]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}