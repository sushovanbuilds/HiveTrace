import { JsonRpcProvider } from "ethers";

export interface BlockLike {
  transactions?: readonly (string | { to: string | null; hash: string })[];
}

// Pure, provider-independent helper: which tx hashes in a block target one of
// the monitored addresses? Exported for unit testing without an RPC.
export function txsTargetingAddresses(
  block: BlockLike | null,
  addresses: Set<string>,
): string[] {
  if (!block?.transactions) return [];
  const out: string[] = [];
  for (const tx of block.transactions) {
    const t = typeof tx === "string" ? null : tx;
    if (t?.to && addresses.has(t.to.toLowerCase())) {
      out.push(t.hash);
    }
  }
  return out;
}

export interface ListenerOptions {
  rpcUrl?: string;
  pollMs?: number;
  // Returns the current set of monitored honeypot addresses (lower-cased).
  addressesProvider: () => Promise<string[]>;
  onTransaction: (txHash: string) => Promise<void> | void;
  onError?: (err: unknown) => void;
  provider?: JsonRpcProvider;
}

export interface Listener {
  start(): void;
  stop(): void;
}

export function startListener(opts: ListenerOptions): Listener {
  const provider =
    opts.provider ??
    new JsonRpcProvider(
      opts.rpcUrl ?? process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545",
    );
  const pollMs = opts.pollMs ?? 5_000;

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastBlock = 0;

  async function tick() {
    try {
      const current = await provider.getBlockNumber();
      const from = lastBlock === 0 ? Math.max(current - 1, 0) : lastBlock + 1;
      const addresses = new Set(
        (await opts.addressesProvider()).map((a) => a.toLowerCase()),
      );

      for (let blockNumber = from; blockNumber <= current; blockNumber++) {
        const block = await provider.getBlock(blockNumber, true);
        for (const txHash of txsTargetingAddresses(block, addresses)) {
          await opts.onTransaction(txHash);
        }
      }
      lastBlock = current;
    } catch (err) {
      opts.onError?.(err);
    }
    if (!stopped) timer = setTimeout(tick, pollMs);
  }

  return {
    start() {
      stopped = false;
      void tick();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
