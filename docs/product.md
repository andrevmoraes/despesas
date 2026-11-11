# Produto — Despesas Compartilhadas

## 1. Visão

O Despesas Compartilhadas ajuda pessoas a organizar valores que devem umas às outras, despesas compartilhadas e compromissos recorrentes. O objetivo é manter saldos claros, previsões úteis e histórico confiável, sem transformar acordos informais em processos burocráticos.

O produto já possui um MVP funcional com autenticação simplificada por telefone, cadastro de pessoas, assinaturas/serviços recorrentes, divisão de custos e dashboard. A evolução deve preservar essas capacidades enquanto fortalece segurança e modelo financeiro.

## 2. Princípios do produto

- O saldo financeiro real é determinado por pagamentos efetivamente registrados/confirmados.
- Previsões são planejamento, não dinheiro recebido nem dívida adicional.
- O credor controla o planejamento da dívida.
- O histórico deve preservar o que aconteceu, inclusive atrasos, ajustes e correções.
- O aplicativo deve ser flexível quanto a datas e valores.
- Evitar complexidade desnecessária no primeiro MVP.
- Não duplicar funcionalidades que já existem: primeiro entender e reaproveitar o módulo atual de assinaturas/recorrências.

## 3. Escopo funcional

### 3.1 Dívidas entre pessoas — prioridade de evolução

O credor cria a dívida e informa:
- Descrição/nome (ex.: “Sofá”).
- Pessoa devedora.
- Valor total.
- Se terá planejamento de pagamento.
- Quando houver planejamento: valor esperado, frequência e primeira data; os detalhes devem ser editáveis.

A dívida pode ser criada mesmo que a pessoa devedora ainda não tenha conta, associada inicialmente a um participante identificado pelo telefone. A conta só poderá ser vinculada ao participante depois de comprovada a posse do telefone.

**Não exigir aceite formal da dívida no primeiro MVP.** A premissa é que o acordo foi conversado entre as partes antes do cadastro. O devedor poderá consultar os dados e conversar com o credor caso discorde. Não implementar um fluxo obrigatório de aceite sem nova decisão.

### 3.2 Dívida com planejamento

- O planejamento é opcional.
- Pode haver previsões mensais (e a estrutura deve permitir evoluir frequências).
- Cada previsão guarda período/data, valor esperado e estado.
- O histórico das previsões deve ser preservado.
- Uma previsão não realizada não reduz o saldo e não deve virar uma cobrança independente acumulada automaticamente.
- O credor pode editar o planejamento a qualquer momento.
- O sistema apresenta próximo pagamento esperado e estimativa de quitação, deixando claro que são previsões.
- A estimativa deve ser recalculada com base no saldo e no planejamento vigente.

### 3.3 Dívida sem planejamento

- Não gera previsões nem lembretes periódicos.
- Mantém valor original, pagamentos registrados e saldo restante.
- Pode receber pagamentos em qualquer data e valor.

### 3.4 Pagamentos

- Aceitar valores parciais, maiores ou menores que o valor previsto.
- Registrar data em que o pagamento ocorreu separadamente da data em que foi lançado no aplicativo.
- Permitir pagamentos por transferência, dinheiro ou compensação (ex.: desconto de R$ 100 em um serviço de R$ 200).
- Não exigir comprovante/anexo no primeiro MVP.
- O credor pode registrar diretamente um pagamento.
- O registro deve preservar autor, data do evento, data de registro, valor, meio/tipo (quando útil) e observação opcional.

**Registro de pagamento pelo devedor — fora do primeiro MVP.** No MVP, somente o credor registra pagamentos diretamente, e o lançamento passa a compor o saldo. O devedor pode consultar as informações, mas não terá ainda uma ação para informar pagamento pelo aplicativo. Em uma versão futura, avaliar um fluxo de aviso de pagamento pelo devedor, com confirmação do credor.

### 3.5 Ajuste do planejamento após pagamentos

O balde (saldo da dívida) é a fonte da verdade. O planejamento é independente e flexível.

Exemplo: dívida de R$ 600 planejada em seis previsões de R$ 100. Se for registrado um pagamento de R$ 180, o saldo passa a R$ 420. O credor decide como ajustar as previsões futuras. Exemplo possível: fevereiro R$ 20 e março a junho R$ 100.

