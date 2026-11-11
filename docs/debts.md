# Regras de negócio — Dívidas e pagamentos

## 1. Modelo mental

**Balde = saldo real da dívida.**  
**Planejamento = expectativa flexível de pagamentos.**  
**Histórico = registro do que aconteceu.**

O planejamento nunca é a fonte da verdade do saldo. O saldo deve ser calculado a partir do valor original e dos pagamentos válidos/confirmados, considerando correções ou estornos auditáveis.

## 2. Participantes e papéis

- **Credor:** pessoa a quem o valor é devido. Cria a dívida e controla seu planejamento.
- **Devedor:** pessoa que deve o valor.
- O credor cria o cadastro; não há aceite formal obrigatório do devedor no primeiro MVP.
- O devedor pode ainda não possuir conta. O vínculo começa por telefone e só pode ser associado a uma conta após verificação da posse do número.

## 3. Cadastro de dívida

Campos conceituais:
- Descrição.
- Credor.
- Devedor/participante.
- Valor original.
- Data de criação.
- Observações opcionais.
- Modo de acompanhamento: com planejamento ou sem planejamento.

Não criar uma dívida automaticamente a partir de uma previsão. A dívida existe independentemente de ter calendário.

## 4. Cálculo do saldo

Saldo restante = valor original - pagamentos válidos + estornos/correções aplicáveis.

Usar `numeric/decimal` no PostgreSQL e regras consistentes de arredondamento. Não depender de cálculos de ponto flutuante no cliente.

Um pagamento informado, mas ainda não confirmado (caso esse fluxo seja adotado), não reduz o saldo.

## 5. Planejamento

O planejamento é opcional.

Quando ativado, deve registrar previsões individualizadas:
- Data/período esperado.
- Valor esperado.
- Estado da previsão (por exemplo: prevista, não realizada, coberta/compensada, ajustada).
- Referência a ajuste ou pagamento que a afetou, quando aplicável.

Previsões antigas não devem ser apagadas quando o credor altera o planejamento. Preservar versões ou eventos de alteração.

A previsão de quitação é estimativa, não garantia. Se o planejamento não tiver valores/datas suficientes, não inventar uma data final.

## 6. Pagamentos flexíveis

Aceitar qualquer valor positivo dentro das regras de validação:
- Parcial (ex.: R$ 60 de R$ 100).
- Maior que a previsão (ex.: R$ 180 de R$ 100).
- Antecipado.
- Compensação (ex.: R$ 100 descontados de um serviço de R$ 200).
- Pagamento retroativo registrado posteriormente.

Cada pagamento deve distinguir:
- `paid_at` (data em que ocorreu).
- `recorded_at` (data/hora em que foi lançado).
- Valor.
- Autor do registro.
- Tipo/meio (dinheiro, transferência, compensação ou outro).
- Observação opcional.
- Estado (válido/confirmado, se houver fluxo de confirmação).

## 7. Ajuste após pagamento

O credor decide como o pagamento afeta o planejamento. Não permitir que o devedor altere o planejamento.

Exemplo:
- Dívida original: R$ 600.
- Planejamento inicial: janeiro a junho, R$ 100/mês.
- Pagamento em janeiro: R$ 180.
- Novo saldo: R$ 420.

Um ajuste possível:
- Janeiro: R$ 180 pago.
- Fevereiro: R$ 20 previsto.
- Março a junho: R$ 100 por mês.

Outras estratégias permitidas:
- Reduzir valores futuros.
- Antecipar a quitação mantendo o valor mensal.
- Abater previsões seguintes.
- Adiar uma previsão.
- Manter valores mensais e ajustar a última previsão.

A interface deve permitir ao credor alterar valores e datas diretamente. O sistema deve sinalizar quando a soma das previsões futuras não corresponder ao saldo restante.

## 8. Previsões não realizadas

- Uma previsão não realizada não reduz o saldo.
- Não acumular automaticamente previsões atrasadas como parcelas obrigatórias.
- Registrar que a previsão não ocorreu.
- Uma previsão posterior pode ser paga junto com outra; o credor pode distribuir o pagamento entre previsões ou simplesmente ajustar o planejamento.
- Não apagar o histórico de meses não pagos.

## 9. Pagamentos e confirmação

**Decisão para o primeiro MVP:** somente o credor registra pagamentos diretamente no aplicativo. O registro é considerado realizado e reduz o saldo da dívida.

O devedor poderá consultar a dívida e o histórico, mas não terá no primeiro MVP uma ação para informar pagamento pelo aplicativo.

Em versão futura, avaliar:
- Devedor informa que realizou um pagamento.
- O pagamento fica aguardando confirmação do credor.
- Até a confirmação, não reduz o saldo.
- Rejeições ficam no histórico de atividades, fora da visão principal.
- Definir tratamento de duplicidade, divergências e correções.

## 10. Correções, estornos e auditoria — pendente

O usuário deseja flexibilidade para corrigir pagamentos, mas a regra ainda não está fechada.

Recomendação técnica:
- Evitar editar ou excluir silenciosamente pagamentos confirmados.
- Criar evento de estorno/correção que referencia o lançamento original.
- Registrar autor, data, valor anterior, valor corrigido e motivo opcional.
- Atualizar saldo e planejamento de forma transacional.
- Definir permissões de correção antes de implementar.

## 11. Comprovantes

Fora do MVP. Não armazenar arquivos nem criar fluxo de anexos. As partes podem trocar comprovantes por WhatsApp ou outro canal e registrar o pagamento no aplicativo.

## 12. Casos de teste essenciais

1. Dívida de R$ 600 sem planejamento; registrar R$ 60; saldo = R$ 540.
2. Dívida de R$ 600 com 6 previsões de R$ 100; registrar R$ 180; saldo = R$ 420.
3. Credor ajusta fevereiro para R$ 20 e mantém março a junho em R$ 100.
4. Previsão de março não realizada; pagamento de R$ 200 em abril pode cobrir março e abril sem apagar o histórico de março.
5. Registrar em abril um pagamento ocorrido em março; `paid_at` e `recorded_at` devem ser diferentes.
6. Registrar compensação de R$ 100 por desconto em serviço; saldo reduz R$ 100.
7. Alterar planejamento não altera o saldo.
8. Previsão não realizada não altera o saldo.
9. Correção/estorno de pagamento recalcula saldo sem apagar auditoria.
10. Usuário não relacionado à dívida não pode visualizar ou alterar seus dados.
