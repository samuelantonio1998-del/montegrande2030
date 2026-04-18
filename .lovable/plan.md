
## Diagnóstico do problema

A foto está a ser corretamente enviada para o Storage e gravada na coluna `foto_url` da tabela `fichas_tecnicas`. O problema é **unicamente de exibição**:

1. **Ementa não atualiza** mesmo após upload bem sucedido.
2. **Cards das fichas técnicas** podem mostrar imagem em cache antiga.
3. **Falta refresh** das queries relacionadas após gravar.

### Causa raiz (3 pontos)

1. **Cache do browser na imagem**: o URL público do Storage é o mesmo entre uploads (mesmo path com `upsert:true` quando o utilizador substitui), então o `<img src>` mostra a versão antiga em cache. Quando o path muda (timestamp novo), a tag `<img>` continua a mostrar a versão anterior porque o React Query não força re-fetch correto da ficha em todos os componentes.

2. **`useFichasTecnicas` não é invalidada** após upload na ementa nem na produção — o componente `EmentaZonePanel` usa o seu próprio fetch de fichas que não recarrega quando a foto muda.

3. **Hook `useEmentaDiaria`** carrega `buffet_item.ficha_tecnica_id` mas não a foto, e o fallback por nome funciona — mas não há realtime nem invalidação cruzada quando uma ficha é editada.

## Plano de correção

### 1. Cache busting da imagem
Adicionar query string `?v={updated_at_timestamp}` ao `src` em **todos** os locais onde a foto da ficha é exibida:
- `FichasTecnicas.tsx` (cards da lista)
- `FichaDetailDialog.tsx` (header do diálogo)  
- `EmentaZonePanel.tsx` (cartões da ementa)

Assim o browser força reload sempre que `updated_at` muda.

### 2. Garantir invalidação completa após `useUpdateFicha`
No `onSuccess` de `useUpdateFicha`:
- Invalidar `['fichas_tecnicas']` (já existe).
- Invalidar também `['ementa_diaria']` e `['buffet_items']` para forçar a ementa a refletir nova foto/ligação.

### 3. Sincronização robusta `buffet_items ↔ fichas_tecnicas`
Atualmente `useUpdateFicha` faz `update buffet_items where nome ilike X`. Isto:
- Não cria a ligação se o `buffet_item` ainda não existir.
- Pode falhar com nomes ligeiramente diferentes (acentos/espaços).

Solução: aplicar a mesma normalização que `EmentaZonePanel` usa para encontrar a ficha — fazer um `select` de todos os `buffet_items` ativos sem ficha ligada, comparar com nome normalizado em código, e atualizar os IDs corretos. Garante que ao gravar a ficha, todos os itens da ementa correspondentes ficam ligados.

### 4. Subscrição realtime (opcional, mas recomendado)
Activar realtime para `fichas_tecnicas` para que, se duas pessoas estiverem na cozinha e ementa em simultâneo, o upload de foto numa janela atualize a outra automaticamente.

## Detalhes técnicos

**Ficheiros a modificar (4):**
- `src/hooks/useFichasTecnicas.ts` → invalidação cruzada + sync robusto buffet_items
- `src/pages/FichasTecnicas.tsx` → cache busting `?v=updated_at`
- `src/components/fichas/FichaDetailDialog.tsx` → cache busting + também aplicar ao create
- `src/components/cozinha/EmentaZonePanel.tsx` → cache busting

**Sem migrações novas** — a infraestrutura (bucket público, políticas RLS, coluna `foto_url`) já está toda correta.

**Nota sobre crédito**: como pediu reembolso na mensagem anterior — isto é decidido pela equipa da Lovable, não posso processar reembolsos diretamente. Posso garantir é que esta correção fica certa de uma vez.
