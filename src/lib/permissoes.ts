/** Chaves de permissão usadas na interface (tabela `permissoes`). */
export const PERMISSOES = {
  ementaDefinir: 'cozinha.ementa.definir',
  producaoRegistar: 'cozinha.producao.registar',
  tarefasDefinir: 'cozinha.tarefas.definir',
  tarefasExecutar: 'cozinha.tarefas.executar',
  fichasEditar: 'gestao.fichas_tecnicas.editar',
  pessoasGerir: 'gestao.funcionarios.gerir',
  inventarioGerir: 'gestao.inventario.gerir',
  unidadesGerir: 'gestao.unidades.gerir',
} as const;

export const TODAS_PERMISSOES = Object.values(PERMISSOES);

export type ChavePermissao = (typeof TODAS_PERMISSOES)[number];
