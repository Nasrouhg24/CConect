"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { WorldMap } from "@/components/map/WorldMap";
import { clusterByPlace, filterEntries } from "@/lib/entries";
import { buildTerminalTree } from "@/lib/terminal/terminal-data";
import {
  ROOT,
  complete,
  displayPath,
  execute,
  pathFromMapSelection,
  prompt,
  terminalView,
} from "@/lib/terminal/terminal-navigation";
import { parseInput } from "@/lib/terminal/terminal-parser";
import type { OutputBlock, TerminalPath } from "@/lib/terminal/terminal-types";
import type { Company, Entry } from "@/lib/types";

interface LogItem {
  id: number;
  /** Prompt tel qu'il était au moment de la commande. */
  prompt: string | null;
  input: string | null;
  blocks: OutputBlock[];
}

const MAX_LOG = 200;
const MAX_HISTORY = 100;

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

/**
 * Mode terminal : la carte, pilotée par `ls`, `cd` et `cat`.
 *
 * Un seul état fait foi : `path`. Le prompt, les filtres de la carte, son
 * cadrage et la ville sélectionnée en sont dérivés (`terminalView`). Une
 * commande change `path` ; un clic sur la carte change `path`. Il n'y a rien
 * d'autre à tenir d'accord.
 */
export function TerminalExplorer({ entries, companies }: { entries: Entry[]; companies: Company[] }) {
  const tree = useMemo(() => buildTerminalTree(entries, companies), [entries, companies]);

  const [path, setPath] = useState<TerminalPath>(ROOT);
  const [log, setLog] = useState<LogItem[]>([
    {
      id: 0,
      prompt: null,
      input: null,
      blocks: [
        {
          type: "text",
          lines: [
            "Mode terminal CConnect — le réseau se parcourt comme des dossiers.",
            "Commandes : ls (lister), cd (se déplacer), cat (afficher une fiche). Tab complète, ↑ ↓ rappellent l'historique.",
          ],
        },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  const desktop = useMediaQuery("(min-width: 768px)");
  const open = desktop || expanded;

  const view = useMemo(() => terminalView(path, tree), [path, tree]);
  const clusters = useMemo(
    () => clusterByPlace(filterEntries(entries, view.filters)),
    [entries, view.filters],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const inputId = useId();
  const logId = useId();

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log, open]);

  function push(item: Omit<LogItem, "id">) {
    const id = nextId.current++;
    setLog((current) => [...current, { ...item, id }].slice(-MAX_LOG));
  }

  function run(command: string) {
    const parsed = parseInput(command);
    const result = execute(parsed, path, tree, entries);
    push({ prompt: prompt(path, tree), input: command, blocks: result.blocks });
    setPath(result.path);
    if (parsed.type !== "empty") {
      setHistory((current) => [...current.filter((c) => c !== command), command].slice(-MAX_HISTORY));
    }
    setCursor(null);
  }

  /**
   * Clic sur un résultat de `ls` : même effet qu'un `cd`, mais vers le nœud
   * exact qui a été listé — un vieux résultat reste valable après s'être déplacé.
   * La commande affichée est le chemin absolu équivalent.
   */
  function openPath(target: TerminalPath) {
    const command = `cd ${displayPath(target, tree)}`;
    push({ prompt: prompt(path, tree), input: command, blocks: [] });
    setPath(target);
    setHistory((current) => [...current.filter((c) => c !== command), command].slice(-MAX_HISTORY));
    setCursor(null);
    inputRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      run(input);
      setInput("");
    } else if (event.key === "Tab") {
      event.preventDefault();
      const completion = complete(input, path, tree);
      setInput(completion.value);
      if (completion.options.length > 1) {
        push({
          prompt: prompt(path, tree),
          input,
          blocks: [{ type: "text", lines: [completion.options.join("   ")] }],
        });
      }
    } else if (event.key === "ArrowUp") {
      if (history.length === 0) return;
      event.preventDefault();
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(history[next]);
    } else if (event.key === "ArrowDown") {
      if (cursor === null) return;
      event.preventDefault();
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setInput("");
      } else {
        setCursor(next);
        setInput(history[next]);
      }
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setLog([]);
    }
  }

  const currentPrompt = prompt(path, tree);

  return (
    <section className="relative flex-1 overflow-hidden">
      <WorldMap
        clusters={clusters}
        selectedPlaceId={view.selectedPlaceId}
        onSelectPlace={(placeId) => setPath((current) => pathFromMapSelection(placeId, current, tree))}
        focusPlaceIds={view.focusPlaceIds}
        focusInset={desktop ? { right: 0.3, bottom: 0 } : { right: 0, bottom: open ? 0.55 : 0.1 }}
        panelOpen={open}
      />

      <div
        className={`absolute z-30 flex flex-col overflow-hidden border border-border-strong bg-surface-raised shadow-[var(--shadow-overlay)] ${
          desktop
            ? "bottom-5 right-5 top-5 w-[22.5rem] rounded-md"
            : `inset-x-0 bottom-0 rounded-t-lg ${open ? "h-[55%]" : ""}`
        }`}
      >
        <header className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <h1 className="min-w-0 flex-1 truncate text-list font-medium text-text">Terminal CConnect</h1>
          {!desktop ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={open}
              aria-controls={logId}
              className="rounded-sm px-2 py-1 text-meta text-text-muted hover:bg-surface-hover hover:text-text"
            >
              {open ? "Réduire" : "Ouvrir"}
            </button>
          ) : null}
          <Link
            href="/network"
            className="rounded-sm px-2 py-1 text-meta text-text-muted underline-offset-2 hover:bg-surface-hover hover:text-text"
          >
            Quitter le mode terminal
          </Link>
        </header>

        {!open ? (
          <p className="truncate px-3.5 py-2 font-mono text-meta text-text-muted">{currentPrompt}</p>
        ) : null}

        <div
          ref={logRef}
          id={logId}
          role="log"
          aria-live="polite"
          aria-label="Sortie du terminal"
          hidden={!open}
          onClick={(event) => {
            // Un clic dans le vide rend la main au clavier ; un lien garde son clic.
            if ((event.target as HTMLElement).closest("button, a")) return;
            if (window.getSelection()?.toString()) return;
            inputRef.current?.focus();
          }}
          className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-3 font-mono text-meta leading-relaxed text-text"
        >
          {log.map((item) => (
            <div key={item.id} className="mb-2.5">
              {item.prompt !== null ? (
                <p className="break-all">
                  <span className="text-accent">{item.prompt}</span> <span>{item.input}</span>
                </p>
              ) : null}
              {item.blocks.map((block, i) => (
                <Block key={i} block={block} onOpen={openPath} />
              ))}
            </div>
          ))}
        </div>

        <label
          htmlFor={inputId}
          hidden={!open}
          className="flex items-center gap-2 border-t border-border px-3.5 py-2.5 font-mono text-meta"
        >
          {/* Tronqué par le début : sur un chemin long, c'est la fin qui compte. */}
          <span dir="rtl" className="max-w-[60%] shrink-0 truncate text-left text-accent" title={currentPrompt}>
            <bdi>{currentPrompt}</bdi>
          </span>
          <span className="sr-only">Commande du terminal : ls, cd ou cat</span>
          <input
            ref={inputRef}
            id={inputId}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setCursor(null);
            }}
            onKeyDown={onKeyDown}
            maxLength={256}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="min-w-0 flex-1 bg-transparent text-text caret-accent outline-none placeholder:text-text-faint"
            placeholder="ls"
          />
        </label>
      </div>
    </section>
  );
}

