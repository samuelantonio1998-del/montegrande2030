
## Pedido

Adicionar opção de **alterar/remover foto diretamente no card** da ficha técnica, sem ter de abrir o diálogo de edição. Se não selecionar ficheiro → fica sem foto.

## Análise

Atualmente em `FichasTecnicas.tsx` cada card mostra a foto (se existir) e abre o `FichaDetailDialog` ao clicar. Não há forma rápida de trocar/remover a foto a partir do card.

## Plano

### 1. Botão "câmara" no canto da foto/card
- **Card com foto**: pequeno botão circular (ícone `Camera`) no canto superior direito da imagem, sobre overlay escuro suave. Ao clicar abre menu com 2 opções: *"Alterar foto"* (abre file picker) e *"Remover foto"*.
- **Card sem foto**: botão pequeno "Adicionar foto" (ícone `ImagePlus`) no canto do header onde está o ícone `ChefHat`, ao clicar abre file picker direto.

### 2. Comportamento do upload
- Usar exatamente a mesma lógica já existente em `FichaDetailDialog` (upload para bucket `fichas`, gravar `foto_url` em `fichas_tecnicas`).
- Se o utilizador abre o picker e **cancela / não seleciona ficheiro** → não acontece nada (foto permanece como estava).
- Se carregar em "Remover foto" → atualiza `foto_url = null` na BD.
- `event.stopPropagation()` em todos os botões para não abrir o diálogo de detalhe ao clicar.

### 3. Feedback visual
- Loader spinner sobre a foto durante upload.
- Toast de sucesso/erro reaproveitando `useToast`.
- Invalidação das queries `['fichas_tecnicas']`, `['ementa_diaria']`, `['buffet_items']` após sucesso (já existe noutros sítios, replicar).

### 4. Hook auxiliar
Criar um pequeno hook `useUpdateFichaFoto` em `useFichasTecnicas.ts` para isolar a lógica:
- Input: `{ id, file: File | null }`
- Faz upload (se `file`), faz update de `foto_url`, invalida queries.

## Detalhes técnicos

**Ficheiros a modificar (2):**
- `src/hooks/useFichasTecnicas.ts` — adicionar hook `useUpdateFichaFoto` (upload + update + invalidação)
- `src/pages/FichasTecnicas.tsx` — adicionar botão de câmara/menu nos cards, input file oculto por card, handlers com `stopPropagation`

**Sem migrações** — bucket `fichas`, RLS e coluna `foto_url` já existem.

**UX nota**: o menu "Alterar/Remover" usa `DropdownMenu` (já no projeto) para evitar confirmação extra. Remover foto não pede confirmação porque é reversível (basta voltar a fazer upload).
