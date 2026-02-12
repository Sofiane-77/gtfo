import { findLogByQuery, parseSearchArgs, matchesLog, describeFilters } from "../../../domain/search";
import { LOGS } from "../../../services/logData";
import getIdsFromPlayerLog from "../../../services/getIdsFromPlayerLog";
import { getIdsFromLocalStorage } from "../../../services/storage";
import createPasswordGenerator from "src/shared/lib/password-generator";
import { withBase } from "src/shared/base";

type TerminalRenderable = string | { __html: string } | { audioSrc: string; label?: string };
type TerminalOutput = TerminalRenderable[];

interface CommandHandlerPayload {
  readonly lines?: TerminalOutput;
  readonly clear?: boolean;
  readonly suppressEcho?: boolean;
}

type CommandHandlerReturn = TerminalOutput | CommandHandlerPayload;

type CommandHandlerResult = CommandHandlerReturn | Promise<CommandHandlerReturn>;

interface ParsedCommandInput {
  cmd: string;
  rest: string[];
  argline: string;
}

interface CommandActions {
  readonly onProgressionReset?: () => void;
  readonly appendLines?: (lines: TerminalOutput) => void;
  readonly playerLogFile?: File;
  readonly onPlayerLogImport?: (file: File) => Promise<Set<number>> | Set<number>;
  readonly onExitTerminal?: () => void;
}

interface CommandExecutionContext {
  readonly args: string[];
  readonly argline: string;
  readonly rawInput: string;
  readonly registry: CommandRegistry;
  readonly invoked: string;
  readonly actions?: CommandActions;
}

export interface CommandDefinition {
  readonly name: string;
  readonly description: string;
  readonly usage: string;
  readonly aliases?: readonly string[];
  readonly examples?: readonly string[];
  execute(context: CommandExecutionContext): CommandHandlerResult;
}

class CommandRegistry {
  private readonly canonicalCommands = new Map<string, CommandDefinition>();
  private readonly lookup = new Map<string, CommandDefinition>();

  register(command: CommandDefinition): void {
    const primaryKey = command.name.toLowerCase();
    if (this.lookup.has(primaryKey)) {
      throw new Error(`Duplicate command registration detected for "${command.name}".`);
    }
    this.canonicalCommands.set(primaryKey, command);
    this.lookup.set(primaryKey, command);

    (command.aliases ?? [])
      .map((alias) => alias.trim()).filter((alias) => alias.length > 0).forEach((alias) => {
      const aliasKey = alias.toLowerCase();
      if (this.lookup.has(aliasKey)) {
        throw new Error(`Alias "${alias}" is already registered; check "${command.name}".`);
      }
      this.lookup.set(aliasKey, command);
    });
  }

  resolve(name: string): CommandDefinition | undefined {
    return this.lookup.get(name.toLowerCase());
  }

