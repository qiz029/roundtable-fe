import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const remarkPlugins = [remarkGfm];

type MarkdownContentProps = {
  children: string;
  variant?: "body" | "excerpt";
};

export function MarkdownContent({ children, variant = "body" }: MarkdownContentProps) {
  return (
    <div className={`markdownContent ${variant === "excerpt" ? "markdownContentExcerpt" : "markdownContentBody"}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins}>{children}</ReactMarkdown>
    </div>
  );
}
