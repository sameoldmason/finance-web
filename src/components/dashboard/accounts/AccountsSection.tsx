// src/components/dashboard/accounts/AccountsSection.tsx
import { ThemeMode } from "../../../ThemeProvider";
import { Account } from "../../../lib/financeTypes";

type AccountsSectionProps = {
  // data
  selectedAccount: Account | undefined;
  visibleAccounts: Account[];
  editButtonForId: string | null;
  theme: ThemeMode;
  formattedBalance: string;

  // actions
  onNewAccount: () => void;
  onNewTransaction: () => void;
  onNewTransfer: () => void;
  onPrevAccount: () => void;
  onNextAccount: () => void;
  onAccountClick: (id: string) => void;
  onEditAccount: (account: Account) => void;
};

export function AccountsSection(props: AccountsSectionProps) {
  const {
    selectedAccount,
    visibleAccounts,
    editButtonForId,
    theme,
    formattedBalance,
    onNewAccount,
    onNewTransaction,
    onNewTransfer,
    onPrevAccount,
    onNextAccount,
    onAccountClick,
    onEditAccount,
  } = props;

  return (
    <section>
{/* CURRENT BALANCE CARD */}
                <section className="rounded-2xl bg-black/10 px-6 pt-5 pb-2 backdrop-blur-sm shadow-md md:col-span-2 md:order-1 xl:px-8 xl:pt-7 xl:pb-4 xl:min-h-[30vh]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] opacity-80">
                        Current Balance
                      </p>
                      <p className="mt-1 text-3xl font-extrabold">
                        {formattedBalance}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={onNewAccount}
                      className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-alt)]/20 text-sm font-bold text-[#F5FEFA] hover:bg-[var(--color-surface-alt)]/30"
                      aria-label="Add account"
                    >
                      +
                    </button>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {(() => {
                      const newActionBase =
                        "w-full rounded-full bg-[#F5FEFA] py-3 text-sm font-semibold shadow-sm transition hover:bg-[#454545] hover:text-[#F5FEFA]";
                      const newActionText =
                        theme === "dark"
                          ? "text-[#1f1f1f]"
                          : "text-[var(--color-text-primary)]";
                      const newActionClasses = `${newActionBase} ${newActionText}`;

                      return (
                        <>
                          <button
                            type="button"
                            onClick={onNewTransaction}
                            className={newActionClasses}
                          >
                            <span className="btn-label-full">
                              New Transaction
                            </span>
                            <span className="btn-label-wrap">
                              New
                              <br />
                              Transaction
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={onNewTransfer}
                            className={newActionClasses}
                          >
                            <span className="btn-label-full">New Transfer</span>
                            <span className="btn-label-wrap">
                              New
                              <br />
                              Transfer
                            </span>
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {/* ACCOUNT CAROUSEL */}
                  <div className="mt-6 flex items-center gap-3">
                    {/* Left arrow */}
                    <button
                      type="button"
                      onClick={onPrevAccount}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs bg-[var(--color-surface-alt)]/10 text-white/80 hover:bg-[var(--color-surface-alt)]/20 hover:text-white transition"
                    >
                      {"<"}
                    </button>

                    {/* Account pills */}
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-3">
                        {visibleAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => onAccountClick(account.id)}
                              className={`h-10 w-full rounded-2xl text-sm font-semibold transition ${
                                selectedAccount &&
                                account.id === selectedAccount.id
                                  ? "bg-[var(--color-surface-alt)]/20 text-[#F5FEFA]"
                                  : "bg-[var(--color-surface-alt)]/10 text-[#F5FEFA]/80 hover:bg-[var(--color-surface-alt)]/16"
                              }`}
                            >
                              {account.name}
                            </button>
                            {selectedAccount &&
                              selectedAccount.id === account.id &&
                              editButtonForId === account.id && (
                                <button
                                  type="button"
                                  onClick={() => onEditAccount(account)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg.white/20 text-xs text-[#F5FEFA] hover:bg-[var(--color-surface-alt)]/30"
                                  title="Edit account"
                                >
                                  ƒoZ
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right arrow */}
                    <button
                      type="button"
                      onClick={onNextAccount}}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs bg-[var(--color-surface-alt)]/10 text-white/80 hover:bg-[var(--color-surface-alt)]/20 hover:text-white transition"
                    >
                      {">"}
                    </button>
                  </div>
                </section>
    </section>
  );
}
