# Changelog

## [2.0.0] - 2026-06-12

### Adicionado
- 🏢 Modo Empresarial para cálculo avançado de custos operacionais de veículos
- Seletor de modo (Simples / Empresarial) no módulo Veículos
- **Bloco 1 - Aquisição e Desvalorização**: valor de aquisição, valor de venda previsto, prazo de troca (anos/meses), cálculo automático de depreciação total e mensal
- **Bloco 2 - Utilização Operacional**: KM rodados por mês/ano com cálculo bidirecional automático e KM/dia estimado
- **Bloco 3 - Custos Fixos**: seguro mensal, IPVA anual (convertido para mensal), estacionamento mensal, financiamento mensal, **emplacamento anual** (convertido para mensal)
- **Bloco 4 - Custos Variáveis**: combustível mensal, pedágio mensal, lavagem mensal, multas anuais (convertidas para mensal)
- **Bloco 5 - Custos de Reposição**: pneus (valor do jogo + vida útil em meses **ou KM**), manutenção anual, franquia (valor + período de rateio)
- **Bloco 6 - Resumo Gerencial**: dashboard com 8 indicadores (valor, depreciação, custos fixos, variáveis, reposição, total mensal, custo/km, custo anual)
- **Visualização Planilha IDEBRASIL**: toggle entre cards métricos e planilha detalhada no formato exato da planilha de custos
- **Ano/Modelo** do veículo no formulário
- **Custo "Percebido" Mensal**: campo para comparar estimativa do usuário vs custo real calculado
- **Anotações**: seção com KM/L e cálculo automático de litros/mês
- Cálculo alternativo de pneus via KM de vida útil (fórmula: KM útil ÷ KM/mês = meses)
- Conversão automática de valores anuais para mensais com hints visuais (IPVA, multas, manutenção, emplacamento)
- Relatório exportável (imprimir/PDF) com breakdown completo + comparação custo percebido
- Badge de modo (🏢 Empresarial / 📋 Simples) na listagem de veículos
- Validação específica para campos do modo empresarial

### Modificado
- `renderVeiculos()` agora detecta modo do veículo e renderiza formulário apropriado
- `saveVeiculo()` e `editVeiculo()` com suporte a ambos os modos
- Listagem de veículos com botão de relatório (📄)
- Estrutura CSS estendida com cards de bloco, dashboard de métricas, toggle de modo, visualização planilha

## [1.1.0] - 2026-06-12

### Adicionado
- Versão inicial do sistema de gestão financeira
- Módulo de Produtos (cálculo de lucro, markup, comissão)
- Módulo de Veículos (depreciação, custos mensais, custo por km)
- Módulo de Eventos (custos, faturamento, ticket médio)
- Painel com resumo financeiro
- Salvamento automático no localStorage
- PWA com service worker e instalação offline
- Tema responsivo (claro/escuro)