function Block({ block, onOpen }: { block: OutputBlock; onOpen: (path: TerminalPath) => void }) {
  switch (block.type) {
    case "text":
      return (
        <>
          {block.lines.map((line, i) => (
            <p key={i} className="whitespace-pre-wrap text-text-muted">
              {line}
            </p>
          ))}
        </>
      );
    case "error":
      return (
        <div role="alert">
          {block.lines.map((line, i) => (
            <p key={i} className={i === 0 ? "text-danger" : "text-text-muted"}>
              {line}
            </p>
          ))}
        </div>
      );
    case "list":
      return block.items.length === 0 ? (
        <p className="text-text-faint">{block.empty}</p>
      ) : (
        <ul className="mt-0.5 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {block.items.map((item) => (
            <li key={item.label} className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(item.path)}
                className="max-w-full truncate rounded-xs text-left text-text underline-offset-2 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                title={`cd ${item.label}`}
              >
                {item.label}
                {item.path.type !== "company" ? "/" : ""}
              </button>
            </li>
          ))}
        </ul>
      );
    case "info":
      return (
        <div className="mt-0.5">
          <p className="font-medium text-text">{block.title}</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3">
            {block.rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-text-faint">{row.label}</dt>
                <dd className="min-w-0 break-words text-text">{row.value}</dd>
              </div>
            ))}
          </dl>
          {block.lists.map((list) => (
            <div key={list.label} className="mt-1">
              <p className="text-text-faint">{list.label}</p>
              <ul>
                {list.items.map((item) => (
                  <li key={item} className="text-text">
                    - {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
  }
}
