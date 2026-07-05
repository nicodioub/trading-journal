import { useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useCreateAccount, useUpdateAccount } from "@/data";
import {
  accountInputSchema,
  type Account,
  type AccountStatus,
  type AccountType,
} from "@/domain";

interface AccountFormDialogProps {
  account?: Account;
  trigger: ReactNode;
}

interface FormState {
  name: string;
  broker: string;
  platform: string;
  type: AccountType;
  currency: string;
  initialCapital: string;
  maxDrawdown: string;
  targetProfit: string;
  status: AccountStatus;
}

function initialState(account?: Account): FormState {
  return {
    name: account?.name ?? "",
    broker: account?.broker ?? "",
    platform: account?.platform ?? "",
    type: account?.type ?? "personal",
    currency: account?.currency ?? "USD",
    initialCapital: account ? String(account.initialCapital) : "",
    maxDrawdown: account ? String(account.maxDrawdown) : "0",
    targetProfit: account ? String(account.targetProfit) : "0",
    status: account?.status ?? "active",
  };
}

export function AccountFormDialog({ account, trigger }: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialState(account));
  const [error, setError] = useState<string | null>(null);
  const create = useCreateAccount();
  const update = useUpdateAccount();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const parsed = accountInputSchema.safeParse({
      name: form.name,
      broker: form.broker,
      platform: form.platform,
      type: form.type,
      currency: form.currency,
      initialCapital: Number(form.initialCapital),
      maxDrawdown: Number(form.maxDrawdown),
      targetProfit: Number(form.targetProfit),
      status: form.status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the fields.");
      return;
    }
    setError(null);
    if (account) {
      await update.mutateAsync({ id: account.id, patch: parsed.data });
    } else {
      await create.mutateAsync(parsed.data);
    }
    setOpen(false);
    if (!account) setForm(initialState());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "New account"}</DialogTitle>
          <DialogDescription>
            Each account tracks its own balance, trades and statistics.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Account name</Label>
            <Input
              id="acc-name"
              placeholder="FTMO Challenge"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-broker">Broker</Label>
              <Input
                id="acc-broker"
                placeholder="FTMO"
                value={form.broker}
                onChange={(e) => set("broker", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-platform">Platform</Label>
              <Input
                id="acc-platform"
                placeholder="MetaTrader 5"
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="prop">Prop firm</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as AccountStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-capital">Initial capital</Label>
              <Input
                id="acc-capital"
                type="number"
                placeholder="100000"
                value={form.initialCapital}
                onChange={(e) => set("initialCapital", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-currency">Currency</Label>
              <Input
                id="acc-currency"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="acc-dd">Max drawdown (%)</Label>
              <Input
                id="acc-dd"
                type="number"
                value={form.maxDrawdown}
                onChange={(e) => set("maxDrawdown", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-target">Target profit</Label>
              <Input
                id="acc-target"
                type="number"
                value={form.targetProfit}
                onChange={(e) => set("targetProfit", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
            {account ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
