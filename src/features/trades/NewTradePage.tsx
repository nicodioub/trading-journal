import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Button, EmptyState } from "@/components/ui";
import { useAccounts } from "@/data";
import { TradeForm } from "./components/TradeForm";

export function NewTradePage() {
  const { data: accounts = [] } = useAccounts();

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader title="New trade" />
        <EmptyState
          title="Create an account first"
          description="Trades belong to an account. Add one to start logging trades."
          action={
            <Button asChild>
              <Link to="/accounts">Go to accounts</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New trade"
        description="Log a trade with full context, psychology and screenshots."
      />
      <TradeForm />
    </div>
  );
}
