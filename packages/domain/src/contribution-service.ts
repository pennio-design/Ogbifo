import { createContribution, isVisible, withdrawContribution, type Contribution, type ContributionInput } from "./contribution";
import { enqueue, manualRetry, outboxId, runSync, type LocalArchiveStore, type OutboxEntry, type SyncReport, type SyncState, type SyncTransport } from "./outbox";
import { fail, ok, type Result } from "./result";

export type SubmitInput = Omit<ContributionInput, "id" | "clientId" | "createdAt">;

export interface ContributionView {
  readonly contribution: Contribution;
  readonly sync: SyncState;
}

export interface ServiceDeps {
  readonly store: LocalArchiveStore;
  readonly now: () => Date;
  readonly newId: () => string;
}

/** Application service for the local-first flow: validate, write locally, queue, render at once. */
export class ContributionService {
  constructor(private readonly deps: ServiceDeps) {}

  async submit(input: SubmitInput): Promise<Result<ContributionView>> {
    const clientId = this.deps.newId();
    const at = this.deps.now().toISOString();
    const created = createContribution({ ...input, id: clientId, clientId, createdAt: at });
    if (!created.ok) return created;
    const entry = enqueue(clientId, "contribute", at);
    await this.deps.store.commit({ contributions: [created.value], outbox: [entry] });
    return ok({ contribution: created.value, sync: entry.status });
  }

  /** A withdrawn entry disappears from view at once. The withdrawal is queued so the server follows. */
  async withdraw(clientId: string): Promise<Result<void>> {
    const found = (await this.deps.store.listContributions()).find((c) => c.clientId === clientId);
    if (found === undefined) return fail("CONTRIBUTION_NOT_FOUND", "Contribution could not be found.");
    if (found.withdrawnAt !== null) return ok(undefined);
    const at = this.deps.now().toISOString();
    await this.deps.store.commit({
      contributions: [withdrawContribution(found, at)],
      outbox: [enqueue(clientId, "withdraw", at)],
    });
    return ok(undefined);
  }

  /** Visible contributions, newest first, each with the state of its "contribute" sync. */
  async list(): Promise<readonly ContributionView[]> {
    const [contributions, outbox] = await Promise.all([this.deps.store.listContributions(), this.deps.store.listOutbox()]);
    const byId = new Map<string, OutboxEntry>(outbox.map((e) => [e.id, e]));
    return contributions
      .filter(isVisible)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((contribution) => ({
        contribution,
        sync: byId.get(outboxId(contribution.clientId, "contribute"))?.status ?? "queued",
      }));
  }

  async retry(clientId: string): Promise<void> {
    const entries = (await this.deps.store.listOutbox()).filter((e) => e.clientId === clientId);
    await this.deps.store.commit({ outbox: entries.map(manualRetry) });
  }

  sync(transport: SyncTransport): Promise<Result<SyncReport>> {
    return runSync(this.deps.store, transport, this.deps.now());
  }
}
