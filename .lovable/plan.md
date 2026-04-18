
## Diagnóstico

Confirmei no código que o problema continua porque a correção planeada não chegou a ser aplicada em `src/components/fichas/FichaDetailDialog.tsx`.

Hoje, quando a ficha tem foto, o diálogo usa sempre este bloco:
- header grande com imagem `aspect-[16/9]`
- margens negativas `-mx-6 -mt-6`
- gradiente e botões em `absolute`

Esse mesmo header continua ativo também em modo edição, por isso os campos aparecem logo abaixo de uma hero image demasiado alta e, no viewport que estás a usar, fica com efeito visual de sobreposição.

## Correção a implementar

### 1. Separar totalmente os dois layouts no diálogo
Em `FichaDetailDialog.tsx`:
- **Modo visualização**: manter o header grande com foto.
- **Modo edição**: deixar de usar o header grande. Em vez disso, mostrar um topo compacto igual ao estilo de `FichaCreateForm`:
  - miniatura 24x24 ou 20x20
  - nome e ações ao lado
  - botão para alterar foto
  - sem `absolute`, sem gradientes, sem margens negativas

### 2. Reorganizar os campos de edição
Ainda em `FichaDetailDialog.tsx`:
- colocar a foto compacta + ações dentro de um `flex gap-4 items-start`
- passar os campos principais para uma grelha estável:
  - desktop: `grid-cols-2`
  - mobile/área apertada: `grid-cols-1 sm:grid-cols-2`
- garantir espaçamento fixo entre topo, campos e restantes secções

### 3. Ajustar o content do modal
- manter `max-h-[90vh] overflow-y-auto`
- adicionar padding consistente no topo do conteúdo editável
- evitar qualquer bloco visual que “saia” da caixa do diálogo durante edição

### 4. Preservar a gestão de foto já existente
- continuar a usar o mesmo upload atual
- manter preview local se o utilizador escolher nova imagem
- se cancelar edição, limpar preview temporário e voltar ao estado original

## Ficheiros a alterar

- `src/components/fichas/FichaDetailDialog.tsx`

## Resultado esperado

Depois desta alteração:
- ficha **com foto** e ficha **sem foto** passam a abrir o editor com o mesmo layout estável
- a imagem deixa de ocupar o topo inteiro no modo edição
- os campos deixam de ficar tapados/sobrepostos
- o comportamento fica consistente com o formulário de criação
