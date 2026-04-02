import PriceManagementPanel from '@/components/gerencia/PriceManagementPanel';

export default function Precario() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display text-foreground">Preçário</h1>
        <p className="text-sm text-muted-foreground">Gestão de preços de refeições e bebidas</p>
      </div>
      <PriceManagementPanel />
    </div>
  );
}
