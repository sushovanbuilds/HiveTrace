import { JsonRpcProvider } from "ethers";

export interface FetchedLog {
  address: string;
  topics: string[];
  data: string;
}

export interface FetchedTx {
  txHash: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  methodId: string;
  blockNumber: number;
  logs: FetchedLog[];
  status: number; // 1 = success, 0 = reverted
}

// Tool contract used by the analysis agent. Swappable for tests.
export type FetchTransaction = (
  txHash: string,
  rpcUrl?: string,
) => Promise<FetchedTx>;

export async function fetchTransaction(
  txHash: string,
  rpcUrl?: string,
): Promise<FetchedTx> {
  const provider = new JsonRpcProvider(
    rpcUrl ?? process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545",
  );

  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    throw new Error(`Transaction ${txHash} not found on the configured RPC`);
  }
  const receipt = await provider.getTransactionReceipt(txHash);

  const input = tx.data ?? "0x";
  const logs: FetchedLog[] = (receipt?.logs ?? []).map((l) => ({
    address: l.address,
    topics: [...l.topics],
    data: l.data,
  }));

  return {
    txHash,
    from: tx.from,
    to: tx.to,
    value: (tx.value?.toString?.() ?? "0").toString(),
    input,
    methodId: input.length >= 10 ? input.slice(0, 10) : input,
    blockNumber: tx.blockNumber ?? 0,
    logs,
    status: receipt ? (receipt.status === 0 ? 0 : 1) : 1,
  };
}
