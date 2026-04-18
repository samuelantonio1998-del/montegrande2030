
## Interpretação

A screenshot mostra o diálogo de edição **já com o novo layout aplicado e a funcionar bem** — miniatura 80×80 à esquerda, "A editar ficha técnica / Leitão assado / Clique na imagem para alterar a foto" à direita, e os campos (Nome, Rendimento, Preço, Tempo Prep) por baixo sem sobreposição.

Como disseste apenas "assim", interpreto que estás a confirmar este como o **padrão visual canónico** e queres que ele seja consistente em todo o lado relacionado com fichas técnicas.

## Pergunta antes de avançar

Para não fazer alterações desnecessárias, preciso confirmar o que queres com o "assim":

- **(A)** Já está bom, é só confirmar que o problema da sobreposição ficou resolvido — não tocar em nada.
- **(B)** Aplicar este mesmo estilo compacto também ao **modo de visualização com foto** (substituir o hero header grande com gradiente por miniatura + título ao lado), para que ver e editar fiquem visualmente iguais.
- **(C)** Aplicar este mesmo estilo ao **formulário de criação** (`FichaCreateForm`) para que criar uma nova ficha use exactamente o mesmo padrão visual.
- **(D)** Aplicar a B **e** C — uniformizar tudo (visualização, edição e criação) com a miniatura compacta + título lateral.

## Plano se confirmares (D) — uniformização total

**Ficheiros a alterar:**
- `src/components/fichas/FichaDetailDialog.tsx` — remover o hero header com gradiente do modo visualização e usar o mesmo bloco compacto (miniatura 80×80 + nome + ações) que já existe no modo edição.
- `src/components/fichas/FichaCreateForm.tsx` — alinhar a miniatura e tipografia ao mesmo padrão (80×80, mesma classe de borda, mesmo texto auxiliar "Clique na imagem para alterar a foto").

**Sem migrações, sem novas dependências.**

**Resultado esperado:** ver, editar e criar uma ficha técnica passam a ter o mesmo cabeçalho visual — miniatura compacta + título à direita — eliminando qualquer hipótese de sobreposição e garantindo consistência total.

Diz-me qual das opções (A, B, C ou D) queres e avanço.
