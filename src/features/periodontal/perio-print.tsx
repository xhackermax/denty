import { Button } from "@mantine/core";
export function PerioPrint() {
  return (
    <Button variant="subtle" onClick={() => window.print()}>
      Imprimir periodontograma
    </Button>
  );
}