Possíveis ações de ajuste:
- Reduzir o valor de previsões futuras.
- Manter o valor mensal e antecipar a quitação.
- Abater o excedente de uma ou mais previsões seguintes.
- Adiar uma previsão.
- Manter o planejamento atual e ajustar a última previsão para que a soma futura corresponda ao saldo.

Não impor uma estratégia automática única. A interface deve mostrar as previsões futuras e permitir ao credor editar os valores/datas. A soma das previsões futuras deve ser comparada com o saldo restante; divergências devem ser mostradas claramente.

### 3.6 Correções e histórico

- Deve existir uma forma de corrigir lançamento incorreto.
- Não apagar silenciosamente eventos financeiros.
- Preferir operações de estorno/correção auditáveis, preservando valor original, autor, data e motivo quando aplicável.
- A tela principal deve ser limpa; eventos de auditoria e correções podem ficar em uma área de histórico/detalhes.

**Regra detalhada de correção, estorno e conflitos ainda precisa ser especificada antes da implementação financeira.**

### 3.7 Despesas compartilhadas

O produto deve suportar:
- Uma pessoa paga o valor original.
- Divisão igualitária.
- Valores personalizados por participante.
- Cobrança individual (uma pessoa pagou algo para outra).
- Despesa compartilhada com vários participantes.

Divisão percentual não é prioridade para a nova experiência de dívidas. Porém, a interface atual de assinaturas usa percentuais para calcular os valores de cada participante. Não remover essa capacidade existente sem plano de migração e validação.

## 4. Funcionalidades existentes a preservar/reaproveitar

- Cadastro/gestão de pessoas.
- Assinaturas/serviços recorrentes, com pagador, valor, dia de cobrança e participantes.
- Divisão de custos entre participantes.
- Dashboard com resumo financeiro e detalhamento por pessoa.
- PWA e identidade visual atual.

O usuário informou que o controle de contas recorrentes já existe e pode ser usado também em relações 1:1, além de grupos. Não tratar isso como funcionalidade inexistente nem reconstruí-la sem auditoria.

## 5. Fora do escopo inicial

- Upload/armazenamento de comprovantes.
- Redesenho do Dashboard (manter a tela atual por enquanto).
- Migração do Supabase para Appwrite (manter Supabase).
- Divisão percentual como prioridade de novas dívidas (preservar o que já existe no módulo atual).
- Módulo avançado de contas/compromissos recorrentes administrados em nome de terceiros, caso exija uma experiência ou modelo novo. Antes de criar algo, avaliar se o módulo de assinaturas atual já cobre o caso.
- Notificações push avançadas.

## 6. Identidade e participantes

Separar conceitualmente:
- Pessoa/participante: indivíduo que aparece em uma relação financeira.
- Conta: identidade autenticada que acessa o aplicativo.
- Telefone: identificador de contato que pode ser usado para localizar/convidar uma pessoa, mas não comprova posse.
- Dívida: relação financeira entre credor e devedor.

O sistema deve permitir criar um participante por telefone antes de a pessoa ter conta. A vinculação posterior exige verificação segura da posse do telefone. Não permitir que um usuário se aproprie de participante apenas digitando o número.

## 7. Experiência e interface

- Preservar a identidade visual Windows Phone/Metro enquanto o usuário não solicitar redesign.
- Não redesenhar o Dashboard neste MVP.
- Priorizar telas de criação/detalhes de dívida e fluxo de pagamento.
- Distinguir visualmente saldo real, previsões futuras e eventos históricos.
- Manter histórico detalhado sem poluir a visão principal.

## 8. Critérios de sucesso do MVP

- O credor consegue criar uma dívida para uma pessoa com ou sem conta.
- A dívida tem saldo correto e histórico confiável.
- O credor consegue registrar pagamentos parciais, antecipados e compensações.
- Datas do pagamento e do registro são preservadas.
- O planejamento é opcional e editável.
- Pagamentos alteram o saldo; previsões sozinhas não.
- A interface deixa claro o que está pago, previsto, não realizado e pendente de decisão.
- Dados financeiros são protegidos por autenticação real e RLS correta.
