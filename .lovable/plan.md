# Permissões únicas por dados

## Implementação
- Remover os nomes de papel do menu, dos encaminhamentos, dos layouts móveis, dos filtros de tarefas e das confirmações por PIN; cada acesso passa a consultar uma chave de permissão.
- Proteger todas as páginas do menu com a mesma permissão usada para mostrar a respetiva entrada e escolher o painel inicial pelas permissões disponíveis.
- Criar somente as chaves de permissão em falta para Dashboard, Mesas, Tarefas, Inventário, Produção, Fichas, Desperdício, Previsão, Fornecedores, Preçário e cancelamento de mesa.
- Associar todas as permissões existentes e novas apenas ao papel base `gerencia`; não alterar as atribuições dos restantes papéis.
- Agrupar as permissões no ecrã de Papéis por Sala, Cozinha e Gestão, com seleção total por área.
- Confirmar que `Mesas` aparece quando `sala.mesas.ver` é concedida e validar o fluxo sem alterar a entrada por PIN.

## Detalhes técnicos
- A atualização da tabela será apenas de dados, sem SQL de estrutura nem migrações.
- Valores `sala` e `cozinha` que representam departamentos de tarefas continuam como dados funcionais, mas deixam de ser inferidos do nome do papel.
- A validação de PIN para ações protegidas passa a validar uma permissão do papel associado, não um nome de papel.