  list(): CommandDefinition[] {
    return Array.from(this.canonicalCommands.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
}

abstract class BaseCommand implements CommandDefinition {
  readonly aliases?: readonly string[];
  readonly examples?: readonly string[];

  constructor(
    readonly name: string,
    readonly description: string,
    readonly usage: string,
    aliases?: readonly string[],
    examples?: readonly string[],
  ) {
    this.aliases = aliases?.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
    this.examples = examples?.filter((entry) => entry.length > 0);
  }

  abstract execute(context: CommandExecutionContext): CommandHandlerResult;

  protected withUsage(
    content: TerminalOutput = [],
    context?: CommandExecutionContext,
    options?: { forceUsage?: boolean },
  ): TerminalOutput {
    const invokedHasParams =
      !!context && ((context.argline?.trim().length ?? 0) > 0 || (context.args?.length ?? 0) > 0);
    const shouldRenderUsage = options?.forceUsage || !invokedHasParams;
    const usageLines = shouldRenderUsage ? renderUsage(this, context?.invoked) : [];
    if (!usageLines.length) {
      return content;
    }
    if (!content.length) {
      return usageLines;
    }
    return [...usageLines, " ", ...content];
  }
}

class HelpCommand extends BaseCommand {
  constructor() {
    super(
      "help",
      "Show the help screen",
      '',
      ["?"],
    );
  }

  execute(context: CommandExecutionContext): TerminalOutput {
    const { args, registry } = context;
    if (args.length === 0) {
      return this.withUsage([
        "Use the keyboard to write commands.",
        "Use [Enter/Return] to execute commands.",
        "Use [Backspace] to erase a character.",
        "Use [TAB] to autocomplete your command.",
        "Use [Up Arrow] to traverse your earlier executed commands.",
        "Press [ESC] to exit.",
        " ",
        'Type "COMMANDS" to get a list of all available commands.',
      ], context);
    }

    const targetName = args[0];
    const targetCommand = registry.resolve(targetName);
    if (!targetCommand) {
      return this.withUsage([
        `Unknown command "${targetName}".`,
        'Type "COMMANDS" to list available commands.',
      ], context);
    }

    const details = renderUsage(targetCommand);
    return this.withUsage([
      `${targetCommand.name.toUpperCase()}: ${targetCommand.description}`,
      ...details.slice(1),
    ], context);
  }
}

class CommandsCommand extends BaseCommand {
  constructor() {
    super("commands", "Show this command list", "");
  }

  execute(context: CommandExecutionContext): TerminalOutput {
    const commands = context.registry.list();
    if (commands.length === 0) {
      return this.withUsage(["No commands are registered."], context);
    }

    const lines = commands.map((command) => {
      const name = command.name.toUpperCase();
      const maxLength = 15;
      const result = [
        `${name.padEnd(maxLength, ' ')} ${command.description}`
      ];
      if (command.examples && command.examples.length > 0) {
        result.push(`${' '.repeat(maxLength)} Example: ${command.examples}`);
      }

      return result.join("\n");
    });

    return this.withUsage(["Available Commands:", " ", ...lines], context);
  }
}

class InfoCommand extends BaseCommand {
  constructor() {
    super(
      "info",
      "Display information about this terminal",
      "",
      [""],
    );
  }

  execute(context: CommandExecutionContext): CommandHandlerResult {
    if (context.args.length) {
      return this.withUsage(["INFO does not accept parameters."], context);
    }
    return getTerminalInfoLines();
  }
}

class ClsCommand extends BaseCommand {
  constructor() {
    super("cls", "Clear the terminal screen", "CLS", ["clear"]);
  }

  execute(context: CommandExecutionContext): CommandHandlerResult {
    if (context.args.length) {
      return this.withUsage(["CLS does not accept any parameters."], context);
    }
    return { lines: [], clear: true, suppressEcho: true };
  }
}

class QueryCommand extends BaseCommand {
  constructor() {
    super(
      "query",
      "Query for detailed information about an specific log entry.",
      "Query <id|code>",
      [""],
    );
  }

  execute(context: CommandExecutionContext): TerminalOutput {
    const query = (context.argline || context.args[0]) ?? "";
    if (!query) {
      return this.withUsage(
        ["Provide the numeric id or the alphanumeric code of the log to inspect."],
        context,
      );
    }

    const log = findLogByQuery(LOGS, query);
    if (!log) {
      return this.withUsage([
        `No log found for "${query}".`,
        'Try SEARCH <term> to discover matching logs.',
      ], context);
    }

    const details: string[] = [
      `Log ${log.name} (ID ${log.id})`,
      `Rundown: R${log.rundown}`,
      `Level: ${log.level.join(", ")}`,
      `Zone: ${log.zone ?? "-"}`,
      `Sector: ${log.sector ?? "-"}`,
      `Media: ${log.media}`,
    ];

    /*
    if (log.media.toLowerCase().includes("text")) {
      details.push(`Text asset: /logs/${log.id}.txt`);
    }
    if (log.media.toLowerCase().includes("audio") && log.audio) {
      details.push(`Audio asset: /logs/${log.audio}.mp3`);
    }
    */

    return this.withUsage(details, context);
  }
}

class ReadCommand extends BaseCommand {
  constructor() {
    super(
      "read",
      "Read a text log on this terminal",
      "READ [FILENAME] | READ [ID]",
      ["cat"],
      ["READ myfile.txt, will output the contents of 'myfile.txt'"],
    );
  }

  execute(context: CommandExecutionContext): CommandHandlerResult {

    const appendLines = context.actions?.appendLines;
    const streaming = typeof appendLines === "function";
    const introLines: TerminalOutput = [
      { __html: '<span class="readlog-title">ReadLog v1.12</span>' },
      " ",
    ];

    const lines: TerminalOutput = streaming ? [] : [...introLines];


    const query = (context.argline || context.args[0])?.trim() ?? "";
    if (!query) {
      return this.withUsage(["Provide the numeric id or alphanumeric filename of the log to read."], context);
    }

    const run = async (): Promise<CommandHandlerReturn> => {

    if (streaming) {
      appendLines?.(introLines);
      await delay(1000);
    }

    const log = findLogByQuery(LOGS, query);
    if (!log) {
      const message: TerminalOutput = [`ERROR: No Log found with filename or id '${query}'.`, " "];
      if (streaming) {
        appendLines?.(message);
      } else {
        lines.push(...message);
      }

      return this.withUsage([" "], context, { forceUsage: true });
    }

    const discoveredLogs = getIdsFromLocalStorage();
    if (!discoveredLogs.has(log.id)) {
      return this.withUsage([
        `Log "${log.name}" (ID ${log.id}) is not unlocked on this terminal yet.`,
        "Run SCAN with your Player.log to import discovered logs before reading.",
        " ",
        "Note: To unlock it on this terminal right away, tick the ✔ checkbox next to this log — this may reveal spoilers and can affect the intended discovery.",
        "Recommended: read logs in-game first, then use SCAN with your Player.log to update your progress here.",
      ], context, { forceUsage: false });
    }

    const textPath = withBase(`/logs/${log.id}.txt`);
    
      try {
        const response = await fetch(textPath, { cache: "no-store" });
        if (!response.ok) {
          return this.withUsage([`Unable to retrieve "${log.name}".`], context);
        }
        const body = await response.text();
        lines.push(
          `Opening log file ${log.name} (ID ${log.id}): DONE!`,
          " ",
          body,
        );

        if (log.audio && log.audio !== 0) {
          const audioPath = withBase(`/logs/${log.audio}.mp3`);
          lines.push({ audioSrc: audioPath, label: "Audio attachment" });
        }

        lines.push(
          " ",
          " ",
          "End of file, Exiting ReadLog v1.12"
        );

        return lines;
      } catch (error) {
        console.error("READ command failed", error);
        return this.withUsage(["An error occurred while trying to read the log."], context);
      }
    };

    return run();
  }
}

class SearchLogsCommand extends BaseCommand {
  constructor() {
    super(
      "search",
      "Search logs by code, rundown, level, zone, sector or media.",
      "SEARCH <term...> [--rundown=R|-r=R] [--level=LVL|-l=LVL] [--sector=NAME|-s=NAME] [--media=TYPE|-m=TYPE]",
      ["find"],
      ["SEARCH 3NY --rundown 1, will list logs matching '3NY' within rundown 1"]
    );
  }

  execute(context: CommandExecutionContext): TerminalOutput {
    const { args } = context;
    const { terms, options, warnings } = parseSearchArgs(args);
    const hasFilters = options.rundown !== undefined || options.level || options.sector || options.media;

    if (!terms.length && !hasFilters) {
      return this.withUsage([
        "Provide at least one search term or filter.",
        "Example: SEARCH 3NY --rundown=1",
        "Example: SEARCH -r 1",
        "Flags: --rundown/-r, --level/-l, --sector/-s, --media/-m",
      ], context);
    }

    const normalizedTerms = terms.map((term) => term.toLowerCase());
    const matches = LOGS.filter((log) => matchesLog(log, normalizedTerms, options));

    const filters = describeFilters(options);
    const queryLabel = terms.join(" ");
    const content: string[] = [];

    if (warnings.length) {
      content.push(...warnings);
    }

    const labelSuffix = terms.length ? ` "${queryLabel}"` : "";
    const summarySuffix = terms.length ? ` for "${queryLabel}"` : "";

    if (matches.length === 0) {
      content.push(`No logs match${labelSuffix}${filters}.`);
      return this.withUsage(content, context);
    }

    content.push(
      `Showing ${matches.length} match(es)${summarySuffix}${filters}.`,
    );
    matches.forEach((log) => {
      const level = log.level.join(", ");
      const zone = log.zone ?? "-";
      const sector = log.sector ?? "-";
      content.push(
        `- ${log.name} (ID ${log.id}) | R${log.rundown} | Level ${level} | Zone ${zone} | Sector ${sector} | ${log.media}`,
      );
    });

    return this.withUsage(content, context);
  }
}

class ScanCommand extends BaseCommand {
  constructor() {
    super(
      "scan",
      "Scan a Player.log file to import discovered logs.",
      "SCAN",
      ["import"],
    );
  }
  execute(context: CommandExecutionContext): CommandHandlerResult {
    if (context.args.length) {
      return this.withUsage(["SCAN does not accept parameters."], context, { forceUsage: true });
    }

    const appendLines = context.actions?.appendLines;
    const streaming = typeof appendLines === "function";
    const providedFile = context.actions?.playerLogFile ?? null;
    const introLines: TerminalOutput = [
      "Initializing scanner...",
      "Requesting Player.log file...",
    ];

    const lines: TerminalOutput = streaming ? [] : [...introLines];

    if (streaming) {
      appendLines?.(introLines);
    }

    const run = async (): Promise<CommandHandlerReturn> => {
      if (streaming) {
        await delay(200);
      }

      let file: File | null = providedFile;
      if (!file) {
        const inputFile = document.getElementById("player_file") as HTMLInputElement;
        inputFile?.click();
        file = await waitForFileSelection(inputFile);
      }
      if (!file) {
        lines.push("Scan cancelled.");
        return lines;
      }
      lines.push(`Selected file: ${file.name}`);
      lines.push("Reading file contents...");
      try {
        const ids = context.actions?.onPlayerLogImport
          ? await context.actions.onPlayerLogImport(file)
          : await getIdsFromPlayerLog(file, true);
        const uniqueCount = ids.size;
        lines.push(`Extracted ${uniqueCount} unique log id${uniqueCount === 1 ? "" : "s"}.`);
        lines.push("Updated stored progression from Player.log.");
        lines.push("Scan complete.");
        return lines;
      } catch (error) {
        console.error("SCAN command failed", error);
        lines.push("Scan failed while processing the file.");
        return lines;
      }
    };

    return run();
  }
}

class ResetCommand extends BaseCommand {
  constructor() {
    super(
      "reset",
      "Reset all progress (browser only)",
      "RESET [CONFIRM]",
      ["clearprogress"],
    );
  }
  execute(context: CommandExecutionContext): CommandHandlerResult {
    const arg = context.args[0]?.toLowerCase();
    if (!arg) {
      return this.withUsage(
        [
          "This will erase your stored Player.log progression.",
          'Type RESET CONFIRM to permanently clear the data.',
        ],
        context,
        { forceUsage: true },
      );
    }
    if (arg !== "confirm") {
      return ['Confirmation mismatch. Type RESET CONFIRM to proceed.'];
    }
    context.actions?.onProgressionReset?.();
    return [
      "Stored progression cleared.",
      "Run SCAN to import Player.log again.",
    ];
  }
}

const generateOverridePassword = createPasswordGenerator();

class ExecOverrideCommand extends BaseCommand {
  constructor() {
    super(
      "exec_override",
      "Display the current override password.",
      "EXEC_OVERRIDE",
    );
  }

  execute(context: CommandExecutionContext): CommandHandlerResult {
    if (context.args.length) {
      return this.withUsage(["EXEC_OVERRIDE does not accept parameters."], context, { forceUsage: true });
    }
    const password = generateOverridePassword();
    const appendLines = context.actions?.appendLines;
    const streaming = typeof appendLines === "function";
    const output: TerminalOutput = [
      "Executing command: 100%",
      "•••",
      `${password}`,
    ];

    if (!streaming) {
      return output;
    }

    const run = async (): Promise<CommandHandlerReturn> => {
      await delay(180);
      appendLines?.([output[0]]);
      await delay(100);
      appendLines?.([output[1]]);
      await delay(120);
      appendLines?.([output[2]]);
      return [];
    };

    return run();
  }
}

class ExitCommand extends BaseCommand {
  constructor() {
    super(
      "exit",
      "Exit this terminal and return to home.",
      "EXIT",
      ["quit"],
    );
  }

  execute(context: CommandExecutionContext): CommandHandlerResult {
    if (context.args.length) {
      return this.withUsage(["EXIT does not accept parameters."], context, { forceUsage: true });
    }
    context.actions?.onExitTerminal?.();
    return ["Exiting terminal..."];
  }
}


const registry = new CommandRegistry();
registry.register(new HelpCommand());
registry.register(new CommandsCommand());
registry.register(new InfoCommand());
registry.register(new ClsCommand());
registry.register(new QueryCommand());
registry.register(new ReadCommand());
registry.register(new SearchLogsCommand());
registry.register(new ScanCommand());
registry.register(new ResetCommand());
registry.register(new ExecOverrideCommand());
registry.register(new ExitCommand());

export function listCommandKeywords(): string[] {
  const keywords = new Set<string>();
  registry.list().forEach((command) => {
    keywords.add(command.name.toUpperCase());
    command.aliases?.map((alias) => alias.trim()).filter((alias) => alias.length > 0).forEach((alias) => keywords.add(alias.toUpperCase()));
  });
  return Array.from(keywords).sort();
}

export interface CommandRunResult {
  readonly lines: TerminalOutput;
  readonly clear?: boolean;
}

interface NormalizedHandlerResult {
  readonly lines: TerminalOutput;
  readonly clear?: boolean;
  readonly suppressEcho?: boolean;
}

export default async function runCommand(rawCommand: string, actions?: CommandActions): Promise<CommandRunResult> {
  const trimmedInput = rawCommand.trim();
  const { cmd, rest, argline } = parseCommandInput(rawCommand);
  const promptLine = `\\\\Root>${trimmedInput.toUpperCase()}`;
  const lines: TerminalOutput = [];

  if (!cmd) {
    if (trimmedInput) {
      lines.push(promptLine);
      lines.push(" ");
    }
    lines.push("No command provided.");
    lines.push('Type "COMMANDS" to list available commands.');
    lines.push(" ");
    return { lines };
  }

  const handler = registry.resolve(cmd);
  if (!handler) {
    lines.push(promptLine);
    lines.push(" ");
    lines.push(`'${cmd.toUpperCase()}' is not recognized as a command.`);
    lines.push('Type "COMMANDS" to list available commands.');
    lines.push(" ");
    return { lines };
  }

  let promptAppended = false;
  if (typeof actions?.appendLines === "function") {
    actions.appendLines([promptLine, " "]);
    promptAppended = true;
  }

  const context: CommandExecutionContext = {
    args: rest,
    argline,
    rawInput: rawCommand,
    registry,
    invoked: cmd,
    actions
  };

  let normalized: NormalizedHandlerResult;
  try {
    const result = await handler.execute(context);
    normalized = normalizeHandlerResult(result);
  } catch (error) {
    console.error(`Command "${handler.name}" failed`, error);
    normalized = { lines: formatCommandError(error) };
  }

  if (!normalized.suppressEcho && !promptAppended) {
    lines.push(promptLine);
    lines.push(" ");
  }
  if (normalized.lines.length) {
    lines.push(...normalized.lines);
  }
  lines.push(" ");

  return { lines, clear: normalized.clear };
}

function normalizeHandlerResult(result: CommandHandlerReturn | undefined): NormalizedHandlerResult {
  if (!result) {
    return { lines: [] };
  }
  if (Array.isArray(result)) {
    return { lines: result };
  }
  const lines = Array.isArray(result.lines) ? result.lines : [];
  return {
    lines,
    clear: result.clear,
    suppressEcho: result.suppressEcho,
  };
}

const INFO_BORDER = "────────────────────────────────────────────────────────────────────────────────────────────────────────";

const INITIAL_TERMINAL_INFO = buildTerminalInfoLines();

export function getTerminalInfoLines(): TerminalOutput {
  return INITIAL_TERMINAL_INFO.map((entry) =>
    typeof entry === "string" ? entry : { __html: entry.__html },
  );
}

function buildTerminalInfoLines(): TerminalOutput {
  const [info1, info2, info3] = pickUnique(createBannerMessages(), 3);
  const terminalId = generateTerminalId();
  const version = "0." + ((Math.random() * 11 + 49) | 0); // 0.49 - 0.59
  return [
    INFO_BORDER,
    `  TERMINAL OS v${version}  ▎ ${info1}  ▎ ${info2}  ▎ ${info3}`,
    INFO_BORDER,
    " ",
    { __html: `Welcome to <b>${terminalId}</b>, located in <b>ZONE_WEB</b>.` },
    " ",
    "There are 188 available logs in this terminal.",
    " ",
    'Type "HELP" to get help using the terminal.',
    'Type "COMMANDS" to get a list of all available commands.',
    "Press [ESC] to exit.",
  ];
}

function generateTerminalId(): string {
  const id = Math.floor(Math.random() * 1000);
  return `TERMINAL_${String(id).padStart(3, "0")}`;
}


function createBannerMessages(): string[] {
  return [
    `RELAY HANDSHAKE: ${pickOne(["OK", "VERIFIED", "SYNCED"])}`,
    `ROUTE: ${pickOne(["SUBLEVEL", "AUX"])} RELAY -> ${pickOne(["CORE", "NODE"])}`,
    `JIT ${randomInt(2, 6)}ms`,
    `LAT ${randomInt(28, 65)}ms`,
    `Packet loss 0.${randomInt(1, 8)}%`,
    `LINK ${pickOne(["ONLINE", "STABLE", "DEGRADED", "ESTABLISHED", "SECURE"])}`,
    `CACHE HIT ${randomInt(50, 100)}%`,
  ];
}
function pickUnique<T>(values: readonly T[], count: number): T[] {
  const available = [...values];
  const result: T[] = [];
  const max = Math.min(count, available.length);
  for (let i = 0; i < max; i += 1) {
    const index = Math.floor(Math.random() * available.length);
    result.push(available.splice(index, 1)[0]);
  }
  return result;
}

function pickOne<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseCommandInput(input: string): ParsedCommandInput {
  const source = (input ?? "").trim();
  if (!source) {
    return { cmd: "", rest: [], argline: "" };
  }

  const tokens = source.match(/\S+/g) ?? [];
  const [first = "", ...rest] = tokens;

  return { cmd: first.toLowerCase(), rest, argline: rest.join(" ") };
}

function renderUsage(command: CommandDefinition, invokedAlias?: string): string[] {
  const lines: string[] = [];
  if (["help", "commands"].indexOf(command.name) == -1) {
    const description = command.description?.trim();
    if (description) {
      lines.push(description);
    }
    const usage = command.usage?.trim();
    if (usage) {
      lines.push(`Usage: ${usage}`);
    }
  }
  const aliasEntries = [command.name, ...(command.aliases ?? [])]
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .map((candidate) => candidate.toUpperCase());
  const uniqueAliases = Array.from(new Set(aliasEntries));
  const invokedUpper = invokedAlias?.trim().toUpperCase();
  const visibleAliases = invokedUpper
    ? uniqueAliases.filter((alias) => alias !== invokedUpper)
    : uniqueAliases;
  if (invokedUpper) {
    if (visibleAliases.length) {
      lines.push(`Aliases: ${visibleAliases.join(", ")}`);
    }
  } else if (visibleAliases.length > 1) {
    lines.push(`Aliases: ${visibleAliases.join(", ")}`);
  }
  if (command.examples && command.examples.length) {
    const examples = command.examples.map((example) => example.trim()).filter(Boolean);
    if (examples.length) {
      lines.push(`Examples: ${examples.join(" | ")}`);
    }
  }
  return lines;
}

function formatCommandError(error: unknown): string[] {
  if (error instanceof Error) {
    return [`${error.name}: ${error.message}`];
  }
  return ["An unexpected error occurred while running the command."];
}

function waitForFileSelection(input: HTMLInputElement): Promise<File | null> {
  return new Promise((resolve) => {
    const cleanup = () => {
      input.value = "";
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
    };

    const handleChange = () => {
      const file = input.files?.item(0) ?? null;
      cleanup();
      resolve(file);
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    input.addEventListener("change", handleChange, { once: true });
    input.addEventListener("cancel", handleCancel, { once: true });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}






