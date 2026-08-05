import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const TABLE_ROW_RE = /^\|.*\|$/;
const TABLE_SEPARATOR_RE = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/;

/** The assistant writes lightweight markdown (bold, bullet lists, and — for
 * "top 5" style answers — GFM tables) — this renders just that subset
 * without pulling in a full markdown parser. */
export function AiMessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] | null = null;
  let blockKey = 0;

  function flushList() {
    if (listItems && listItems.length > 0) {
      blocks.push(
        <ul key={`list-${blockKey++}`} className="my-1 list-disc space-y-0.5 pl-4">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item, `li-${blockKey}-${i}`)}</li>
          ))}
        </ul>,
      );
    }
    listItems = null;
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // GFM table: a "|...|" header line immediately followed by a
    // "|---|---|" separator line.
    if (TABLE_ROW_RE.test(trimmed) && TABLE_SEPARATOR_RE.test((lines[i + 1] ?? "").trim())) {
      flushList();
      const header = splitTableRow(trimmed);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && TABLE_ROW_RE.test(lines[j].trim())) {
        rows.push(splitTableRow(lines[j]));
        j++;
      }
      const tableKey = blockKey++;
      blocks.push(
        <div key={`table-${tableKey}`} className="my-1 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-glass-border">
                {header.map((cell, c) => (
                  <th key={c} className="px-2 py-1 font-bold text-ink">
                    {renderInline(cell, `th-${tableKey}-${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-b border-glass-border/50 last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-2 py-1">
                      {renderInline(cell, `td-${tableKey}-${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = j;
      continue;
    }

    const bulletMatch = /^[-*]\s+(.*)/.exec(trimmed);
    if (bulletMatch) {
      listItems = listItems ?? [];
      listItems.push(bulletMatch[1]);
      i++;
      continue;
    }

    flushList();
    if (trimmed === "") {
      blocks.push(<div key={`br-${blockKey++}`} className="h-1.5" />);
    } else {
      blocks.push(
        <p key={`p-${blockKey++}`} className="leading-relaxed">
          {renderInline(line, `p-${blockKey}`)}
        </p>,
      );
    }
    i++;
  }
  flushList();

  return <div className="flex flex-col gap-0.5">{blocks}</div>;
}
